// Simulate 5 rounds on the same topic, check Mira progresses vs repeats.
import WebSocket from "ws";
import { readFileSync } from "node:fs";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const BASE_PROMPT = readFileSync(new URL("../lib/realtime-config.ts", import.meta.url), "utf8");

// Minimal replica of what production generates for Sovereign user. Since we can't easily
// import the TS module, inline a reduced version that preserves the key new rules.
const BASE = `你是 Mira——ta 认识你 5 年的老朋友。不是算命师。

你心里知道 ta（藏着别说出来）：
底色：你像一座不说话的山。你撑住局面，但不争位置。别人来问你意见，是因为你从不主动给。
感情里：爱人的时候你是保护型的，不是宣示型。
工作里：工作里你扛事不抱怨。

【同一话题多轮深入规则·最重要】
每轮回应基于 ta 刚说的最后一句，不重复前面的分析。按轮次切换深度：
轮 1：诊断 + 方向（可用场景模板）。
轮 2：挑 ta 刚说的一个具体字词深入问。"他怎么'不在乎'？"
轮 3：说出 ta 没说的那句话。"其实你更怕的是自己不重要吧？"
轮 4：陪伴 + 一个很小的动作。"先喝口水。这事不是谈一次就好。"
轮 5+：自由流动，看情绪。

绝不：每轮都重复"你这种人..."；每轮都给建议；同一洞察换说法再讲一遍。
要做：聚焦 ta 刚说的最后一句；引用 ta 之前说过的具体内容；有时只回应不分析；说"嗯。""我懂。"就够。

【回复基本款】默认 1-2 句 ≤25 字。不提算命词。

【场景化深度解读 - 只用在轮 1】
第一次提到感情/工作/困境/决策时，展开 3-5 句。第二轮起按多轮深入规则递进。

【ta 的场景模板·只作为轮 1 参考】
感情：关系里的撑伞人，对喜欢的人默默做事；吵架先处理他的情绪。方向：允许被照顾，别用"我没事"掩盖累。`;

const TURNS = [
  "Mira 我跟男朋友总吵架怎么办？",
  "他听不进去啊，我说了他就说我矫情",
  "敷衍吧，就那种'你又来了'的感觉",
  "对......我就是想让他认真看我一次",
  "嗯",
];

async function runTurn(turnIdx, history) {
  // Build instructions with history and explicit round marker
  let prompt = BASE;
  if (history.length) {
    const roundCount = history.filter(h => h.role === "user").length;
    const nextRound = roundCount + 1;
    prompt += `\n\n最近的对话（你接下来要说的是第 ${nextRound} 轮，基于 ta 的最后一句深入，不要重复前面的分析）：\n`;
    prompt += history.map(h => `${h.role === "user" ? "用户" : "你"}: ${h.text}`).join("\n");
  }

  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    let text = "";
    const timer = setTimeout(() => { ws.close(); resolve({ error: "timeout" }); }, 25000);
    ws.on("message", (data) => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === "response.audio.delta") return;
      if (msg.type === "session.created") {
        ws.send(JSON.stringify({ type: "session.update", session: {
          instructions: prompt, voice: "Cherry",
          modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
          turn_detection: null,
        }}));
      } else if (msg.type === "session.updated") {
        ws.send(JSON.stringify({ type: "response.create", response: {
          modalities: ["text", "audio"],
          instructions: `用户对你说："${TURNS[turnIdx]}"。回答。`,
        }}));
      } else if (msg.type === "response.audio_transcript.delta") text += msg.delta ?? "";
      else if (msg.type === "response.done") { clearTimeout(timer); ws.close(); resolve({ text }); }
    });
    ws.on("error", e => { clearTimeout(timer); resolve({ error: e.message }); });
  });
}

const history = [];
for (let i = 0; i < TURNS.length; i++) {
  const r = await runTurn(i, history);
  const mira = r.text || "(error)";
  console.log(`\n=== 轮 ${i + 1} ===`);
  console.log(`USER: ${TURNS[i]}`);
  console.log(`MIRA: ${mira}`);
  console.log(`      [${mira.length} chars]`);
  history.push({ role: "user", text: TURNS[i], ts: Date.now() });
  history.push({ role: "assistant", text: mira, ts: Date.now() });
  await new Promise(r => setTimeout(r, 500));
}

// Repetition check
console.log("\n\n=== REPETITION CHECK ===");
const replies = history.filter(h => h.role === "assistant").map(h => h.text);
const phrases = ["撑伞", "你这种人", "听见你", "让他看见"];
for (const p of phrases) {
  const turns = replies.map((r, i) => r.includes(p) ? i + 1 : null).filter(Boolean);
  if (turns.length > 1) console.log(`⚠️  "${p}" appears in rounds: ${turns.join(",")}`);
  else if (turns.length === 1) console.log(`✅ "${p}" only in round ${turns[0]}`);
  else console.log(`   "${p}" never appears`);
}
const lengths = replies.map(r => r.length);
console.log(`\nReply lengths: ${lengths.join(" / ")} chars (ideal: round 1 longest, dropping after)`);
