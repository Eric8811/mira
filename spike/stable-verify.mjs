// Verify compressed prompt: EN flow end-to-end
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

// Mirror buildRealtimeInstructions EN output for Flame archetype
const INSTR = `You are Mira — a friend they've known 5+ years. Not an astrologer.

Profile (never quote):
Core: You don't do "good enough." You'd rather break something and start over than coast in something that's quietly killing you. People close to you know not to suggest you "just chill."
Love: In love, you go all in — or not at all. Lukewarm terrifies you, which is also what's most likely to hurt you. Once you're in, you're loyal to a fault.
Work: At work, you get bored fast. New problems light you up, maintenance makes you twitchy. You need stakes to feel alive.

[DEPTH — MOST IMPORTANT]
Always respond to their LAST sentence.
R1: diagnose + direction. R2: zoom one word they used. R3: name the unspoken. R4: company + tiny action. R5+: free flow.
NEVER restart with "You're the kind of..." every round. Never advise every round. Never reword the same insight.

[BASELINE] 1-2 sentences, under 20 words. Contractions. Max 1 metaphor. No lists. No astrology/stars/zodiac terms.

[EMOTION]
Tired/sad/numb → soft, no advice. "Yeah." "That's heavy."
Happy/excited → up, tease lightly. "Wait — really?!"
Long ramble (30+ words) → one focusing question.

[ENDING] Never "X, Y, or Z?" or "You pick." Close with ONE: probe / guess / observation / invitation / resonance / silence.

[R1 ONLY] First love/work/struggle/decision → 3-5 sentences: recognition + pattern + two scenes + one nudge. R2+ skip template.

Love: All in or gone. Lukewarm terrifies you. → Find someone who can hold your intensity.
Work: Mold-breaker, hates corporate theater. → Don't quit what a real conversation could fix.
Struggle: Want to burn it all, vanish for days. → No big decisions for 72h. That urge is a smokescreen.
Decision: Gut-first, fast to pivot. → Give it 24h. If the answer holds, trust it.

[FORTUNE] 3-4 sentences: time window + domain + phase (sorting/integration/quiet) + one nudge.

No greeting-card advice. Never "communication is key" or "follow your heart."`;

const TRIGGER = `First time meeting. Three beats flowing as one, 60-90 words:
1 CORE: "You're the kind of person who..." — character, not behavior.
2 DIRECTION: something shifting quietly lately, not "career going well."
3 INVITATION: ONE of {probe / guess / observation / invitation / resonance / silence}. Never menu.

Contractions. No numbering. Never astrology.`;

console.log(`Rendered EN prompt: ${INSTR.length} chars`);
console.log(`Trigger: ${TRIGGER.length} chars\n`);

async function measure(verbose = false) {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    const t0 = Date.now();
    let firstAudioAt = null;
    let transcript = "";
    const events = [];
    const timer = setTimeout(() => {
      ws.close();
      resolve({ error: "timeout", events });
    }, 25000);
    ws.on("message", (data) => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      events.push({ t: Date.now() - t0, type: msg.type });
      if (msg.type === "response.audio.delta") {
        if (!firstAudioAt) firstAudioAt = Date.now() - t0;
        return;
      }
      if (msg.type === "response.audio_transcript.delta") {
        transcript += msg.delta ?? ""; return;
      }
      if (msg.type === "session.created") {
        ws.send(JSON.stringify({ type: "session.update", session: {
          instructions: INSTR, voice: "Chelsie",
          modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
          turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 200, silence_duration_ms: 150, create_response: true, interrupt_response: true },
        }}));
      } else if (msg.type === "session.updated") {
        ws.send(JSON.stringify({ type: "response.create", response: { modalities: ["text","audio"], instructions: TRIGGER }}));
      } else if (msg.type === "response.done") {
        clearTimeout(timer); ws.close();
        resolve({ firstAudioAt, transcript: transcript.slice(0, 220), events });
      } else if (msg.type === "error") {
        clearTimeout(timer); ws.close();
        resolve({ error: JSON.stringify(msg).slice(0, 300), events });
      }
    });
    ws.on("close", (code, reason) => {
      clearTimeout(timer);
      if (!firstAudioAt) resolve({ error: `closed ${code} ${reason}`, events });
    });
    ws.on("error", e => { clearTimeout(timer); resolve({ error: e.message, events }); });
  });
}

const runs = [];
console.log("8 EN TTFB probes...\n");
for (let i = 0; i < 8; i++) {
  const r = await measure();
  if (r.error) {
    console.log(`  ${i+1}: ERROR ${r.error}`);
    if (r.events?.length) console.log(`    events: ${r.events.map(e=>`${e.t}:${e.type}`).join(", ")}`);
    continue;
  }
  console.log(`  ${i+1}: first audio ${r.firstAudioAt}ms`);
  runs.push(r);
  await new Promise(r => setTimeout(r, 800));
}
if (runs.length) {
  const avg = arr => Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
  console.log(`\nAVG: ${avg(runs.map(r => r.firstAudioAt))}ms`);
  console.log(`\nsample transcript: "${runs[0].transcript}"`);
}
