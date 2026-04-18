// Log every event for 2 text-input turns to see what DashScope actually does.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTRUCTIONS = `你是 Mira 朋友。用中文。短句。`;

const ws = new WebSocket(PROXY);
const t0 = Date.now();
const log = (...a) => console.log(`[+${((Date.now()-t0)/1000).toFixed(1)}s]`, ...a);

let turn = 0;
const resp = ["", ""];

const timer = setTimeout(() => { log("TIMEOUT"); ws.close(); process.exit(2); }, 45000);

ws.on("message", (data) => {
  let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
  const t = msg.type;
  if (t === "response.audio.delta") return; // noisy
  if (t === "response.audio_transcript.delta") { resp[turn-1] += msg.delta ?? ""; return; }
  log("←", t, JSON.stringify(msg).slice(0, 200));

  if (t === "session.created") {
    ws.send(JSON.stringify({ type: "session.update", session: {
      instructions: INSTRUCTIONS, voice: "Cherry",
      modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
      turn_detection: null,
    }}));
  } else if (t === "session.updated" && turn === 0) {
    turn = 1;
    log("→ turn 1 create item + response.create");
    ws.send(JSON.stringify({ type: "conversation.item.create", item: {
      type: "message", role: "user",
      content: [{ type: "input_text", text: "我在考虑辞职。" }]
    }}));
    ws.send(JSON.stringify({ type: "response.create", response: { modalities: ["text", "audio"] }}));
  } else if (t === "response.done") {
    log(`mira t${turn}: "${resp[turn-1]}"`);
    if (turn === 1) {
      setTimeout(() => {
        turn = 2;
        log("→ turn 2 create item + response.create");
        ws.send(JSON.stringify({ type: "conversation.item.create", item: {
          type: "message", role: "user",
          content: [{ type: "input_text", text: "你记得我刚才说什么吗？" }]
        }}));
        ws.send(JSON.stringify({ type: "response.create", response: { modalities: ["text", "audio"] }}));
      }, 500);
    } else {
      clearTimeout(timer);
      const ok = /辞|工作|走/.test(resp[1]);
      log(`\n=== ${ok ? "✅ MEMORY WORKS" : "❌ NO MEMORY"} ===`);
      ws.close();
      process.exit(ok ? 0 : 1);
    }
  }
});
ws.on("error", e => log("err", e.message));
ws.on("close", () => log("ws close"));
