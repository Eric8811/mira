// Turn raw chart data into personality prose the LLM can work with
// WITHOUT ever seeing the underlying star/palace terminology.
// If the model never reads "紫微" or "命宫", it can't leak them back to the user.

import type { Archetype } from "./archetype-map";

type SelfEssence = { en: string; zh: string };

// English essences rewritten for native casual voice: contractions, fillers,
// "the kind of person who...", concrete relatable scenarios, under 50 words.
const SELF_ESSENCE: Record<string, SelfEssence> = {
  紫微: {
    en: "You're the kind of person who just... holds the room together. People don't always notice, but they feel it when you're not there.",
    zh: "你像一座不说话的山。你撑住局面，但不争位置。别人来问你意见，是因为你从不主动给。",
  },
  天府: {
    en: "You're the steady one. When stuff falls apart, people gravitate to you. You carry way more than you let on.",
    zh: "你是稳的那个。一切乱套时别人会靠你。你扛的比你说的多。",
  },
  太阳: {
    en: "You give off this warmth that just fills a room. Generous without trying. But honestly? You forget to refill your own cup.",
    zh: "你有一种把整间屋子点亮的温度。但如果不给自己留几个只属于你的钟头，你会烧空。",
  },
  天同: {
    en: "You're soft in a way that's actually strength. Small things make you happy. People let their guard down around you, and they don't really know why.",
    zh: "你身上有一种不是软弱的温柔。你会留意小小的好。你让人不设防，你自己都不知道为什么。",
  },
  天相: {
    en: "You're the peacemaker. You hold space for everyone — sometimes at your own cost. You're way more tired than you admit.",
    zh: "你是那个让大家舒服下来的人。你给每个人留空间——有时候代价是你自己。你比你愿意承认的要累。",
  },
  天机: {
    en: "Your mind doesn't really stop. You're always running scenarios, even when you look chill. It's kinda exhausting, right?",
    zh: "你脑子停不下来。你总提前两步，有时甚至跑在自己的感受前面。你需要安静，才跟得上自己。",
  },
  太阴: {
    en: "You feel things deep, but most people would never know. You hold a lot inside — not because you're hiding, just because that's how you process.",
    zh: "你是夜里想事情的那种人。进门之前你已经把整间屋子读完了。你的直觉几乎总是对的——但你会反复质疑它。",
  },
  巨门: {
    en: "You say what other people only think. It wins you some people and costs you others. Being misunderstood hurts you way more than you let on.",
    zh: "你说出别人只敢想的话。这让你赢得一些人，也失去一些人。被误解伤你更深，但你不表现出来。",
  },
  廉贞: {
    en: "You look composed, but there's a lot of weather inside. You're drawn to intensity even when it costs you. You know this about yourself.",
    zh: "你是一场安静的风暴。表面平稳，里面在下雨。你被烈度吸引，哪怕代价很大。",
  },
  贪狼: {
    en: "You want MORE — not out of greed, just because boredom genuinely kills something in you. You'd rather chase than settle.",
    zh: "你想要更多——不是贪心，是怕错过生活本身。对你来说无聊就像死亡。",
  },
  破军: {
    en: "You tear down things that aren't working, even your own plans. It freaks people out. But it also saves you every few years.",
    zh: "你会拆掉已经不新鲜的东西，包括你自己的计划。这让别人害怕。也让你每隔几年重新活一次。",
  },
  七杀: {
    en: "You don't do 'good enough.' You'd rather break something and start over than coast in something that's quietly killing you. People close to you know not to suggest you 'just chill.'",
    zh: "你不肯将就。你宁愿走进风暴里，也不愿留在一个慢慢让你窒息的温暖房间里。",
  },
  天梁: {
    en: "You're the friend who shows up. The one people text at 2am. You don't always know what to say, but you stay — and somehow that's enough.",
    zh: "你没等别人开口就已经担起来了。你觉得自己比实际年纪老。你有时候会忘记——你也可以被抱住。",
  },
  武曲: {
    en: "You've earned everything you have. You'd rather be respected than loved — but honestly, you kinda want both. You almost never ask for help.",
    zh: "你是自己挣来一切的那种人。你宁愿被尊重也不愿被爱——但其实两样都想要。你几乎不开口求救。",
  },
};

const ARCHETYPE_LOVE: Record<Archetype, { en: string; zh: string }> = {
  sovereign: {
    en: "In love, you protect rather than announce. You build the safe room, then step back. You remember the small things they don't say out loud.",
    zh: "爱人的时候你是保护型的，不是宣示型。你先把安全的房间搭好，再退一步。你会记住 ta 没说出口的小事。",
  },
  flame: {
    en: "In love, you go all in — or not at all. Lukewarm terrifies you, which is also what's most likely to hurt you. Once you're in, you're loyal to a fault.",
    zh: "爱的时候你要么全给要么不给。不冷不热让你恐惧——但恰恰最伤你的也是不冷不热。你陷进去就是深的，忠诚到自己都吃亏。",
  },
  seer: {
    en: "In love, you watch before you move. You test with small things. Once you trust someone you really trust them — but getting there takes a while.",
    zh: "爱的时候你会先看。用小事试。一旦你信了一个人，就不会轻易收回信任——但到那一步需要时间。",
  },
  warmth: {
    en: "In love, you love steady. You stay. You remember the anniversary they never told you about — you just noticed, and wrote it down.",
    zh: "爱的时候你稳。你会留下来。你记得 ta 没告诉你的纪念日——你只是注意到了，默默记下来。",
  },
};

const ARCHETYPE_WORK: Record<Archetype, { en: string; zh: string }> = {
  sovereign: {
    en: "At work, you carry it without complaining. People assume you want the promotion more than you actually do — you just care that the thing gets done right.",
    zh: "工作里你扛事不抱怨。别人以为你特别想升职——其实你只是在意事情做得对不对。",
  },
  flame: {
    en: "At work, you get bored fast. New problems light you up, maintenance makes you twitchy. You need stakes to feel alive.",
    zh: "工作里你容易无聊。你喜欢新问题，维护性的事让你烦躁。你需要有赌注——新的东西，不是灰色的东西。",
  },
  seer: {
    en: "At work, you see the pattern everyone else missed. You're better at diagnosis than execution — and that gap frustrates you more than you'll admit.",
    zh: "工作里你看得见别人错过的规律。你诊断比执行强，这个差距让你比你愿意承认的更沮丧。",
  },
  warmth: {
    en: "At work, you build stuff through just being there. People don't notice till you stop. Then everything breaks.",
    zh: "工作里你靠持续在做事。别人意识不到直到你停下来——然后一切散掉。表面上你被低估，骨子里你不可或缺。",
  },
};

export type PersonalityProfile = {
  selfEssence: string;
  loveNote: string;
  workNote: string;
};

export function buildPersonalityProfile(
  mainStar: string | undefined,
  archetype: Archetype,
  locale: "en" | "zh",
): PersonalityProfile {
  const essenceMap = mainStar ? SELF_ESSENCE[mainStar] : undefined;
  const selfEssence = essenceMap
    ? essenceMap[locale]
    : ARCHETYPE_LOVE[archetype][locale];

  return {
    selfEssence,
    loveNote: ARCHETYPE_LOVE[archetype][locale],
    workNote: ARCHETYPE_WORK[archetype][locale],
  };
}
