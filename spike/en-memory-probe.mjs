// Verify EN instructions-embedded history gives the model memory like ZH does.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTRUCTIONS = `You are Mira, an old friend. Use everyday English. Short sentences.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Recent conversation — keep context continuous:
User: I've been thinking about quitting my job, it's so dull.
You: Yeah... that dullness has been eating at you for a while, hasn't it?
User: Right, exactly that. What should I do?
You: I'm not gonna answer that for you. But your body's already told you — you've been rehearsing the walkout in your head.
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your next reply must continue this conversation. When they say "that thing" or "yeah, that one", you know what they mean.`;

const TRIGGER = `User just asked: What's the first thing I said to you earlier?`;

const ws = new WebSocket(PROXY);
let transcript = "";
const t0 = Date.now();
const timer = setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 30000);

ws.on("message", (data) => {
  let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
  if (msg.type === "response.audio.delta") return;
  if (msg.type === "session.created") {
    ws.send(JSON.stringify({ type: "session.update", session: {
      instructions: INSTRUCTIONS, voice: "Cherry",
      modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
      turn_detection: null,
    }}));
  } else if (msg.type === "session.updated") {
    ws.send(JSON.stringify({ type: "response.create", response: {
      modalities: ["text", "audio"], instructions: TRIGGER,
    }}));
  } else if (msg.type === "response.audio_transcript.delta") {
    transcript += msg.delta ?? "";
  } else if (msg.type === "response.done") {
    clearTimeout(timer);
    console.log("=== EN RESPONSE ===\n" + transcript);
    const remembers = /job|quit|dull/i.test(transcript);
    console.log(`\n${remembers ? "✅ EN memory works via instructions" : "❌ didn't reference history"}`);
    console.log(`time: ${Date.now() - t0}ms`);
    ws.close();
    process.exit(remembers ? 0 : 1);
  } else if (msg.type === "error") { console.log("ERR", msg); process.exit(3); }
});
ws.on("error", e => console.log("wserr", e.message));
