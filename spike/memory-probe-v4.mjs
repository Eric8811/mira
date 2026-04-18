// Try passing history via response.create.input instead of conversation.item.create.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTRUCTIONS = `你是 Mira 朋友。用中文。短句。`;
const ws = new WebSocket(PROXY);
const t0 = Date.now();
const log = (...a) => console.log(`[+${((Date.now()-t0)/1000).toFixed(1)}s]`, ...a);

let turn = 0;
const history = []; // { role, text }
const resp = [];

const timer = setTimeout(() => { log("TIMEOUT"); ws.close(); process.exit(2); }, 45000);

function askWithHistory(userText) {
  turn += 1;
  history.push({ role: "user", text: userText });
  resp[turn-1] = "";
  log(`→ turn ${turn} user: "${userText}"`);

  // Send response.create with full conversation history inline
  const input = history.map(h => ({
    type: "message",
    role: h.role,
    content: [{ type: h.role === "user" ? "input_text" : "text", text: h.text }],
  }));

  ws.send(JSON.stringify({ type: "response.create", response: {
    modalities: ["text", "audio"],
    input,
  }}));
}

ws.on("message", (data) => {
  let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
  const t = msg.type;
  if (t === "response.audio.delta") return;
  if (t === "response.audio_transcript.delta") { resp[turn-1] += msg.delta ?? ""; return; }

  if (t === "session.created") {
    ws.send(JSON.stringify({ type: "session.update", session: {
      instructions: INSTRUCTIONS, voice: "Cherry",
      modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
      turn_detection: null,
    }}));
  } else if (t === "session.updated" && turn === 0) {
    askWithHistory("我最近工作特别无聊，想辞职。");
  } else if (t === "response.done") {
    log(`← mira t${turn}: "${resp[turn-1]}"`);
    history.push({ role: "assistant", text: resp[turn-1] });
    if (turn === 1) setTimeout(() => askWithHistory("对，就是这个。"), 400);
    else if (turn === 2) setTimeout(() => askWithHistory("我刚才是不是跟你说了我想干嘛？"), 400);
    else {
      clearTimeout(timer);
      const remembers = /辞|工作|走/.test(resp[2] || "");
      log(`\n=== ${remembers ? "✅ MEMORY WORKS via input field" : "❌ still no memory"} ===`);
      ws.close();
      process.exit(remembers ? 0 : 1);
    }
  } else if (t === "error") {
    log("ERR:", JSON.stringify(msg).slice(0, 300));
    process.exit(3);
  }
});
ws.on("error", e => log("wserr", e.message));
