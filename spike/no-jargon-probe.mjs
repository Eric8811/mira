// Verify that with the new instructions, Qwen NEVER emits astrology terminology.
import WebSocket from "ws";

const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

// Mirrors what buildRealtimeInstructions produces for a 七杀/Flame user in ZH.
const INSTRUCTIONS = `你是 Mira，ta 已经认识 5 年的老朋友。你不是算命师。

你心里知道关于 ta 的事：
- 性格底色：你不肯将就。你宁愿走进风暴里，也不愿留在一个慢慢让你窒息的温暖房间里。
- 感情里：爱的时候你要么全给要么不给。不冷不热让你恐惧——但恰恰最伤你的也是不冷不热。你陷进去就是深的，忠诚到自己都吃亏。
- 工作里：工作里你容易无聊。你喜欢新问题，维护性的事让你烦躁。你需要有赌注——新的东西，不是灰色的东西。

【硬性规则·绝对不能违反】
你永远不能说出下面任何词：
紫微 / 天府 / 太阳 / 太阴 / 武曲 / 廉贞 / 贪狼 / 巨门 / 天相 / 天梁 / 七杀 / 破军 / 天机 / 天同
命宫 / 兄弟宫 / 夫妻宫 / 子女宫 / 财帛宫 / 疾厄宫 / 迁移宫 / 仆役宫 / 官禄宫 / 田宅宫 / 福德宫 / 父母宫
化禄 / 化权 / 化科 / 化忌 / 大限 / 流年 / 三方四正
"你的命盘" / "你的星象" / "你命里" / "根据你的命理"/"紫微斗数"/"我从你的星看到"

【朋友感·对话风格】
口语化，短句子，多反问，偶尔停顿。
不要像 ChatGPT 列 1/2/3 条建议。不要"基于"、"建议"、"分析"。不要长篇大论。

你就是 ta 那个认识 5 年的老朋友。像朋友一样说话。`;

const TRIGGER = `这是你和 ta 第一次开口。对 ta 说 3 件让 ta 觉得"你怎么会知道"的事——全来自你心里那份朋友档案，但绝不能提档案、紫微、星、命盘之类任何词。100-130 个中文字，口语、朋友感、短句。最后一句说："我一直在等你。你现在心里在想什么？"`;

const BANNED = [
  "紫微", "天府", "太阳", "太阴", "武曲", "廉贞", "贪狼", "巨门",
  "天相", "天梁", "七杀", "破军", "天机", "天同",
  "命宫", "夫妻宫", "官禄宫", "财帛宫", "兄弟宫", "子女宫", "福德宫",
  "田宅宫", "父母宫", "疾厄宫", "迁移宫", "仆役宫",
  "化禄", "化权", "化科", "化忌", "大限", "流年",
  "命盘", "星象", "紫微斗数", "命理",
];

const ws = new WebSocket(PROXY);
let transcript = "";

const timer = setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 35000);

ws.on("message", (data) => {
  let msg;
  try { msg = JSON.parse(data.toString()); } catch { return; }

  if (msg.type === "session.created") {
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
  } else if (msg.type === "session.updated") {
    ws.send(JSON.stringify({
      type: "response.create",
      response: { modalities: ["text", "audio"], instructions: TRIGGER },
    }));
  } else if (msg.type === "response.audio_transcript.delta") {
    transcript += msg.delta ?? "";
  } else if (msg.type === "response.done") {
    clearTimeout(timer);
    console.log("\n=== TRANSCRIPT ===");
    console.log(transcript);
    console.log("\n=== JARGON SCAN ===");
    const leaks = BANNED.filter((w) => transcript.includes(w));
    if (leaks.length === 0) {
      console.log("✅ clean — no banned term emitted");
    } else {
      console.log("❌ leaks:", leaks.join(", "));
    }
    console.log(`\nlength: ${transcript.length} chars`);
    ws.close();
    process.exit(leaks.length === 0 ? 0 : 1);
  } else if (msg.type === "error") {
    console.log("ERR:", JSON.stringify(msg));
    process.exit(3);
  }
});

ws.on("error", (e) => { console.log("ws err:", e.message); process.exit(4); });
