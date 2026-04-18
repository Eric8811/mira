// Verify the rewritten First Encounter: EN native voice + ZH 3-beat structure (essence / direction / invitation).
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const ZH_INSTRUCTIONS = `你是 Mira，老朋友。ta 底色：你不肯将就。感情里全给或不给。工作里需要赌注。
硬规则：绝不说紫微/命宫/天府/命盘/星象等术语。
风格：大白话 80%，比喻最多 20%。短句。每轮 ≤ 40 字。多反问共鸣。
不说"宛如/仿佛/彷佛/与此同时"。`;

const ZH_TRIGGER = `这是你和 ta 第一次开口。按下面结构说三段话：
第 1 段【ta 这个人的底色】用"你这个人，是那种……的类型"句式，不猜行为。
第 2 段【最近的方向感】一件在动的事，一个转折感，不要"财运好"套话。
第 3 段【温柔开放的邀请】不是"你心里在想什么"，给具体钩子。
硬规则：整段 80-110 字，不要 1/2/3 号，自然连起来像真人说话。绝不出现任何术语。`;

const EN_INSTRUCTIONS = `You are Mira, an old friend. Core: you don't do "good enough", you'd rather break something than coast. In love: all-in or not at all. At work: need stakes.
HARD RULES: never mention astrology/charts/stars/zodiac/palaces. Never Chinese terms.
NATIVE: contractions always (you're, don't, I've). Use "the kind of person who…", "one of those people who…". Max 1 metaphor per response.
NEVER: "you are one who", "there exists in you", "you possess", "your essence is".
Length: 1-2 sentences per turn usually.`;

const EN_TRIGGER = `This is the first time you speak to them. Three beats:
BEAT 1: their core essence with "You're the kind of person who..." (not behavior prediction).
BEAT 2: something shifting/turning in them lately, not "your career is going well".
BEAT 3: an open invitation with a concrete hook (NOT "what's on your mind?").
Rules: 80-110 words, no numbering, flow like speech. Use contractions. Never mention astrology.`;

async function test(label, instructions, trigger) {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    let transcript = "";
    const t0 = Date.now();
    const timer = setTimeout(() => { ws.close(); resolve({ label, error: "timeout" }); }, 45000);
    ws.on("message", (data) => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === "response.audio.delta") return;
      if (msg.type === "session.created") {
        ws.send(JSON.stringify({ type: "session.update", session: {
          instructions, voice: "Cherry",
          modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
          turn_detection: null,
        }}));
      } else if (msg.type === "session.updated") {
        ws.send(JSON.stringify({ type: "response.create", response: {
          modalities: ["text", "audio"], instructions: trigger,
        }}));
      } else if (msg.type === "response.audio_transcript.delta") {
        transcript += msg.delta ?? "";
      } else if (msg.type === "response.done") {
        clearTimeout(timer);
        ws.close();
        resolve({ label, transcript, ms: Date.now() - t0 });
      }
    });
  });
}

console.log("=== ZH First Encounter ===");
const zh = await test("zh", ZH_INSTRUCTIONS, ZH_TRIGGER);
console.log(zh.transcript);
console.log(`length: ${zh.transcript?.length ?? 0} chars · ${zh.ms}ms\n`);

console.log("=== EN First Encounter ===");
const en = await test("en", EN_INSTRUCTIONS, EN_TRIGGER);
console.log(en.transcript);
console.log(`length: ${en.transcript?.length ?? 0} chars · ${en.ms}ms\n`);

console.log("=== LINT ===");
const zhBanned = ["宛如","仿佛","彷佛","与此同时","然而","紫微","命宫","命盘","星象"];
const zhBadEnding = /你心里在想什么[?？]/.test(zh.transcript || "");
console.log("ZH banned words:", zhBanned.filter(w => zh.transcript?.includes(w)).join(",") || "none ✅");
console.log("ZH avoids generic 'whats on your mind' ending:", zhBadEnding ? "❌ repeats" : "✅");

const enBanned = ["you are one who","you possess","there exists","your essence","your soul carries"];
const enGeneric = /what'?s on your mind/i.test(en.transcript || "");
const enContractions = /\b(you're|don't|can't|I've|it's|that's)/.test(en.transcript || "");
console.log("EN translation-y phrases:", enBanned.filter(w => en.transcript?.toLowerCase().includes(w)).join(",") || "none ✅");
console.log("EN uses contractions:", enContractions ? "✅" : "❌");
console.log("EN avoids 'whats on your mind':", enGeneric ? "❌" : "✅");
