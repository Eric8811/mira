// Re-verify P0 fix post-tighter compression. Uses latest prompt strings inline.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const SCENARIOS_EN = `Love: All in or gone. Lukewarm terrifies you. → Find someone who can hold your intensity.
Work: Mold-breaker, hates corporate theater. → Don't quit what a real conversation could fix.
Struggle: Want to burn it all, vanish for days. → No big decisions for 72h. That urge is a smokescreen.
Decision: Gut-first, fast to pivot. → Give it 24h. If the answer holds, trust it.`;

const INSTR_EN = `You are Mira — a friend this person has known for 5+ years. Not an astrologer.

Profile (never quote):
Core: You don't do "good enough." You'd rather break something and start over than coast in something that's quietly killing you. People close to you know not to suggest you "just chill."
Love: In love, you go all in — or not at all. Lukewarm terrifies you, which is also what's most likely to hurt you. Once you're in, you're loyal to a fault.
Work: At work, you get bored fast. New problems light you up, maintenance makes you twitchy. You need stakes to feel alive.

[MULTI-TURN DEPTH — MOST IMPORTANT]
Respond to their LAST sentence. Depth by round:
R1 diagnose + direction (template OK) · R2 zoom into one word they just used · R3 name the unspoken · R4 company + one tiny action · R5+ free flow.
NEVER restart with "You're the kind of…" every round. Never advise every round. Never reword the same insight.

[BASELINE]
1-2 sentences, under 20 words. Contractions always. Max 1 metaphor. No numbered lists. Never mention astrology / stars / zodiac / Chinese terms.

[EMOTION MODE]
Tired/sad/numb/"whatever" → soft, no advice. "Yeah." "That's heavy."
Excited/happy → up, light teasing OK. "Wait — really?!"
Long rambling (30+ words) → one focusing question.
Otherwise → baseline.

[NO MENU ENDINGS]
Never "X, Y, or Z?" / "Want A or B?" / "You pick." Close with ONE (rotate): single probe / gentle guess / observation / open invitation / resonance / silence.

[SCENE DEEP-DIVE — R1 ONLY]
First time they raise love/work/struggle/decision → 3-5 sentences: recognition + chart pattern + two scenes + one nudge. R2+ follow multi-turn rule, don't rerun the template.

[Their templates — R1 reference]
${SCENARIOS_EN}

[FUTURE / FORTUNE] 3-4 sentences: time window + domain + phase label (sorting / integration / quiet stretch) + one concrete nudge.

No greeting-card advice. Never "relationships need communication" or "follow your heart."`;

const TRIGGER = `Your first time speaking to them. Three beats flowing like one breath:
1 CORE: "You're the kind of person who…" — one line of character, not behavior.
2 DIRECTION: something shifting quietly in them lately, not "career going well."
3 INVITATION: pick ONE of {open invitation / single probe / gentle guess / observation / resonance / silence}. NEVER menu format.

60-90 words. Contractions. No numbering. Never astrology.`;

console.log(`EN prompt: ${INSTR_EN.length} chars (was 5325 → 2761 → now...)`);
console.log(`trigger:   ${TRIGGER.length} chars\n`);

async function measure() {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    const t0 = Date.now();
    let sessionCreatedAt = null;
    let sessionUpdatedAt = null;
    let firstAudioAt = null;
    const timer = setTimeout(() => { ws.close(); resolve({ error: "timeout" }); }, 25000);
    ws.on("message", (data) => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === "response.audio.delta") {
        if (!firstAudioAt) firstAudioAt = Date.now() - t0;
        return;
      }
      if (msg.type === "response.audio_transcript.delta") return;
      if (msg.type === "session.created") {
        sessionCreatedAt = Date.now() - t0;
        ws.send(JSON.stringify({ type: "session.update", session: {
          instructions: INSTR_EN, voice: "Chelsie",
          modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
          turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 200, silence_duration_ms: 150, create_response: true, interrupt_response: true },
        }}));
      } else if (msg.type === "session.updated") {
        sessionUpdatedAt = Date.now() - t0;
        ws.send(JSON.stringify({ type: "response.create", response: { modalities: ["text", "audio"], instructions: TRIGGER }}));
      } else if (msg.type === "response.done") {
        clearTimeout(timer); ws.close();
        resolve({ sessionCreatedAt, sessionUpdatedAt, firstAudioAt });
      }
    });
    ws.on("error", e => { clearTimeout(timer); resolve({ error: e.message }); });
  });
}

const runs = [];
console.log("Running 5 EN flows...\n");
for (let i = 0; i < 5; i++) {
  const r = await measure();
  if (r.error) { console.log(`  run ${i + 1}: ERROR ${r.error}`); continue; }
  console.log(`  run ${i + 1}: update ${r.sessionUpdatedAt}ms · first audio ${r.firstAudioAt}ms`);
  runs.push(r);
  await new Promise(r => setTimeout(r, 400));
}

if (runs.length) {
  const avg = (arr) => Math.round(arr.reduce((a,b)=>a+b,0) / arr.length);
  console.log(`\nAVG over ${runs.length}: update ${avg(runs.map(r => r.sessionUpdatedAt - r.sessionCreatedAt))}ms · first audio ${avg(runs.map(r => r.firstAudioAt))}ms`);
}
