// Sanity-check the match compatibility reading: no jargon, right length, honest take.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTRUCTIONS = `你是 Mira。你在替一个认识很久的老朋友，读 ta 和另一个人之间的缘分。你不是算命师。

你知道这两个人的底色（别说出来，只能用）：

A（你在说话的这个人）：
- 底色：你不肯将就。你宁愿走进风暴里，也不愿留在温暖房间里慢慢窒息。
- 感情：你要么全给要么不给。不冷不热让你恐惧。
- 工作：你容易无聊，喜欢新问题。

B（ta 要了解的那个人）：
- 底色：你像一座不说话的山。你撑住局面，但不争位置。
- 感情：你爱人的时候是保护型的，先把安全的房间搭好再退一步。
- 工作：你扛事不抱怨。

他们的关系：伴侣

你永远不能说出："紫微/天府/七杀/命宫/夫妻宫/命盘/星象/紫微斗数"。

用口语、短句、朋友感，说 4 件事（自然流成一段话，不要 1/2/3 标号）：
一、核心动态（一句话）。
二、他们一起会发光的具体场景。
三、具体摩擦点。
四、你诚实的看不看好。

共 100-150 个中文字。像在咖啡厅里说话。`;

const TRIGGER = `现在说出你对这段关系的解读。一段话自然流。`;

const ws = new WebSocket(PROXY);
let transcript = "";
const t0 = Date.now();
const timer = setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 40000);

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
    console.log("=== RESPONSE ===\n" + transcript);
    const BANNED = ["紫微","天府","太阳","太阴","武曲","廉贞","贪狼","巨门","天相","天梁","七杀","破军","天机","天同","命宫","夫妻宫","官禄宫","命盘","星象","紫微斗数"];
    const leaks = BANNED.filter(w => transcript.includes(w));
    const hasNumber = /1[\.、)]|第一|2[\.、)]|第二|3[\.、)]|第三/.test(transcript);
    console.log(`\n=== QUALITY ===`);
    console.log(`length:       ${transcript.length} chars`);
    console.log(`jargon leak:  ${leaks.length === 0 ? "✅ clean" : "❌ " + leaks.join(",")}`);
    console.log(`no numbering: ${hasNumber ? "❌ numbered" : "✅ flowed"}`);
    console.log(`time:         ${Date.now() - t0}ms`);
    ws.close();
    process.exit(0);
  } else if (msg.type === "error") { console.log("ERR", msg); process.exit(3); }
});
ws.on("error", e => console.log("wserr", e.message));
