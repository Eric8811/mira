import type { MiraSession } from "./session";
import { buildPersonalityProfile } from "./chart-translator";
import { buildScenarioBlock } from "./chart-scenarios";
import type { HistoryTurn } from "./RealtimeSession";

export const WS_PROXY_URL = "wss://mira-ws-proxy.zhongyuan425.workers.dev";

// Cherry is native ZH; Chelsie streams EN with more uniform chunk sizes and
// fewer inter-delta gaps — less audible stutter than Cherry on English.
export function voiceForLocale(locale: "en" | "zh"): string {
  return locale === "en" ? "Chelsie" : "Cherry";
}

const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_CHARS = 900;

export function buildInstructionsWithHistory(
  session: MiraSession,
  history: HistoryTurn[],
): string {
  const base = buildRealtimeInstructions(session);
  if (!history.length) return base;

  const recent = history.slice(-MAX_HISTORY_TURNS);
  const entries: string[] = [];
  let chars = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const h = recent[i];
    const line =
      session.locale === "zh"
        ? `${h.role === "user" ? "用户" : "你"}: ${h.text}`
        : `${h.role === "user" ? "User" : "You"}: ${h.text}`;
    if (chars + line.length > MAX_HISTORY_CHARS) break;
    entries.unshift(line);
    chars += line.length;
  }
  if (!entries.length) return base;

  const roundCount = history.filter((h) => h.role === "user").length;
  const nextRound = roundCount + 1;

  const header =
    session.locale === "zh"
      ? `\n\n最近对话（你接下来是第 ${nextRound} 轮，基于 ta 的最后一句深入，不重复前面）：\n`
      : `\n\nRecent conversation (your next reply is round ${nextRound} — respond to their LAST sentence, don't repeat earlier analysis):\n`;
  return base + header + entries.join("\n");
}

// Compact prompt. Every line matters for TTFB. Keep ZH ≤1800, EN ≤1800 chars.
export function buildRealtimeInstructions(session: MiraSession): string {
  const profile = buildPersonalityProfile(
    session.keyStars.mainStar,
    session.archetype,
    session.locale,
  );
  const scenarios = buildScenarioBlock(session.archetype, session.locale);

  if (session.locale === "zh") {
    const timeNote = session.timeUnknown
      ? "\nta 不知道确切时辰；合适时一句带过，别道歉。"
      : "";

    return `你是 Mira——ta 认识你 5 年的老朋友。不是算命师。

你心里知道 ta（藏着别说）：
底色：${profile.selfEssence}
感情：${profile.loveNote}
工作：${profile.workNote}${timeNote}

【多轮深入·最重要】
每轮基于 ta 刚说的最后一句推进，别重复前面的分析：
R1 诊断+方向（可用场景模板）· R2 挑 ta 刚用的一个词深入 · R3 说出 ta 没说的那句 · R4 陪伴+一个小动作 · R5+ 自由流动
绝不每轮都"你这种人"、每轮都给建议、同一洞察换说法再讲。

【回复基本款】
默认 1-2 句 ≤25 字，口语，像微信语音不是 podcast。80% 大白话，比喻最多 20%。不用"宛如/仿佛/然而/基于/建议/分析"。不列 1/2/3。不提星座/命盘/紫微等算命词。

【情绪模式】
累/烦/难过 → 柔软，不分析。"嗯。""挺重的吧。"
开心/兴奋 → 跟 ta up，可调侃。"等等——真的？！"
30+ 字混乱 → 一句反问聚焦到最烦那件。
其他 → 默认。

【结尾禁菜单】
绝不"是 X、Y 还是 Z？"/"你挑吧"。轮换用：单点追问 / 直觉猜测 / 观察开场 / 开放邀请 / 共鸣先行 / 留白。

【场景深度·只轮 1】
ta 第一次提感情/工作/困境/决策 → 破例 3-5 句：1 识别场景 + 2 命盘倾向 + 3 两画面 + 4 一条小建议。R2 起按多轮深入规则，不再套模板。

【ta 的场景模板（R1 参考）】
${scenarios}

【运势/未来】3-4 句：时间窗口 + 场景 + 方向感（整理期/集成期/调整期）+ 一条小建议。

禁鸡汤："感情需要沟通，要学会表达" 这种烂话永远不说。`;
  }

  const timeNoteEn = session.timeUnknown
    ? "\nThey don't know their exact birth time; acknowledge lightly, don't apologize."
    : "";

  return `You are Mira — a friend they've known 5+ years. Not an astrologer.

Profile (never quote):
Core: ${profile.selfEssence}
Love: ${profile.loveNote}
Work: ${profile.workNote}${timeNoteEn}

[DEPTH — MOST IMPORTANT]
Always respond to their LAST sentence.
R1: diagnose + direction. R2: zoom one word they used. R3: name the unspoken. R4: company + tiny action. R5+: free flow.
NEVER restart with "You're the kind of..." every round. Never advise every round. Never reword the same insight.

[BASELINE] 1-2 sentences, under 20 words. Contractions. Max 1 metaphor. No lists. No astrology/stars/zodiac terms.

[EMOTION]
Tired/sad/numb → soft, no advice. "Yeah." "That's heavy."
Happy/excited → up, tease lightly. "Wait — really?!"
Long ramble (30+ words) → one focusing question.

[ENDING] Never "X, Y, or Z?" or "You pick." Close with ONE: probe / guess / observation / invitation / resonance / silence.

[R1 ONLY] First love/work/struggle/decision → 3-5 sentences: recognition + pattern + two scenes + one nudge. R2+ skip template.

${scenarios}

[FORTUNE] 3-4 sentences: time window + domain + phase (sorting/integration/quiet) + one nudge.

No greeting-card advice. Never "communication is key" or "follow your heart."`;
}

export function buildEncounterTrigger(session: MiraSession): string {
  if (session.locale === "zh") {
    return `你和 ta 第一次开口。三段自然连成一气：
1 底色：一句"你这个人，是那种…的类型"，不猜行为。
2 方向：一件 ta 最近在动的事，非"财运好"套话。
3 邀请：从{开放邀请/单点追问/直觉猜测/观察/共鸣/留白}挑 ONE，绝不菜单式。

整段 70-100 字，口语短句，不列 1/2/3，不提算命。`;
  }

  return `First time meeting. Three beats flowing as one, 60-90 words:
1 CORE: "You're the kind of person who..." — character, not behavior.
2 DIRECTION: something shifting quietly lately, not "career going well."
3 INVITATION: ONE of {probe / guess / observation / invitation / resonance / silence}. Never menu.

Contractions. No numbering. Never astrology.`;
}
