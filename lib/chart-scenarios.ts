// Scene-specific archetype scripts. Used by buildRealtimeInstructions to ground
// Mira's responses when the user raises love / work / struggle / decision topics.
// COMPACT — every char counts for session.update TTFB.

import type { Archetype } from "./archetype-map";

export type Topic = "love" | "work" | "struggle" | "decision";

type SceneTemplate = { zh: string; en: string };

export const SCENARIOS: Record<Archetype, Record<Topic, SceneTemplate>> = {
  sovereign: {
    love: {
      zh: "默默守护型，吵架先处理对方情绪。→ 允许被照顾，别用'我没事'掩盖累。",
      en: "Umbrella-holder: handle their feelings first, yours later. → Let yourself be taken care of.",
    },
    work: {
      zh: "定海神针，扛事不抱怨。→ 说出你的需要，别等被看见。",
      en: "Quiet anchor: you carry it without complaining. → Say what you need. Don't wait.",
    },
    struggle: {
      zh: "沉默撑到爆发。→ 找一个不用强撑的安全角落，30 分钟也行。",
      en: "Silent mountain till near-crack. → Find one corner where you don't have to be strong.",
    },
    decision: {
      zh: "决策慢，定了就深扎。→ 最难说出口的答案通常是真的。",
      en: "Slow to decide, locked-in once done. → The answer you can't say is usually the real one.",
    },
  },
  flame: {
    love: {
      zh: "全给或走，不冷不热让你恐慌。→ 找能接住你烈度的人，别降温。",
      en: "All in or gone. Lukewarm terrifies you. → Find someone who can hold your intensity.",
    },
    work: {
      zh: "破局者，恨官腔，感兴趣就 all in。→ 别用跳槽解决一次真实对话能解决的事。",
      en: "Mold-breaker, hates corporate theater. → Don't quit what a real conversation could fix.",
    },
    struggle: {
      zh: "想炸一切，消失几天。→ 先别动大决定。'推翻一切'的冲动是烟雾弹，等 72 小时。",
      en: "Want to burn it all, vanish for days. → No big decisions for 72h. That urge is a smokescreen.",
    },
    decision: {
      zh: "凭感觉+冲动。→ 24 小时冷静期。如果那时还是同一答案，相信它。",
      en: "Gut-first, fast to pivot. → Give it 24h. If the answer holds, trust it.",
    },
  },
  seer: {
    love: {
      zh: "先看再信，信了不轻易收回。→ 别让'还没想清楚'拖延表达。",
      en: "Watch before you move. → Don't let 'not figured out yet' delay what you need to say.",
    },
    work: {
      zh: "看见别人错过的 pattern，诊断强，推动难。→ 找执行力强的搭档。",
      en: "Sees patterns others miss. Stronger at diagnosis than execution. → Find an executing partner.",
    },
    struggle: {
      zh: "低谷时深潜。→ 找能沉默陪你的人，不是一直给建议的。",
      en: "Dive deeper when low. → Find someone who can sit in silence with you.",
    },
    decision: {
      zh: "过度分析，最终跟感觉。→ 先写第一反应，再写理由。第一反应通常对。",
      en: "Over-analyzer, ends with gut. → Write first reaction before reasoning. Usually right.",
    },
  },
  warmth: {
    love: {
      zh: "默默付出型，记对方没说的纪念日。→ 你值得同样的宠爱。说出你想要的。",
      en: "Quiet giver, remembers anniversaries they didn't. → You deserve the same. Say what you want.",
    },
    work: {
      zh: "靠持续性建设，人停就散。→ 开始说'这是我做的'。低调不等于隐形。",
      en: "Build through constancy. Stop = breakdown. → Start saying 'this was me.'",
    },
    struggle: {
      zh: "怕拖累别人，一个人消化。→ 你也可以被接住。找一个你信的人说出来。",
      en: "Hide to not be a burden. → You're allowed to be held too. Pick one person, say it.",
    },
    decision: {
      zh: "感觉先，分析后。→ 信第一反应。别让'别人怎么看'成主要考虑。",
      en: "Feeling first. → Trust first gut. Don't let 'what will they think' lead.",
    },
  },
};

export function buildScenarioBlock(archetype: Archetype, locale: "en" | "zh"): string {
  const t = SCENARIOS[archetype];
  if (locale === "zh") {
    return `感情：${t.love.zh}\n工作：${t.work.zh}\n困境：${t.struggle.zh}\n决策：${t.decision.zh}`;
  }
  return `Love: ${t.love.en}\nWork: ${t.work.en}\nStruggle: ${t.struggle.en}\nDecision: ${t.decision.en}`;
}
