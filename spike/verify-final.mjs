// Verify Chelsie on EN stays clean + menu format is gone.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTR_EN = `You are Mira, a friend. Not an astrologer.
Core: you don't settle for 'good enough.'

Default: 1-2 sentences, under 20 words. Contractions.

[HARD BAN — NO MENUS]
Never use "X, Y, or Z?" / "Want to talk about A, B, or C?" / "You pick." menus.
Only close with ONE of: single probe / gentle guess / observation / open invitation / resonance / silence.`;

const ENCOUNTER_EN = `Three beats:
1. CORE: "You're the kind of person who..."
2. DIRECTION: something shifting.
3. NATURAL INVITATION: pick ONE, NEVER menu format. Options: open ("What's on your mind?") / single probe / guess / observation / resonance / silence.
60-90 words.`;

async function test(instructions, trigger, voice = "Chelsie") {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    let transcript = "";
    let deltas = 0;
    let lastAt = null;
    let firstAt = null;
    let bigGaps = 0;
    const timer = setTimeout(() => { ws.close(); resolve({ error: "timeout" }); }, 35000);
    ws.on("message", (data) => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === "session.created") {
        ws.send(JSON.stringify({ type: "session.update", session: {
          instructions, voice,
          modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
          turn_detection: null,
        }}));
      } else if (msg.type === "session.updated") {
        ws.send(JSON.stringify({ type: "response.create", response: {
          modalities: ["text", "audio"], instructions: trigger,
        }}));
      } else if (msg.type === "response.audio.delta") {
        deltas += 1;
        const now = Date.now();
        if (!firstAt) firstAt = now;
        if (lastAt && now - lastAt > 200) bigGaps += 1;
        lastAt = now;
      } else if (msg.type === "response.audio_transcript.delta") transcript += msg.delta ?? "";
      else if (msg.type === "response.done") {
        clearTimeout(timer); ws.close();
        resolve({ transcript, deltas, bigGaps });
      }
    });
    ws.on("error", e => { clearTimeout(timer); resolve({ error: e.message }); });
  });
}

console.log("=== Chelsie EN — First Encounter ===");
const r1 = await test(INSTR_EN, ENCOUNTER_EN + " User just arrived. Speak the opening.");
console.log(`"${r1.transcript}"`);
console.log(`${r1.deltas} deltas · ${r1.bigGaps} gaps >200ms`);

// Menu detection: simple regex for "X, Y, or Z?" / "X, Y, Z?" patterns
const menuPatterns = [
  /,\s*[a-z]+,\s*or\s*[a-z]+\?/i,
  /want to (talk|chat) about\b.+,\b.+,\s*or\b/i,
  /you pick/i,
  /what (do you want|should we) (talk|chat) about/i,
];
const hasMenu = menuPatterns.some(p => p.test(r1.transcript || ""));
console.log(`menu format: ${hasMenu ? "❌ leaked" : "✅ clean"}`);

console.log("\n=== Chelsie EN — conversational question ===");
const r2 = await test(INSTR_EN, 'User said: "How am I doing this week?" Reply briefly.');
console.log(`"${r2.transcript}"`);
console.log(`${r2.deltas} deltas · ${r2.bigGaps} gaps >200ms`);

console.log("\n=== Cherry ZH — menu ban check ===");
const INSTR_ZH = `你是 Mira，朋友。不是算命师。
默认 1-2 句。
【结尾格式硬禁令】
绝不用菜单式："是 X、Y 还是 Z？" / "想聊 A、B 还是 C？" / "你挑吧。"
结尾只用：单点追问 / 直觉猜测 / 观察 / 开放邀请 / 共鸣 / 留白。`;
const r3 = await test(INSTR_ZH, "这是你和 ta 第一次说话。三段话。第 3 段用自然引导，不要菜单式。", "Cherry");
console.log(`"${r3.transcript}"`);
const zhMenu = /(是|想聊|选).*(还是).*[?？]/.test(r3.transcript || "") || /你挑吧/.test(r3.transcript || "");
console.log(`menu format: ${zhMenu ? "❌ leaked" : "✅ clean"}`);
