// 3-5 line summary shown on /reveal right after the archetype name appears.
import type { Archetype } from "./archetype-map";

export const ARCHETYPE_SUMMARY: Record<Archetype, { zh: string; en: string }> = {
  sovereign: {
    zh: "你心里有山，不轻易动摇。\n越重要的事，你越安静地扛着。\n最近有件事在你心里转——是时候做决定了。",
    en: "You carry a mountain inside. Steady, unshakeable.\nThe heavier it matters, the quieter you become.\nSomething's been turning in you lately — it's time.",
  },
  flame: {
    zh: "你不会凑合，也不会假装。\n锋芒是你保护真心的方式。\n最近有件事逼你做选择——别回避。",
    en: "You don't fake, you don't settle.\nYour edge is how you protect what's real.\nSomething's been pressing you to choose — don't look away.",
  },
  seer: {
    zh: "你看得见别人看不见的纹路。\n思考是你呼吸的方式。\n有个答案在你心里成形——听听它。",
    en: "You see the lines others miss.\nThinking is how you breathe.\nAn answer's been forming in you — listen.",
  },
  warmth: {
    zh: "你先懂别人，再懂自己。\n温柔是你，不是软弱。\n有些事，你也该被温柔对待。",
    en: "You understand others first, yourself later.\nWarmth is who you are, not weakness.\nSome things — you deserve to be held too.",
  },
};
