// EN vs ZH audio continuity diagnosis. No fixes, just measurements.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

// Minimal prompts matching production skeleton
const INSTR_EN = `You are Mira — a friend this person has known for 5+ years. Not an astrologer.

Core: You're the kind of person who doesn't settle for "good enough."
In love: all in or not at all.
At work: you get bored fast, need stakes.

Default short: 1-2 sentences under 20 words. Contractions always. Max 1 metaphor.
Never mention astrology / stars / zodiac.`;

const INSTR_ZH = `你是 Mira——ta 认识你 5 年的老朋友。不是算命师。

底色：你不肯将就。
感情里：要么全给要么不给。
工作里：容易无聊，需要赌注。

默认短：1-2 句 ≤25 字。大白话。不提算命词。`;

async function measure(instructions, userText, voice = "Cherry", label = "") {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    let deltas = [];
    let transcript = "";
    let firstDeltaAt = null;
    let lastDeltaAt = null;
    let triggerAt = null;
    const timer = setTimeout(() => { ws.close(); resolve({ label, error: "timeout" }); }, 45000);

    ws.on("message", (data) => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === "session.created") {
        ws.send(JSON.stringify({ type: "session.update", session: {
          instructions, voice,
          modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
          turn_detection: null,
        }}));
      } else if (msg.type === "session.updated") {
        triggerAt = Date.now();
        ws.send(JSON.stringify({ type: "response.create", response: {
          modalities: ["text", "audio"],
          instructions: `User said: "${userText}". Reply.`,
        }}));
      } else if (msg.type === "response.audio.delta") {
        const now = Date.now();
        const bytes = Buffer.from(msg.delta, "base64").length;
        if (!firstDeltaAt) firstDeltaAt = now - triggerAt;
        const gap = lastDeltaAt ? now - lastDeltaAt : 0;
        lastDeltaAt = now;
        deltas.push({ t: now - triggerAt, bytes, gap });
      } else if (msg.type === "response.audio_transcript.delta") {
        transcript += msg.delta ?? "";
      } else if (msg.type === "response.done") {
        clearTimeout(timer);
        ws.close();
        const gaps = deltas.slice(1).map(d => d.gap);
        const totalBytes = deltas.reduce((s, d) => s + d.bytes, 0);
        const audioMs = totalBytes / 2 / 24 * 1000 / 1000; // pcm24 = 16-bit @ 24kHz; ms = bytes/2/24000 * 1000
        const audioSec = totalBytes / 2 / 24000;
        resolve({
          label, voice,
          transcript: transcript.slice(0, 120),
          ttfb: firstDeltaAt,
          deltaCount: deltas.length,
          totalBytes,
          audioSec: Number(audioSec.toFixed(2)),
          gapMs: gaps.length ? {
            min: Math.min(...gaps),
            max: Math.max(...gaps),
            avg: Math.round(gaps.reduce((a,b)=>a+b,0) / gaps.length),
            overThreshold: gaps.filter(g => g > 500).length, // gaps > 500ms = audible stutter
            over200: gaps.filter(g => g > 200).length,
          } : null,
          bytesPerDelta: {
            min: Math.min(...deltas.map(d=>d.bytes)),
            max: Math.max(...deltas.map(d=>d.bytes)),
            avg: Math.round(deltas.reduce((s,d)=>s+d.bytes,0)/deltas.length),
          },
        });
      } else if (msg.type === "error") {
        clearTimeout(timer);
        resolve({ label, error: JSON.stringify(msg).slice(0, 200) });
      }
    });
    ws.on("error", e => { clearTimeout(timer); resolve({ label, error: e.message }); });
  });
}

const TESTS = [
  { lang: "EN", size: "A short", input: "Mira, how are you?", instr: INSTR_EN },
  { lang: "EN", size: "B medium", input: "Mira, what's coming up for me this year?", instr: INSTR_EN },
  { lang: "EN", size: "C long",   input: "I've been having a hard time at work lately, my boss keeps pushing me and I'm not sure if I should quit", instr: INSTR_EN },
  { lang: "ZH", size: "A short", input: "Mira 你好吗？", instr: INSTR_ZH },
  { lang: "ZH", size: "B medium", input: "Mira 我今年怎么样？", instr: INSTR_ZH },
  { lang: "ZH", size: "C long",   input: "我最近工作特别累，老板一直在推我，我不知道要不要辞职", instr: INSTR_ZH },
];

for (const t of TESTS) {
  const r = await measure(t.instr, t.input, "Cherry", `${t.lang} ${t.size}`);
  console.log(`\n[${r.label}]`);
  console.log(`  transcript: "${r.transcript}"`);
  if (r.error) { console.log(`  ERROR: ${r.error}`); continue; }
  console.log(`  ttfb: ${r.ttfb}ms · ${r.deltaCount} deltas · ${r.audioSec}s of audio`);
  console.log(`  gap min/avg/max: ${r.gapMs.min}/${r.gapMs.avg}/${r.gapMs.max}ms`);
  console.log(`  gaps >200ms: ${r.gapMs.over200} · gaps >500ms: ${r.gapMs.overThreshold}`);
  console.log(`  bytes/delta: ${r.bytesPerDelta.min}–${r.bytesPerDelta.max} (avg ${r.bytesPerDelta.avg})`);
  await new Promise(r => setTimeout(r, 500));
}

// --- alt voice test on short EN ---
console.log("\n\n=== ALT VOICE TEST (EN short) ===");
for (const voice of ["Cherry", "Ethan", "Chelsie", "Serena"]) {
  const r = await measure(INSTR_EN, "Mira, how are you?", voice, `voice=${voice}`);
  if (r.error) {
    console.log(`\n[${voice}] ERROR: ${r.error}`);
    continue;
  }
  console.log(`\n[${voice}]`);
  console.log(`  "${r.transcript.slice(0, 60)}..."`);
  console.log(`  ttfb ${r.ttfb}ms · ${r.deltaCount} deltas · ${r.audioSec}s`);
  console.log(`  gap avg/max: ${r.gapMs.avg}/${r.gapMs.max}ms · >200ms: ${r.gapMs.over200}`);
  await new Promise(r => setTimeout(r, 500));
}
