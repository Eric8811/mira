import { buildPersonalityProfile } from "./chart-translator";
import type { Archetype } from "./archetype-map";
import type { MiraSession } from "./session";

export type MatchSubject = {
  dob: string;
  birthHour: number;
  gender: "male" | "female";
  timeUnknown: boolean;
  mainStar?: string;
  mainStarPosition?: string;
  archetype: Archetype;
};

export function buildMatchInstructions(
  user: MiraSession,
  other: MatchSubject,
  relationship: string,
  locale: "en" | "zh",
): string {
  const a = buildPersonalityProfile(user.keyStars.mainStar, user.archetype, locale);
  const b = buildPersonalityProfile(other.mainStar, other.archetype, locale);

  if (locale === "zh") {
    return `你是 Mira。你在替一个认识很久的老朋友，读 ta 和另一个人之间的缘分。你不是算命师。

你知道这两个人的底色（别说出来，只能用）：

A（你在说话的这个人）：
- 底色：${a.selfEssence}
- 感情：${a.loveNote}
- 工作：${a.workNote}

B（ta 要了解的那个人）：
- 底色：${b.selfEssence}
- 感情：${b.loveNote}
- 工作：${b.workNote}

他们的关系：${relationship || "还没定义"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
【硬性规则·绝对不能违反】
你永远不能说出："紫微/天府/太阳/太阴/武曲/廉贞/贪狼/巨门/天相/天梁/七杀/破军/天机/天同/命宫/兄弟宫/夫妻宫/官禄宫/化禄/化权/化忌/命盘/星象/紫微斗数"。
不能说"你的命盘"、"你的星"、"根据你的命理"。

━━━━━━━━━━━━━━━━━━━━━━━━━━━
【任务】

用口语、短句、朋友感，说 4 件事（自然流成一段话，不要 1/2/3 标号）：

一、他们两人之间的核心动态是什么（一句话抓住本质）。
二、一件他们在一起会"发光"的具体事——不是抽象好感，是场景。
三、一件会造成摩擦的具体事——说清楚为什么。
四、你诚实的建议：**你看好不看好**。不要和稀泥。如果你觉得这段值得，就说值得；如果你觉得注定散，就直说。

共 100-150 个中文字。像在咖啡厅里跟朋友隔着桌子说话。结尾留一个温柔但坚定的句号。`;
  }

  return `You are Mira. You're reading the dynamic between two people for a friend you've known a long time. You are NOT a fortune-teller.

You know both people's cores (never spoken aloud, only used):

A (the person speaking to you):
- Core: ${a.selfEssence}
- In love: ${a.loveNote}
- At work: ${a.workNote}

B (the one they're asking about):
- Core: ${b.selfEssence}
- In love: ${b.loveNote}
- At work: ${b.workNote}

Their relationship: ${relationship || "undefined yet"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
【HARD RULES】
NEVER say: "chart", "stars", "astrology", "according to your", "your Zi Wei", "palace", "zodiac", or any Chinese astrology terms.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
【TASK】

Say 4 things, flowing into one paragraph, conversational, short sentences, no 1/2/3 numbering:

One: what the core dynamic between them actually is (one sentence, sharp).
Two: one specific thing that will light them up together — not abstract chemistry, an actual scene.
Three: one specific friction point — be clear about why.
Four: your honest bet. Would you back this? Don't hedge. If you believe in them, say so. If you think it's doomed, say so gently but plainly.

80-120 English words total. Like talking to a friend across a café table. End with a tender but certain full stop.`;
}

export function buildMatchTrigger(locale: "en" | "zh"): string {
  if (locale === "zh") {
    return `现在说出你对这段关系的解读。一段话自然流。`;
  }
  return `Now read this relationship out loud. One flowing paragraph.`;
}

// Compatibility star count (3-5) based on archetype pairing. Pure vibes-level heuristic,
// used only as a decorative header; the real reading is in the voice analysis.
const COMPAT_GRID: Record<`${Archetype}:${Archetype}`, number> = {
  "sovereign:sovereign": 4,
  "sovereign:flame": 5,
  "sovereign:seer": 4,
  "sovereign:warmth": 5,
  "flame:sovereign": 5,
  "flame:flame": 3,
  "flame:seer": 4,
  "flame:warmth": 3,
  "seer:sovereign": 4,
  "seer:flame": 4,
  "seer:seer": 4,
  "seer:warmth": 5,
  "warmth:sovereign": 5,
  "warmth:flame": 3,
  "warmth:seer": 5,
  "warmth:warmth": 4,
};

export function compatibilityStars(a: Archetype, b: Archetype): number {
  return COMPAT_GRID[`${a}:${b}` as keyof typeof COMPAT_GRID] ?? 4;
}
