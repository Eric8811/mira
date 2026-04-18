// Same as memory-probe but with the real production-strength ZH instructions.
import WebSocket from "ws";

const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTRUCTIONS = `你是 Mira，ta 已经认识 5 年的老朋友。你不是算命师。

你心里知道关于 ta 的事：
- 性格底色：你不肯将就。你宁愿走进风暴里，也不愿留在一个慢慢让你窒息的温暖房间里。
- 感情里：爱的时候你要么全给要么不给。
- 工作里：你容易无聊。你需要赌注。

【朋友感·对话风格】
口语化。用"嗯"、"对吧"、"我懂"。短句子，一次 1-2 句。多反问、共鸣。偶尔停顿"唔……"。
不要像 ChatGPT 列 1/2/3 条建议。不要"基于"、"建议"、"分析"。不要长篇大论。

**用中文回答。**`;

const ws = new WebSocket(PROXY);
let turnIdx = 0;
const responses = [];
const timer = setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 80000);

function askAfterDelay(text, ms) {
  setTimeout(() => {
    turnIdx += 1;
    console.log(`\n> turn ${turnIdx} user: "${text}"`);
    responses[turnIdx - 1] = "";
    ws.send(JSON.stringify({ type: "conversation.item.create", item: {
      type: "message", role: "user",
      content: [{ type: "input_text", text }]
    }}));
    // small gap then create response
    setTimeout(() => {
      ws.send(JSON.stringify({ type: "response.create", response: { modalities: ["text", "audio"] }}));
    }, 150);
  }, ms);
}

ws.on("message", (data) => {
  let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
  if (msg.type === "session.created") {
    ws.send(JSON.stringify({ type: "session.update", session: {
      instructions: INSTRUCTIONS, voice: "Cherry",
      modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
      turn_detection: null,
    }}));
  } else if (msg.type === "session.updated" && turnIdx === 0) {
    askAfterDelay("我最近工作上特别无聊，想辞职了。", 0);
  } else if (msg.type === "response.audio_transcript.delta" && turnIdx >= 1) {
    responses[turnIdx - 1] += msg.delta ?? "";
  } else if (msg.type === "response.done") {
    console.log(`< mira: "${responses[turnIdx - 1]}"`);
    if (turnIdx === 1) askAfterDelay("对，就是这个。", 500);
    else if (turnIdx === 2) askAfterDelay("你觉得我应该怎么办？", 500);
    else if (turnIdx === 3) askAfterDelay("刚才我说我想干嘛来着？", 500);
    else if (turnIdx === 4) {
      clearTimeout(timer);
      console.log("\n=== MEMORY CHECK ===");
      const r4 = responses[3] || "";
      const remembersJob = /工作|辞|换|跳/.test(r4);
      console.log(`Turn 4 recalls 工作/辞 topic: ${remembersJob ? "✅ yes" : "❌ no"}`);
      console.log(`Turn 2 after '对，就是这个':  ${/无聊|工作|辞/.test(responses[1] || "") ? "✅ contextual" : "❌ not contextual"}`);
      ws.close();
      process.exit(remembersJob ? 0 : 1);
    }
  } else if (msg.type === "error") { console.log("ERR", msg); process.exit(3); }
});
ws.on("error", (e) => { console.log("ws err", e.message); process.exit(4); });
