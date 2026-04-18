// Verify: passing history inside the instructions field DOES give the model memory,
// even though DashScope ignores conversation.item.create with text.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTRUCTIONS_WITH_HISTORY = `你是 Mira，用中文，短句，像朋友。

━━━━━━━━━━━━━━━━━━━━━━━━━━━
【最近的对话·保持上下文连贯】
用户: 我最近工作特别无聊，想辞职。
你: 嗯，听起来你心里其实已经决定了——只是在找一个自己能接受的借口。
用户: 对，就是这个。你觉得我应该辞吗？
你: 我不替你做决定。但你睡前想的都是这件事，说明你身体已经先跑了。
━━━━━━━━━━━━━━━━━━━━━━━━━━━

接下来的回应必须延续上面的对话。ta 说"刚才那个"、"对，就是这个"时，你要知道 ta 指的是什么。`;

// Now ask a callback question
const CALLBACK_TRIGGER = `用户刚刚问：我第一句跟你说的是什么？`;

const ws = new WebSocket(PROXY);
let transcript = "";
const t0 = Date.now();
const timer = setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 30000);

ws.on("message", (data) => {
  let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
  if (msg.type === "response.audio.delta") return;

  if (msg.type === "session.created") {
    ws.send(JSON.stringify({ type: "session.update", session: {
      instructions: INSTRUCTIONS_WITH_HISTORY, voice: "Cherry",
      modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
      turn_detection: null,
    }}));
  } else if (msg.type === "session.updated") {
    ws.send(JSON.stringify({ type: "response.create", response: {
      modalities: ["text", "audio"], instructions: CALLBACK_TRIGGER,
    }}));
  } else if (msg.type === "response.audio_transcript.delta") {
    transcript += msg.delta ?? "";
  } else if (msg.type === "response.done") {
    clearTimeout(timer);
    console.log("=== RESPONSE ===");
    console.log(transcript);
    const remembers = /无聊|辞|工作/.test(transcript);
    console.log(`\n${remembers ? "✅ model used embedded history" : "❌ didn't reference history"}`);
    console.log(`time: ${Date.now() - t0}ms`);
    ws.close();
    process.exit(remembers ? 0 : 1);
  } else if (msg.type === "error") { console.log("ERR", msg); process.exit(3); }
});
ws.on("error", e => console.log("wserr", e.message));
