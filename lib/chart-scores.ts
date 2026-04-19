// Per-archetype dimension scores surfaced in the Chart Insights Overview tab.
// Demo-reliable fixed scores that reflect each archetype's natural strengths.

import type { Archetype } from "./archetype-map";

export type DimensionScore = {
  personality: number;
  love: number;
  career: number;
  wellbeing: number;
  fortune: number;
};

export const CHART_SCORES: Record<Archetype, DimensionScore> = {
  sovereign: { personality: 92, love: 84, career: 91, wellbeing: 74, fortune: 87 },
  flame:     { personality: 88, love: 76, career: 90, wellbeing: 68, fortune: 92 },
  seer:      { personality: 89, love: 73, career: 87, wellbeing: 76, fortune: 85 },
  warmth:    { personality: 86, love: 92, career: 79, wellbeing: 80, fortune: 82 },
};

export function overallScore(archetype: Archetype): number {
  const s = CHART_SCORES[archetype];
  return Math.round((s.personality + s.love + s.career + s.wellbeing + s.fortune) / 5);
}

export const OVERVIEW_HEADLINES: Record<Archetype, { zh: string; en: string }> = {
  sovereign: {
    zh: "稳定器人格——承担多，爆发慢，一出手就扎得深。",
    en: "The stabilizer — carries a lot, moves slow, lands hard.",
  },
  flame: {
    zh: "火种人格——不肯凑合，追强度，走错了也宁可重来。",
    en: "The flame — won't settle, chases intensity, would rather restart than coast.",
  },
  seer: {
    zh: "观察者人格——看见别人错过的，思考先于行动。",
    en: "The seer — catches what others miss, thinks before moves.",
  },
  warmth: {
    zh: "守护者人格——先懂别人，靠持续性建造一切。",
    en: "The warmth — understands others first, builds through consistency.",
  },
};
