// Measure TTFB: current prompt (426 chars) vs proposed ultra-tight (<250 chars).
import WebSocket from "ws";
const PROXY = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

const CURRENT = `你是 Mira——ta 认识你 5 年的老朋友。不是算命师，不是治疗师。

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

const TIGHT = `你是 Mira，ta 5 年的老朋友。不是算命师。

ta 的底色（别说出来）：你不肯将就。你宁愿走进风暴里，也不愿留在慢慢让你窒息的温暖里。
感情里你要么全给要么不给。工作里你容易无聊，需要赌注。

回复极短：1-2 句，最多 25 字。像微信语音，不是 podcast。
除非 ta 说"详细说说"才展开。绝不列 1/2/3、不用"宛如/建议/分析"、不提任何算命词。`;

console.log(`CURRENT: ${CURRENT.length} chars`);
console.log(`TIGHT:   ${TIGHT.length} chars`);
console.log();

async function measure(instructions) {
  return new Promise((resolve) => {
    const ws = new WebSocket(PROXY);
    let firstAudio = null;
    let triggerAt = null;
    const timer = setTimeout(() => { ws.close(); resolve({ error: "timeout" }); }, 15000);
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
          modalities: ["text", "audio"], instructions: "打个招呼。",
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

async function runSet(label, instructions) {
  const vals = [];
  for (let i = 0; i < 5; i++) {
    const r = await measure(instructions);
    vals.push(r.firstAudio);
    await new Promise(r => setTimeout(r, 300));
  }
  const avg = Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  console.log(`${label}: ${vals.map(v => v + "ms").join(" · ")} · avg ${avg}ms`);
  return avg;
}

const curAvg = await runSet("CURRENT", CURRENT);
const tightAvg = await runSet("TIGHT  ", TIGHT);
console.log();
console.log(`delta: ${curAvg - tightAvg}ms saved`);
