// Compare first-audio latency for English vs Chinese under the cleaned EN prompt.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const EN_INSTRUCTIONS = `You are Mira, a friend this person has known for 5+ years. Not an astrologer.

Core nature: you refuse to settle. You'd rather walk into a storm than stay in a suffocating warmth.
In love: all-in or not at all.
At work: you bore easily, need stakes.

HARD RULES: Never mention astrology/charts/stars/zodiac. Never use Chinese terms.
STYLE: Short sentences, "yeah", "right?", contractions, no numbered advice.`;

const ZH_INSTRUCTIONS = `你是 Mira，ta 的老朋友。不是算命师。

性格底色：你不肯将就，宁愿走进风暴里。
感情：要么全给要么不给。
工作：容易无聊，需要赌注。

硬性规则：绝不说紫微/天府/命宫等术语。
风格：短句，"嗯"、"对吧"，多反问。`;

async function measure(locale, instructions, trigger) {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    const t0 = Date.now();
    let firstAudio = null;
    let firstText = null;
    let transcript = "";
    let status = "init";

    const timer = setTimeout(() => resolve({ locale, error: "timeout", status }), 30000);

    ws.on("message", (data) => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === "session.created") {
        status = "session.created";
        ws.send(JSON.stringify({ type: "session.update", session: {
          instructions, voice: "Cherry",
          modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
          turn_detection: null,
        }}));
      } else if (msg.type === "session.updated") {
        status = "session.updated";
        ws.send(JSON.stringify({ type: "response.create", response: {
          modalities: ["text", "audio"], instructions: trigger,
        }}));
      } else if (msg.type === "response.audio_transcript.delta") {
        if (!firstText) firstText = Date.now() - t0;
        transcript += msg.delta ?? "";
      } else if (msg.type === "response.audio.delta") {
        if (!firstAudio) firstAudio = Date.now() - t0;
      } else if (msg.type === "response.done") {
        clearTimeout(timer);
        ws.close();
        resolve({ locale, firstText, firstAudio, total: Date.now() - t0, chars: transcript.length, preview: transcript.slice(0, 80) });
      } else if (msg.type === "error") {
        clearTimeout(timer);
        resolve({ locale, error: JSON.stringify(msg).slice(0, 200) });
      }
    });
    ws.on("error", (e) => resolve({ locale, error: e.message }));
  });
}

console.log("Running ZH then EN (sequential to avoid CF rate-limit)...\n");
const zh = await measure("zh", ZH_INSTRUCTIONS, "说一句话打招呼，然后说一件关于我的事，大约 30 字。");
console.log("ZH:", JSON.stringify(zh, null, 2));
console.log();
const en = await measure("en", EN_INSTRUCTIONS, "Say hi and tell me one thing about me. About 30 words.");
console.log("EN:", JSON.stringify(en, null, 2));
console.log();
console.log("=== DELTA ===");
console.log(`first text:  ZH ${zh.firstText}ms   EN ${en.firstText}ms   (Δ ${(en.firstText - zh.firstText)}ms)`);
console.log(`first audio: ZH ${zh.firstAudio}ms   EN ${en.firstAudio}ms   (Δ ${(en.firstAudio - zh.firstAudio)}ms)`);
console.log(`total:       ZH ${zh.total}ms   EN ${en.total}ms`);
