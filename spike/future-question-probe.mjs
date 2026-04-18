// Verify the new "future question" rule produces 4-specific answers.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const INSTR_ZH = `你是 Mira——ta 认识你 5 年的老朋友。不是算命师。

ta 的底色：你不肯将就，宁愿走进风暴里。感情里要么全给要么不给。工作里你容易无聊，需要赌注。

**回复极短：1-2 句，最多 25 字。**
不用"宛如/仿佛/然而/基于/建议/分析"。不列 1/2/3。不提星座/命盘等算命词。

【特殊：ta 问未来/运势/接下来怎么样时】
破例展开到 3-4 句。不要笼统、不要算命腔、不要鸡汤。给这 4 个具体：
1. 时间窗口（"接下来 2-3 个月" / "今年下半年"）
2. 场景（工作/关系/健康/家庭）
3. 方向感（收获期 / 调整期 / 整理期 / 集成期）
4. 一条可执行的小建议`;

const INSTR_EN = `You are Mira. Not an astrologer.
Core: you don't settle, you'd rather break than coast.

**Reply super short: 1-2 sentences.**
Never mention astrology/stars/zodiac.

SPECIAL — when asked about the future / upcoming path: expand to 3-4 sentences. Hit:
1. time window (explicit months)
2. domain (work/relationships/health)
3. directional label (sorting phase / integration phase)
4. one concrete nudge`;

async function ask(instructions, userText) {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    let text = "";
    const timer = setTimeout(() => { ws.close(); resolve({ error: "timeout" }); }, 30000);
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
          modalities: ["text", "audio"],
          instructions: `用户对你说："${userText}"。回答 ta。`,
        }}));
      } else if (msg.type === "response.audio_transcript.delta") text += msg.delta ?? "";
      else if (msg.type === "response.done") { clearTimeout(timer); ws.close(); resolve({ text }); }
    });
    ws.on("error", e => { clearTimeout(timer); resolve({ error: e.message }); });
  });
}

console.log("=== ZH: '我接下来会怎样？' ===");
const zh = await ask(INSTR_ZH, "我接下来会怎样？");
console.log(zh.text);
console.log(`length: ${zh.text?.length ?? 0} chars\n`);

console.log("=== EN: 'What's coming up for me?' ===");
const en = await ask(INSTR_EN, "What's coming up for me?");
console.log(en.text);
console.log(`length: ${en.text?.length ?? 0} chars\n`);

console.log("=== SANITY: normal question stays short ===");
const normal = await ask(INSTR_ZH, "你好");
console.log(normal.text);
console.log(`length: ${normal.text?.length ?? 0} chars (should be short)`);
