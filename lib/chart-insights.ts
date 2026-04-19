// Deep chart readings surfaced in the Chart Insights tab panel.
// Four archetypes × five tabs × two languages = 40 passages.
// Voice: friend-who-knows-you, no astrology jargon, native tone per locale.

import type { Archetype } from "./archetype-map";

export type InsightTab = "personality" | "love" | "career" | "wellbeing" | "fortune";

type Passage = { zh: string; en: string };

type ArchetypeInsights = Record<InsightTab, Passage>;

export const INSIGHTS: Record<Archetype, ArchetypeInsights> = {
  sovereign: {
    personality: {
      en: "You're the rock. The one people lean on when everything else is spinning — not because you want the job, but because you can't NOT see what's slipping.\n\nYour core:\n· You go quiet before you go loud. Then you just act.\n· You read rooms in two seconds and don't always share what you see.\n· You'd rather be useful than admired.\n\nYour blind spot:\n· You hold so much, you forget you can put some of it down.\n· You say 'I'm fine' when what you mean is 'I'll handle it.'",
      zh: "你是那个'稳定器'——不一定最亮，但是房间里最让人放心的存在。\n\n你的核心：\n· 遇事先静，再动。\n· 你两秒就能读懂一个房间，但不会都说出来。\n· 你宁可被需要，也不一定要被仰望。\n\n你的盲点：\n· 扛得太多，忘了自己也可以放下。\n· 你说'我没事'的时候，其实是在说'我会搞定'。",
    },
    love: {
      en: "You love by building, not announcing. You make the room safe first, then step back. They notice the space you cleared, not the way you cleared it.\n\nYour love pattern:\n· You remember the thing they said they forgot.\n· In fights, you handle their emotion before your own hurt.\n· You'd rather show up than 'talk about it.'\n\nYour risk:\n· You under-ask. They don't know what you need because you haven't told them.\n· One day you'll have carried a lot quietly, and resent it.\n\nWhat helps: say the need out loud. 'I need you to see me right now' isn't weakness. It's the thing.",
      zh: "你爱人是'搭建型'的，不是'宣示型'。你先把安全的房间搭好，对方感觉到的是安心，而不是看到你的过程。\n\n你的爱的模式：\n· ta 说过然后忘了的事，你都记着。\n· 吵架时你先处理 ta 的情绪，自己的委屈往后放。\n· 你宁可用行动表达，不愿'坐下来谈谈'。\n\n你的风险：\n· 你不提要求。ta 不知道你需要什么，因为你没说。\n· 总有一天你默默扛了很多之后，会生气。\n\n解药：说出需要。'我现在需要你看我一下' 不是软弱。就是那个东西。",
    },
    career: {
      en: "At work, you carry things without advertising it. People assume you want the promotion more than you actually do — you just care the job gets done right.\n\nYour work pattern:\n· You'd rather do it well than get credit for it.\n· Chaos makes you calmer, not panicked.\n· You hate performative busy.\n\nYour risk:\n· Your value is invisible by design. You'll be passed over for louder people.\n· You'll keep taking on more because you 'can handle it.'\n\nWhat helps: start saying 'this was me.' Quiet doesn't have to mean invisible. The best leaders you respect made their work seen — they just didn't brag.",
      zh: "工作里你扛事不抱怨。别人以为你特别想升职——其实你只是在意事情做对不对。\n\n你的工作模式：\n· 你宁可把事做好，不一定要抢功劳。\n· 乱起来的时候你更冷静，不慌。\n· 你讨厌那种'假装很忙'的表演式工作。\n\n你的风险：\n· 你的价值天然隐形。声音大的人可能超过你。\n· 你会不停接手更多，因为你'能搞定'。\n\n解药：开始说'这是我做的'。低调不等于隐形。你尊重的那些好 leader，他们让自己的工作被看见——只是不炫耀。",
    },
    wellbeing: {
      en: "You're the kind who doesn't collapse until the job's done. You've been doing 'fine' so long you don't know what not-fine feels like until your body decides for you.\n\nYour signs:\n· Tense jaw, shallow sleep, irritable over small things.\n· You go silent before you go cranky.\n· Long lists of 'things I'll deal with later.'\n\nWhat you need:\n· One hour a day that's not for anyone. Read, walk, do nothing.\n· Stop saving everything for weekends that never arrive.\n· Small maintenance now beats a big breakdown later.\n\nYou're allowed to rest before you've earned it.",
      zh: "你是那种'事情没做完不会倒'的人。'挺好的'说了太久，身体替你下决定的那天，你才知道自己其实早就不好。\n\n你的信号：\n· 咬紧下巴、睡得浅、因为小事烦躁。\n· 你先沉默，再发火。\n· 一堆'以后再处理'的事越攒越多。\n\n你需要的：\n· 每天有一个小时是不为任何人而活的。看书、散步、发呆都行。\n· 别再把所有事都留到永远不来的周末。\n· 现在小修小补，比以后大崩盘划算。\n\n你可以在'挣到'之前就休息。",
    },
    fortune: {
      en: "Right now you're in a quiet sorting phase. Not big drama — more like opening a drawer you've ignored for a year and realizing some of it you don't need anymore.\n\nThe next few months:\n· Something at work will ask you to decide whether to go wider or deeper.\n· A conversation you've been rehearsing will happen — maybe not the way you expect.\n· Your body will ask for more quiet than usual. Give it.\n\nDon't try to be clear everywhere at once. Be clear about ONE thing. The rest will follow you.",
      zh: "你现在在一个安静的'整理期'。不是大动荡，更像是打开一个你一年没动过的抽屉，发现有些东西其实可以扔了。\n\n接下来几个月：\n· 工作上会有一件事问你：是做宽，还是做深？\n· 一个你心里排练过好久的对话会发生——可能不是你预想的样子。\n· 你的身体会比平时更需要安静。给它。\n\n别想在所有事上都清楚。选一件事清楚就好。其它的会跟着你走。",
    },
  },
  flame: {
    personality: {
      en: "You're not wired to coast. If something's off, you'd rather blow it up than pretend. People close to you know better than to tell you to 'just relax.'\n\nYour core:\n· You move toward what scares you. Boredom scares you more.\n· You're loyal, fast, and a bit feral.\n· You can tell in 30 seconds if someone's lying — even when they don't know they are.\n\nYour edge:\n· You burn bridges you'll miss.\n· When you're bored, you invent crises.\n\nWhat makes you calm isn't more rest. It's bigger stakes.",
      zh: "你不肯将就。你宁愿把一件事炸了，也不愿假装它还行。认识你的人都知道别劝你'放轻松'。\n\n你的核心：\n· 你朝让你害怕的方向走。无聊让你更怕。\n· 你忠诚、快、带点野气。\n· 30 秒就能看穿一个人在装——有时候连 ta 自己都不知道 ta 在装。\n\n你的锋芒：\n· 你会烧掉你会想念的桥。\n· 你无聊的时候，会自己制造危机。\n\n让你平静的不是更多休息。是更大的赌注。",
    },
    love: {
      en: "You go all in or not at all. Lukewarm terrifies you — which is also what's most likely to hurt you.\n\nYour love pattern:\n· You can tell their mood from a two-word text.\n· You fall hard, and once in, you're loyal to a fault.\n· You'd rather fight than drift.\n\nYour risk:\n· You test them when you're anxious. They fail. You call it proof.\n· You mistake intensity for intimacy.\n\nWhat helps: someone who can hold your fire without flinching — AND tell you when you're being unfair. You're not easy. But you're worth easy-going for.",
      zh: "你爱就全给，不爱就走。不冷不热让你恐慌——但最容易伤你的也是不冷不热。\n\n你的爱的模式：\n· ta 发两个字的短信，你能读出 ta 今天情绪。\n· 你陷进去就是深的，忠诚到自己都吃亏。\n· 你宁可吵，不愿散。\n\n你的风险：\n· 焦虑的时候你会'试'ta。ta 输了，你当成是证据。\n· 你把烈度当成亲密。\n\n解药：找一个既能接住你的火、又敢告诉你'你这样不公平'的人。你不好相处。但值得别人愿意好相处。",
    },
    career: {
      en: "You get bored fast. New problems light you up, maintenance makes you twitchy. You need stakes to feel alive.\n\nYour work pattern:\n· Greenfield = on. Corporate theater = off.\n· You'll fight a smart fight but walk from a stupid one.\n· You do your best work right before a deadline you could've missed.\n\nYour risk:\n· You mistake 'bored' for 'wrong place.' Sometimes the place is fine; the problem is you haven't asked for the harder job.\n· You quit to solve what a real conversation could fix.\n\nWhat helps: raise stakes before you raise your resume. Ask for the thing that scares you before you leave.",
      zh: "你容易无聊。新问题让你亮，维护性的事让你烦躁。你需要赌注才活着。\n\n你的工作模式：\n· 从零开始 = 上头；官僚表演 = 下头。\n· 值得打的仗你会打；蠢仗你直接走。\n· 最好的东西你都是在 deadline 前一天做出来的。\n\n你的风险：\n· 你把'无聊'误读成'地方不对'。其实地方可能没问题——是你没去要那个更难的活。\n· 你用离职解决一次真实对话就能解决的事。\n\n解药：在更新简历之前，先让赌注更大。离开前去要你真正害怕的那个项目。",
    },
    wellbeing: {
      en: "You burn hot, so you crash hard. Your exhaustion doesn't show up slow — it shows up as 'suddenly I can't do this anymore' at 11pm on a Thursday.\n\nYour signs:\n· Can't sit still, but also can't start anything.\n· Restless urge to 'blow it all up' — job, relationship, routine.\n· You haven't laughed properly in a while.\n\nWhat you need:\n· Move your body hard — running, climbing, lifting. Your mind gets quiet when your body works.\n· Don't make big decisions when you're tired. That 'burn it down' urge is a smoke signal, not a plan.\n· A few people who can take your full voltage. Don't dilute yourself to fit.\n\nYou're not too much. You're finding your size.",
      zh: "你烧得猛，崩也快。你的累不是慢慢来的——它是在周四晚上 11 点突然'我受不了了'的那种。\n\n你的信号：\n· 坐不住，也启动不了。\n· 想把一切'炸掉'——工作、关系、日常。\n· 你很久没真正笑过了。\n\n你需要的：\n· 狠狠动一下身体——跑步、攀岩、举铁。身体在干活的时候脑子会安静。\n· 累的时候别做大决定。那种'一切推翻'的冲动是烟雾弹，不是计划。\n· 几个能接住你满电压的人。别为合群把自己稀释了。\n\n你不是太过。你是在找自己的 size。",
    },
    fortune: {
      en: "Right now, something in you is already halfway out the door. You know it, even if you haven't told anyone.\n\nThe next few months:\n· A choice you've been avoiding will stop being avoidable.\n· Someone will bring you an opportunity that's a little bigger than you feel ready for. Take it anyway.\n· You'll have one really good fight with someone you love. It won't end the relationship — it'll deepen it.\n\nDon't try to calm yourself down. The restlessness is pointing somewhere. Follow it.",
      zh: "你心里有一件事，已经半路走出门了。你自己知道，哪怕你还没告诉任何人。\n\n接下来几个月：\n· 你一直在躲的一个选择，躲不了了。\n· 有人会给你一个比你觉得准备好的稍微大一点的机会。接住它。\n· 你会和一个你爱的人吵一次很好的架。不会把关系吵散——会让它更深。\n\n别试着让自己冷静。这种躁动是在指方向。跟着它走。",
    },
  },
  seer: {
    personality: {
      en: "You see the pattern before other people see the data. You've been told 'you overthink' your whole life — by people who don't notice enough.\n\nYour core:\n· Your first gut read is almost always right.\n· You process by disappearing into yourself for a while.\n· You don't like being comforted. You like being understood.\n\nYour edge:\n· You can think a feeling to death before you ever feel it.\n· 'I'll figure it out when I have more information' is your version of avoidance.\n\nWhat calms you isn't answers. It's space.",
      zh: "你看得见 pattern，别人还在看数据。'你想太多了'——这话说你一辈子的人，是不够敏感的那群。\n\n你的核心：\n· 你第一反应的直觉几乎总是对的。\n· 你通过'消失一会'来消化。\n· 你不喜欢被安慰。你喜欢被理解。\n\n你的锋芒：\n· 你能把一个感受想到死都没真正感受到。\n· '等我信息再多一点我就决定' 是你的逃避方式。\n\n让你平静的不是答案。是空间。",
    },
    love: {
      en: "You watch before you move. You test with small things. Once you trust someone, you really trust them — but getting there takes a while.\n\nYour love pattern:\n· You notice the micro-stuff everyone else misses.\n· You're slow to say 'I love you' but you mean it more than most.\n· You disappear when you're upset instead of fighting.\n\nYour risk:\n· You wait until you're '100% sure' before saying anything. By then the moment has passed.\n· Your silence reads as coldness to people who can't read you yet.\n\nWhat helps: say the 60% thing out loud. Certainty comes from saying, not from thinking.",
      zh: "你先看再信。用小事试。一旦信了一个人，就是真的——但到那一步需要时间。\n\n你的爱的模式：\n· 别人错过的细节你都看得见。\n· 你很久才说'我爱你'，但你说出口比大多数人认真。\n· 你难过的时候会消失，不是吵。\n\n你的风险：\n· 你等到'百分百确定'才开口。到那时候时机已经过了。\n· 你的沉默，在还不懂你的人眼里是冷。\n\n解药：把 60% 的话说出来。确定感来自说出口，不是想。",
    },
    career: {
      en: "You see the pattern everyone else missed. You're better at diagnosis than execution — and that gap frustrates you more than you'll admit.\n\nYour work pattern:\n· You spot the problem three steps before anyone else.\n· You'd rather work alone than with people who 'don't get it.'\n· Your best ideas come in the shower, on a walk, in the middle of the night.\n\nYour risk:\n· You lose steam between 'seeing the move' and 'doing the move.'\n· You undervalue yourself because you didn't 'build' it — you just 'saw' it.\n\nWhat helps: find a high-execution partner. You'll run circles around the room together. Diagnosis isn't less valuable than delivery — you just need the right handoff.",
      zh: "你看得见别人错过的规律。你诊断比执行强，这个差距让你比你愿意承认的更沮丧。\n\n你的工作模式：\n· 问题你提前三步就看到了。\n· 你宁可一个人干，也不愿意和'不懂'的人合作。\n· 你最好的想法都发生在洗澡、散步、半夜。\n\n你的风险：\n· '看到'和'做'之间你会泄气。\n· 你低估自己，因为你'没有动手造'——你只是'看见'了。\n\n解药：找一个执行力强的搭档。你们俩一起会在房间里转圈子。诊断不比交付便宜——你只是需要对的交接。",
    },
    wellbeing: {
      en: "Your mind doesn't rest when your body does. You can lie in bed 'tired' and still be running simulations at 2am.\n\nYour signs:\n· Circular thoughts that won't land.\n· Physical tension disguised as 'just my usual.'\n· You withdraw before you even know why.\n\nWhat you need:\n· Write your thoughts down, even messy ones. Paper is slower than your brain, and that's the point.\n· Physical contact — a walk with someone, a hug — shortcuts the spiral more than a logic session.\n· Your intuition is usually right. Trust it faster; you'll spend less energy negotiating with yourself.\n\nYou're not broken, you're just always tuned in. Sometimes you need to turn the volume down.",
      zh: "你的脑子不在你身体休息的时候休息。你可以躺在床上'累'的同时，凌晨 2 点还在脑内跑模拟。\n\n你的信号：\n· 想事情绕圈，落不了地。\n· 身体紧绷被你当成'正常'。\n· 你还没想清楚为什么就先退了。\n\n你需要的：\n· 把想法写下来，乱的也写。纸比脑子慢——这就是重点。\n· 身体接触——和人散散步、一个拥抱——比自己讲道理更能把漩涡打断。\n· 你的直觉通常是对的。信它快一点，你就不用花那么多力气和自己谈判。\n\n你没坏，你只是一直接着信号。有时候你需要把音量调小。",
    },
    fortune: {
      en: "Right now you're not stuck, you're incubating. There's a decision you've been circling — you already know the answer, you're just not ready to say it yet.\n\nThe next few months:\n· Something you've been working out alone will start feeling clearer when you tell one specific person.\n· A pattern from your twenties (or teens) will come back in a new costume. Recognize it.\n· The quiet urge to 'simplify' is real. Listen to it.\n\nStop waiting for more information. You have enough. The next step is saying it out loud.",
      zh: "你现在不是卡住，是在孵化。有一个决定你一直在绕——你其实已经知道答案了，只是还没准备好说出来。\n\n接下来几个月：\n· 你一直自己想的一件事，会在你告诉一个'对的人'的时候变清楚。\n· 二十岁（或更早）的一个模式会换个面孔回来。认出它。\n· '想简化'这种安静的冲动是真的。听它。\n\n别再等更多信息。你已经够了。下一步是把它说出来。",
    },
  },
  warmth: {
    personality: {
      en: "You're the friend who shows up. The one people text at 2am. You don't always know what to say but you stay — and somehow that's enough.\n\nYour core:\n· You notice what other people are pretending not to feel.\n· You remember birthdays, preferences, little throwaway sentences.\n· You'd rather be warm than impressive.\n\nYour edge:\n· You give so much that when you finally need something, people don't recognize it.\n· 'It's fine' is your entire conflict-resolution vocabulary.\n\nWhat you forget: you're allowed to be held too.",
      zh: "你是那个会出现的朋友。凌晨两点有人会给你发消息的那种。你不一定知道说什么，但你留下——莫名其妙，这就够了。\n\n你的核心：\n· 别人假装没感受的东西，你都看到了。\n· 你记得生日、喜好、随口说过的话。\n· 你宁可温暖，不一定要厉害。\n\n你的锋芒：\n· 你给得太多，等你真的需要什么的时候别人认不出来。\n· '没事'是你冲突处理的全部词汇。\n\n你忘了：你也可以被抱住。",
    },
    love: {
      en: "You love steady. You stay. You remember the anniversary they never told you about — you just noticed.\n\nYour love pattern:\n· You show up more than you ask.\n· You apologize first, even when it's not your fault, just to keep the peace.\n· You carry the emotional memory of the whole relationship.\n\nYour risk:\n· You'll love someone who's taking more than they're giving for a long time before you admit it.\n· You'll call self-abandonment 'patience.'\n\nWhat helps: you deserve someone who loves you the way you love them. That's not 'high standards.' That's math.",
      zh: "你爱得稳。你留下。你记得 ta 没告诉你的纪念日——你就是注意到了。\n\n你的爱的模式：\n· 你出现的次数比你开口要的次数多。\n· 不是你错你也先道歉，就为了息事宁人。\n· 整段关系的情绪记忆都在你身上。\n\n你的风险：\n· 有人索取比付出多，你会爱很久才肯承认。\n· 你会把'放弃自己'叫做'耐心'。\n\n解药：你值得一个像你爱 ta 那样爱你的人。这不是'标准高'。这是数学。",
    },
    career: {
      en: "You build through constancy. People don't notice till you stop — then everything breaks. You're underrated on the surface, essential underneath.\n\nYour work pattern:\n· You keep the team together without being told to.\n· You smooth over conflicts before they become conflicts.\n· The stuff you do takes 10 years to become obvious.\n\nYour risk:\n· You get passed over for louder, newer people.\n· You don't take credit even when you should.\n\nWhat helps: start saying 'this was me.' Quiet doesn't have to mean invisible. The work you've been doing is load-bearing — start letting people see it.",
      zh: "你靠持续在做事。别人注意不到，直到你停下来——然后一切散掉。表面上你被低估，骨子里你不可或缺。\n\n你的工作模式：\n· 没人让你做，你也把团队维系住了。\n· 你把矛盾在它变成矛盾之前就抹平了。\n· 你做的事要十年才变得明显。\n\n你的风险：\n· 你会被声音大、更新鲜的人超过。\n· 本该属于你的 credit 你也不要。\n\n解药：开始说'这是我做的'。低调不等于隐形。你一直做的事是承重的——让人看见它。",
    },
    wellbeing: {
      en: "You give first and check yourself later. Your 'bad day' radar is fine-tuned for other people — not you.\n\nYour signs:\n· You're tired but can't explain why.\n· You want to be alone, but also don't.\n· You find yourself crying at random small things.\n\nWhat you need:\n· Schedule care before you need it, not after.\n· Tell one person the real answer when they ask 'how are you?'\n· Your body is asking for slowness, not more effort.\n\nYou don't have to earn rest. It's already yours.",
      zh: "你先给别人，再检查自己。别人今天不好你一眼看出来——你自己的你反而看不见。\n\n你的信号：\n· 你累，但说不清楚为什么。\n· 你想一个人，但又不想。\n· 一些很小的事会让你突然想哭。\n\n你需要的：\n· 把'照顾自己'放进日程，别等崩了。\n· 下次有人问'你怎么样'，跟一个人说真话。\n· 你的身体要的不是更多努力，是慢下来。\n\n你不用'挣'休息。它本来就是你的。",
    },
    fortune: {
      en: "Right now there's something in you asking to be held. Not fixed. Held.\n\nThe next few months:\n· Someone will ask for more from you. Before you say yes, check whether you're saying it out of love or out of habit.\n· An old kindness you did for someone comes back — maybe as a call, maybe as a coincidence.\n· You'll feel a small urge to 'own' something that's yours — a space, a habit, a boundary. Follow it.\n\nThe year's not asking you to give more. It's asking you to receive.",
      zh: "你现在身上有一样东西在请求被抱住。不是被修好。被抱住。\n\n接下来几个月：\n· 有人会对你提更多要求。你答应之前，先检查：你是出于爱在答应，还是出于习惯？\n· 你过去对某人的好会回来——可能是一通电话，可能是一个巧合。\n· 你会有一种微小的冲动，想'拥有'一件属于你的事——一个空间、一个习惯、一个界限。跟着它走。\n\n今年不是要你给更多。是要你接住。",
    },
  },
};
