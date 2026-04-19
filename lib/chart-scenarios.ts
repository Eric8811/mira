// Scene-specific archetype scripts. Used by buildRealtimeInstructions to ground
// Mira's responses when the user raises love / work / struggle / decision topics.
// Compact on purpose — inline in system prompt.

import type { Archetype } from "./archetype-map";

export type Topic = "love" | "work" | "struggle" | "decision";

type SceneTemplate = { zh: string; en: string };

export const SCENARIOS: Record<Archetype, Record<Topic, SceneTemplate>> = {
  sovereign: {
    love: {
      zh: "关系里的'撑伞人'：对喜欢的人默默做事不言语；吵架先处理对方情绪自己委屈往后放。方向：允许被照顾，别用'我没事'掩盖累。",
      en: "The umbrella-holder: you do things for them silently, never announce. In fights you handle their feelings first, your hurt later. Nudge: let yourself be taken care of. Stop hiding behind 'I'm fine.'",
    },
    work: {
      zh: "职场定海神针：扛事不抱怨；别人以为你特别想升职其实你只在意事情做对。方向：学会说你的需要，别等被看见。",
      en: "The anchor at work: you carry it without complaining. People think you want the promotion — you just want the thing done right. Nudge: say what you need. Don't wait to be noticed.",
    },
    struggle: {
      zh: "低谷时是'沉默的山'：不抱怨，自己撑，撑到临爆才让人看见。方向：找一个不用强撑的安全角落，哪怕只有 30 分钟。",
      en: "In a low point you're the quiet mountain: no complaints, just holding it till you nearly crack. Nudge: find one corner where you don't have to be strong. Even thirty minutes counts.",
    },
    decision: {
      zh: "决策慢但决定了深扎：会反复权衡，一旦定就不回头。方向：别让'应该'压过'我想'，最难说出口的那个答案通常是真的。",
      en: "You decide slow but stick deep: you weigh every angle, then don't look back. Nudge: don't let 'should' drown out 'I want.' The answer you can't bring yourself to say is usually the real one.",
    },
  },
  flame: {
    love: {
      zh: "爱就全给，不爱就走：陷进去就深，不冷不热让你恐慌。方向：找一个能接住你烈度的人，别降温去将就。",
      en: "All in or gone: when you fall, it's deep. Lukewarm terrifies you. Nudge: find someone who can take your intensity. Don't dial yourself down to fit.",
    },
    work: {
      zh: "职场破局者：恨低效会议和官腔；被低估直接走人；感兴趣的项目 all in。方向：别用跳槽解决所有不满，有时只是一次真实对话的问题。",
      en: "The one who breaks the mold: you hate useless meetings and corporate theater. Undervalued? You leave, no drama. Nudge: don't quit to solve what a real conversation could fix.",
    },
    struggle: {
      zh: "低谷时想破坏点什么：一个人消失几天，想重启一切。方向：先别动大决定。这种'推翻一切'的冲动是烟雾弹，72 小时后再说。",
      en: "When you're down you want to burn it all: you vanish for days, want to reset everything. Nudge: make no big decisions now. That 'burn it down' urge is a smokescreen — wait 72 hours.",
    },
    decision: {
      zh: "凭感觉 + 冲动：心动就去做，厌恶感来得快。方向：给自己 24 小时冷静期。如果那时还是同一个答案，相信它。",
      en: "Gut-first, fast to pivot: if it lights you up you move; if it bores you you bolt. Nudge: give it 24 hours. If the answer holds, trust it.",
    },
  },
  seer: {
    love: {
      zh: "先看再信型：会观察很久才靠近；一旦信了不轻易收回。方向：别让'还没想清楚'拖延表达。有些话说出来才清晰。",
      en: "Watch before you move: you observe for a long time, but once you trust, you don't un-trust. Nudge: stop letting 'I haven't figured it out' delay you. Some things only become clear once spoken.",
    },
    work: {
      zh: "看见别人错过的 pattern：诊断比执行强；看得见但推不动会很沮丧。方向：找一个执行力强的搭档。你的价值在'看对'，不在自己做。",
      en: "You see the pattern everyone else missed: diagnosis over execution. Seeing-but-can't-move frustrates you. Nudge: find a partner with real traction. Your value is reading it right, not doing it all.",
    },
    struggle: {
      zh: "低谷时深潜：不喜欢被安慰，更讨厌'加油'；一个人消化几天。方向：找能沉默陪你的人，不是一直给建议的。记下你的想法，直觉通常对。",
      en: "You dive deeper when low: you don't want comfort, you hate 'cheer up.' You disappear into yourself for days. Nudge: find someone who can sit in silence with you. Write down your thoughts — your gut is usually right.",
    },
    decision: {
      zh: "过度分析型：会列 10 个维度，最后还是跟感觉走。方向：先写下第一反应，再写所有理性理由。第一反应 80% 是对的。",
      en: "You over-analyze: ten factors on a grid, and then you still go with your gut. Nudge: write down your first reaction before any of the reasoning. Eight times out of ten it's right.",
    },
  },
  warmth: {
    love: {
      zh: "默默付出型：记得对方没说的纪念日；吵架后先道歉的那个。方向：你值得同样被宠。说出你想要什么，不要等 ta 猜。",
      en: "Quiet giver: you remember anniversaries they never told you. You're the one who apologizes first. Nudge: you deserve the same care you give. Say what you want. Don't wait for them to guess.",
    },
    work: {
      zh: "靠持续性建设：你在做事别人没注意，你一停全散。低调但不可或缺。方向：开始说'这是我做的'。低调不等于不出声。",
      en: "You build through constancy: people don't notice till you stop. Then everything breaks. You're underrated on the surface, essential underneath. Nudge: start saying 'this was me.' Quiet doesn't have to mean invisible.",
    },
    struggle: {
      zh: "低谷时怕拖累别人：假装没事，一个人消化，怕成为负担。方向：你也可以被接住。找一个你信的人，把那件事说出来。",
      en: "You hide to not be a burden: pretend you're fine, process alone, terrified of weighing on anyone. Nudge: you're allowed to be held too. Pick one person you trust. Say the thing out loud.",
    },
    decision: {
      zh: "先感受再分析：理性知道 A 更好心里偏向 B；最后跟感觉。方向：信第一反应。别让'别人会怎么看' 成主要考虑。",
      en: "Feeling first, analysis second: you know A is 'better' but your heart leans B. You go with feeling. Nudge: trust your first gut. Don't let 'what will they think' become the main vote.",
    },
  },
};

export function buildScenarioBlock(archetype: Archetype, locale: "en" | "zh"): string {
  const t = SCENARIOS[archetype];
  if (locale === "zh") {
    return `感情场景：${t.love.zh}
工作场景：${t.work.zh}
困境场景：${t.struggle.zh}
决策场景：${t.decision.zh}`;
  }
  return `Love scenes: ${t.love.en}
Work scenes: ${t.work.en}
Struggle scenes: ${t.struggle.en}
Decision scenes: ${t.decision.en}`;
}
