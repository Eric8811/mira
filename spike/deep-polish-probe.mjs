// Validate 4 upgrades: anti-template, scene-aware, emotion-mode, future-question.
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

// Replica of production ZH prompt (Sovereign archetype for tests).
const INSTR = `你是 Mira——ta 认识你 5 年的老朋友。不是算命师。

你心里知道 ta（藏着别说出来）：
底色：你像一座不说话的山。你撑住局面，但不争位置。别人来问你意见，是因为你从不主动给。
感情里：爱人的时候你是保护型的，不是宣示型。你先把安全的房间搭好，再退一步。
工作里：工作里你扛事不抱怨。别人以为你特别想升职——其实你只是在意事情做得对不对。

【回复基本款】
默认极短：1-2 句，≤25 字。80% 大白话。不提星座/命盘/紫微。

【反模板规则】
开场词轮换：不要每轮"嗯"。可以"哦？"/"等等"/"说实话"/"我想想"，或直接进入。
结尾 6 种轮换：A 反问 / B 具体探索 / C 关怀 / D 引导 / E 联想 / F 无钩子。

【情绪识别】
累/烦/难过 → 柔软，短句共鸣，不建议。"嗯。""挺重的吧。"
开心/兴奋 → 上扬，调侃一句。
冗长混乱 → 打断摘重点。"停一下——最让你睡不着的是哪件？"

【场景化深度解读】
问到 感情/工作/困境/决策 时，破例 3-5 句，4 步：
1 识别场景 2 命盘倾向 3 两个画面 4 一条建议

【ta 的场景模板】
感情：关系里的撑伞人，默默守护型。对喜欢的人默默做事；吵架先处理对方情绪自己委屈往后放。方向：允许被照顾，别用'我没事'掩盖累。
工作：职场定海神针，扛事不抱怨；别人以为你想升职其实只在意事情做对。方向：学会说你的需要。
困境：低谷时是沉默的山，自己撑到爆发才让人看见。方向：找一个不用强撑的安全角落。
决策：决策慢但决定了深扎。方向：最难说出口的答案通常是真的。

【未来/运势类】
3-4 句，给时间窗口 + 场景 + 方向感 + 一条小建议。`;

async function ask(userText) {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    let text = "";
    const timer = setTimeout(() => { ws.close(); resolve({ error: "timeout" }); }, 30000);
    ws.on("message", (data) => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === "response.audio.delta") return;
      if (msg.type === "session.created") {
        ws.send(JSON.stringify({ type: "session.update", session: {
          instructions: INSTR, voice: "Cherry",
          modalities: ["text", "audio"], input_audio_format: "pcm16", output_audio_format: "pcm24",
          turn_detection: null,
        }}));
      } else if (msg.type === "session.updated") {
        ws.send(JSON.stringify({ type: "response.create", response: {
          modalities: ["text", "audio"],
          instructions: `用户对你说："${userText}"。回答。`,
        }}));
      } else if (msg.type === "response.audio_transcript.delta") text += msg.delta ?? "";
      else if (msg.type === "response.done") { clearTimeout(timer); ws.close(); resolve({ text }); }
    });
    ws.on("error", e => { clearTimeout(timer); resolve({ error: e.message }); });
  });
}

const TESTS = [
  { label: "A · 感情场景", input: "Mira 我最近跟男朋友总吵架怎么办", expect: "love-scene" },
  { label: "B · 开心模式", input: "Mira 我今天升职了！", expect: "up-mode" },
  { label: "C · 柔软模式", input: "我今天真的好累", expect: "soft-mode" },
  { label: "D · 冗长混乱", input: "我最近工作压力大男朋友也不理解爸妈总催婚朋友也忙有时候真的觉得一个人不知道怎么办要不要辞职或者分手", expect: "interrupt" },
  { label: "E · 未来问题", input: "我接下来会怎样", expect: "future" },
  { label: "F · 普通打招呼", input: "你好", expect: "short" },
];

console.log(`prompt length: ${INSTR.length} chars\n`);

for (const t of TESTS) {
  const r = await ask(t.input);
  const txt = r.text || "";
  console.log(`\n=== ${t.label} ===`);
  console.log(`Q: ${t.input}`);
  console.log(`A: ${txt}`);
  console.log(`   (${txt.length} chars)`);
  await new Promise(r => setTimeout(r, 400));
}
