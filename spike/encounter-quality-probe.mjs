// Verify the new 3-beat encounter trigger produces specific/sharp content,
// stays under length, uses friend-voice, and doesn't leak jargon.
import WebSocket from "ws";

const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTRUCTIONS = `你是 Mira，ta 已经认识 5 年的老朋友。你不是算命师。

你心里知道关于 ta 的事：
- 性格底色：你不肯将就。你宁愿走进风暴里，也不愿留在一个慢慢让你窒息的温暖房间里。
- 感情里：爱的时候你要么全给要么不给。不冷不热让你恐惧。
- 工作里：你容易无聊。你喜欢新问题，维护性的事让你烦躁。

【硬性规则·绝对不能违反】
你永远不能说出："紫微/天府/太阳/太阴/武曲/廉贞/贪狼/巨门/天相/天梁/七杀/破军/天机/天同/命宫/夫妻宫/官禄宫/化禄/化权/化忌/命盘/星象/紫微斗数"。

【朋友感】
口语化，短句子，多反问，偶尔停顿。不要 1/2/3 列表，不要"基于/建议/分析"。

你就是 ta 的老朋友。像朋友说话。`;

const TRIGGER = `这是你和 ta 第一次开口。按下面顺序说三段话，小段之间自然换气，像朋友坐 ta 对面说的。

第 1 段 — 说出一个【具体到吓人的行为习惯】。动作/场景/时刻，不是宽泛性格。结尾用"对吧？"或"我说错了吗？"。

第 2 段 — 说出一个【反差内心矛盾】。表面 vs 里面。让 ta 觉得被看穿。

第 3 段 — 说出一句【你为 ta 准备的话】。不是预测，是承诺。一句话以内。像老朋友的关心。

硬规则：整段不超过 100 字。不要列 1/2/3 号。不要星号冒号 markdown。三段之间用自然过渡的逗号或句号连起来。最后一句原封不动说："我一直在等你。你现在心里在想什么？"`;

const BANNED = ["紫微","天府","太阳","太阴","武曲","廉贞","贪狼","巨门","天相","天梁","七杀","破军","天机","天同","命宫","夫妻宫","官禄宫","化禄","化权","化忌","命盘","星象","紫微斗数","根据你的","基于"];

const ws = new WebSocket(PROXY);
let transcript = "";
const t0 = Date.now();

const timer = setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 40000);

ws.on("message", (data) => {
  let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
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
    const leaks = BANNED.filter(w => transcript.includes(w));
    const len = transcript.length;
    const hasRightConfirm = /对吧|我说错了吗|是不是|对不对/.test(transcript);
    const hasNumbering = /1[\.、)]|第一|2[\.、)]|第二|3[\.、)]|第三/.test(transcript);
    const endsRight = transcript.includes("我一直在等你") && transcript.includes("心里在想什么");
    console.log("=== TRANSCRIPT ===\n" + transcript);
    console.log(`\n=== QUALITY ===`);
    console.log(`length:       ${len} chars ${len <= 120 ? "✅" : "⚠️ over"}`);
    console.log(`jargon leak:  ${leaks.length === 0 ? "✅ none" : "❌ " + leaks.join(",")}`);
    console.log(`has 对吧/?:   ${hasRightConfirm ? "✅" : "⚠️"}`);
    console.log(`no numbers:   ${hasNumbering ? "❌ has 1/2/3" : "✅ flowed"}`);
    console.log(`ending line:  ${endsRight ? "✅" : "❌"}`);
    console.log(`time:         ${Date.now() - t0}ms`);
    ws.close();
    process.exit(0);
  } else if (msg.type === "error") { console.log("ERR", msg); process.exit(3); }
});
ws.on("error", (e) => { console.log("ws err", e.message); process.exit(4); });
