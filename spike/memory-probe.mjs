// Verify multi-turn memory: does Mira remember what the user said 2 turns ago?
import WebSocket from "ws";

const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTRUCTIONS = `你是 Mira，ta 的老朋友。口语化，短句。不要说"紫微/命盘/命宫"等术语。`;

const ws = new WebSocket(PROXY);
let turnIdx = 0;
let buffers = ["", "", ""];
let activeBuf = -1;
let lastAudioAt = 0;

const timer = setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 60000);

function nextTurn(text) {
  turnIdx += 1;
  activeBuf = turnIdx - 1;
  console.log(`\n> Turn ${turnIdx}, user says: "${text}"`);
  ws.send(JSON.stringify({ type: "conversation.item.create", item: {
    type: "message", role: "user",
    content: [{ type: "input_text", text }]
  }}));
  ws.send(JSON.stringify({ type: "response.create", response: {
    modalities: ["text", "audio"]
  }}));
}

ws.on("message", (data) => {
  let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
  if (msg.type === "session.created") {
    ws.send(JSON.stringify({ type: "session.update", session: {
      instructions: INSTRUCTIONS, voice: "Cherry",
      modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
      turn_detection: null,
    }}));
  } else if (msg.type === "session.updated" && turnIdx === 0) {
    nextTurn("我最近在想要不要换工作。");
  } else if (msg.type === "response.audio_transcript.delta" && activeBuf >= 0) {
    buffers[activeBuf] += msg.delta ?? "";
  } else if (msg.type === "response.done") {
    lastAudioAt = Date.now();
    console.log(`Mira: "${buffers[activeBuf]}"`);
    if (turnIdx === 1) {
      setTimeout(() => nextTurn("对，就是我刚才说的那个。"), 500);
    } else if (turnIdx === 2) {
      setTimeout(() => nextTurn("你记得我说的是什么吗？"), 500);
    } else if (turnIdx === 3) {
      clearTimeout(timer);
      console.log("\n=== MEMORY CHECK ===");
      const t3 = buffers[2];
      const remembersJob = /工作|换|跳/.test(t3);
      console.log(`Turn 3 response mentions 工作/换/跳: ${remembersJob ? "✅ remembers" : "❌ forgot"}`);
      console.log(`Turn 2 response length: ${buffers[1].length} chars`);
      console.log(`Turn 3 response length: ${t3.length} chars`);
      ws.close();
      process.exit(0);
    }
  } else if (msg.type === "error") { console.log("ERR", msg); process.exit(3); }
});
ws.on("error", (e) => { console.log("ws err", e.message); process.exit(4); });
