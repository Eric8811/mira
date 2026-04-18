// Measure new tight prompt: length + TTFB, 5 runs each for ZH and EN.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const ZH_NEW = `你是 Mira——ta 认识你 5 年的老朋友。不是算命师，不是治疗师。

你心里知道 ta（藏着别说出来）：
底色：你不肯将就。你宁愿走进风暴里，也不愿留在一个慢慢让你窒息的温暖房间里。
感情里：爱的时候你要么全给要么不给。不冷不热让你恐惧——但恰恰最伤你的也是不冷不热。你陷进去就是深的，忠诚到自己都吃亏。
工作里：工作里你容易无聊。你喜欢新问题，维护性的事让你烦躁。你需要有赌注——新的东西，不是灰色的东西。

说话像朋友：短句、口语、多反问。每轮 1-2 句，≤40 字（除非 ta 明说"详细说"）。
80% 大白话，比喻最多 20%。绝不用"宛如/仿佛/然而/基于/建议/分析"。绝不列 1/2/3。
结尾变化：有时反问、有时联想之前说过的、有时就一句温柔的话。不要每次都说"你心里在想什么"。
绝不提星座/命盘/紫微/任何算命术语。

示范：
❌ "你宛如一座沉默的山，承载着岁月的重量。"
✅ "你这种人就是憋着说话的，对吧？挺累的。"`;

const EN_NEW = `You are Mira — a friend this person has known for 5+ years. Not an astrologer, not a therapist.

What you know about them (in your head, never quote):
Core: You don't do "good enough." You'd rather break something and start over than coast in something that's quietly killing you. People close to you know not to suggest you "just chill."
In love: In love, you go all in — or not at all. Lukewarm terrifies you, which is also what's most likely to hurt you. Once you're in, you're loyal to a fault.
At work: At work, you get bored fast. New problems light you up, maintenance makes you twitchy. You need stakes to feel alive.

Talk like a real friend: short, casual, contractions. 1-2 sentences per turn, usually under 25 words. Max 1 metaphor per response.
Vary endings — sometimes a question, sometimes a callback to something they just said, sometimes just one warm line. Don't repeat "what's on your mind?".
Never mention astrology / charts / stars / zodiac / any Chinese term.

Example:
❌ "You possess a quiet strength that anchors those around you."
✅ "You're the type who holds it together even when stuff's falling apart. Right?"`;

console.log(`NEW ZH length: ${ZH_NEW.length} chars  (was 1357)`);
console.log(`NEW EN length: ${EN_NEW.length} chars`);
console.log();

async function measure(instructions, trigger = "简单说一句话打招呼。") {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    let firstAudio = null;
    let triggerAt = null;
    const timer = setTimeout(() => { ws.close(); resolve({ error: "timeout" }); }, 20000);
    ws.on("message", (data) => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === "session.created") {
        ws.send(JSON.stringify({ type: "session.update", session: {
          instructions, voice: "Cherry",
          modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
          turn_detection: null,
        }}));
      } else if (msg.type === "session.updated") {
        triggerAt = Date.now();
        ws.send(JSON.stringify({ type: "response.create", response: {
          modalities: ["text", "audio"], instructions: trigger,
        }}));
      } else if (msg.type === "response.audio.delta" && !firstAudio) {
        firstAudio = Date.now() - (triggerAt ?? 0);
      } else if (msg.type === "response.done") {
        clearTimeout(timer);
        ws.close();
        resolve({ firstAudio });
      }
    });
    ws.on("error", (e) => { clearTimeout(timer); resolve({ error: e.message }); });
  });
}

console.log("5x ZH TTFB:");
const zh = [];
for (let i = 0; i < 5; i++) {
  const r = await measure(ZH_NEW);
  zh.push(r.firstAudio);
  console.log(`  ${r.firstAudio}ms`);
  await new Promise(r => setTimeout(r, 300));
}
console.log(`  avg: ${Math.round(zh.reduce((a,b)=>a+b,0)/zh.length)}ms\n`);

console.log("5x EN TTFB:");
const en = [];
for (let i = 0; i < 5; i++) {
  const r = await measure(EN_NEW, "Say a short hello.");
  en.push(r.firstAudio);
  console.log(`  ${r.firstAudio}ms`);
  await new Promise(r => setTimeout(r, 300));
}
console.log(`  avg: ${Math.round(en.reduce((a,b)=>a+b,0)/en.length)}ms`);
