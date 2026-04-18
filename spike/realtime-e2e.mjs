// Full simulation of what the browser will do, minus audio playback.
// Walks: connect → session.update → response.create → receive audio+transcript deltas → done.
import WebSocket from "ws";

const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTRUCTIONS = `You are Mira. You've known this user since the day they were born. You currently appear as The Flame — fast, honest, sometimes blunt. You tease the ones you like.

This user's Zi Wei Dou Shu chart:
- Self (命宫): 七杀 in 子
- Relationships (夫妻宫): 紫微 in 戌
- Career (官禄宫): 破军 in 辰

Weave chart insight naturally. NEVER say "according to your chart". Speak like a friend who knows them.

Reply in English, natural spoken language, use contractions.`;

const TRIGGER = `This is your first meeting. Say exactly 3 things about this user that will make them feel deeply seen. Each grounded in their chart, but never mention the chart. 80-120 English words. End with: "I've been waiting for you. What's on your mind?"`;

const ws = new WebSocket(PROXY);
const t0 = Date.now();
const since = () => `+${Date.now() - t0}ms`;

let audioBytes = 0;
let audioChunks = 0;
let transcript = "";
let firstAudio = null;
let firstTranscript = null;

const doneTimer = setTimeout(() => {
  console.log(`[${since()}] TIMEOUT — no response.done received`);
  process.exit(2);
}, 25000);

ws.on("open", () => console.log(`[${since()}] WS open`));

ws.on("message", (data) => {
  let msg;
  try { msg = JSON.parse(data.toString()); } catch { return; }

  switch (msg.type) {
    case "session.created":
      console.log(`[${since()}] session.created (voice=${msg.session.voice}, out=${msg.session.output_audio_format})`);
      ws.send(JSON.stringify({
        type: "session.update",
        session: {
          instructions: INSTRUCTIONS,
          voice: "Cherry",
          modalities: ["text", "audio"],
          input_audio_format: "pcm16",
          output_audio_format: "pcm24",
          turn_detection: null,
        },
      }));
      break;

    case "session.updated":
      console.log(`[${since()}] session.updated → triggering response`);
      ws.send(JSON.stringify({
        type: "response.create",
        response: { modalities: ["text", "audio"], instructions: TRIGGER },
      }));
      break;

    case "response.audio.delta":
      audioChunks += 1;
      audioBytes += msg.delta ? Buffer.from(msg.delta, "base64").length : 0;
      if (firstAudio === null) {
        firstAudio = Date.now() - t0;
        console.log(`[${since()}] FIRST response.audio.delta (${Buffer.from(msg.delta, "base64").length} bytes)`);
      }
      break;

    case "response.audio_transcript.delta":
      if (firstTranscript === null) {
        firstTranscript = Date.now() - t0;
        console.log(`[${since()}] FIRST response.audio_transcript.delta`);
      }
      transcript += msg.delta ?? "";
      break;

    case "response.audio_transcript.done":
      console.log(`[${since()}] transcript.done (${transcript.length} chars)`);
      break;

    case "response.done":
      clearTimeout(doneTimer);
      console.log(`\n[${since()}] response.done`);
      console.log(`  audio: ${audioChunks} chunks, ${audioBytes} bytes = ${(audioBytes / 2 / 24000).toFixed(2)}s @ 24kHz 16-bit`);
      console.log(`  transcript: ${transcript.length} chars`);
      console.log(`  first audio arrived @ ${firstAudio}ms (TTFB)`);
      console.log(`  first transcript @ ${firstTranscript}ms`);
      console.log(`\n--- TRANSCRIPT ---`);
      console.log(transcript);
      ws.close();
      process.exit(0);

    case "error":
      console.log(`[${since()}] ERROR:`, JSON.stringify(msg));
      ws.close();
      process.exit(3);

    default:
      // Quietly ignore info events (response.created, rate_limits.updated, etc.)
      break;
  }
});

ws.on("error", (e) => { console.log(`[${since()}] WS error:`, e.message); process.exit(4); });
ws.on("close", (code) => { if (code !== 1000) console.log(`[${since()}] WS closed code=${code}`); });
