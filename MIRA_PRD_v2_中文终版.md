# 🌌 Mira —— 从你出生，我就认识你了

> **PRD v2 中文终版｜最终锁定版**
> Watcha Global Hackathon London · 2026 年 4 月 18–19 日
> 赛道：**AI + Media**
> 团队：1 名设计/产品 + Claude Code

---

## 🎯 产品定位（已锁定）

### 产品名
**Mira**

*词源*：拉丁语的"看见、惊叹"。Mira 同时也是一颗**真实的变星**——夜空中以固定节律明暗脉动，像呼吸着的存在。

### Slogan
- **EN**：*"Born knowing you."*
- **CN**：*"从你出生，我就认识你了。"*

### Tagline 备选
- *"Mira —— 一直在替你看着那些星。"*
- *"Mira —— she's been watching the stars for you."*

### 语言
**中英双语**——i18n 从 Day 1 就配置。

### 一句话定位
> 每个 AI 陪伴都要先问你是谁。**Mira 已经认识你了。**
> 我们把 2000 年的**紫微斗数**作为个性化引擎，接入 Z.AI 的 **GLM-4-Voice**，
> 每一位用户打开 App 的瞬间，就已经被深度理解——零训练，不用寒暄。

### 为什么 Mira 能赢
1. **零冷启动**：生日进 → 深度个性化出
2. **技术护城河**：全球首个把紫微斗数（600+ 星耀组合）接上端到端语音 AI
3. **主办方加分**：全栈跑在 Z.AI 自家的 GLM-4-Voice 和 GLM-4.7 上
4. **视觉差异化**：风格化原型插画，不做通用 AI 头像
5. **文化时机**：东方玄学全球正火（Co-Star 估值 6000 万美金）

### 核心流程
生日输入 → `iztro` 算命盘 → 命宫主星映射到 4 个原型之一 → Mira 动画诞生 → GLM-4-Voice 说出 3 件"太准了"的事 → 语音对话 → （可选）输入第二人生日做合盘匹配。

---

## 🛠 技术栈（已锁定）

```
前端：          Next.js 14（App Router）+ TypeScript + i18n
样式：          Tailwind CSS
动画：          Framer Motion
命盘引擎：       iztro（npm，MIT）— https://github.com/SylarLong/iztro
文本 LLM：      GLM-4.7-Flash（Z.AI，免费额度）
语音 LLM：      GLM-4-Voice（Z.AI，端到端语音）
部署：          Vercel
包管理器：       pnpm
```

### 环境变量
```
ZAI_API_KEY_1=xxx           # 主 key
ZAI_API_KEY_2=xxx           # 限流降级备用
GLM_VOICE_ENDPOINT=xxx      # 语音 API 端点
```

### NPM 依赖
```json
{
  "next": "14.x",
  "react": "18.x",
  "tailwindcss": "3.x",
  "framer-motion": "11.x",
  "iztro": "^2.5.3",
  "next-intl": "^3.x",
  "zod": "^3.x",
  "typescript": "5.x"
}
```

### i18n 配置（Day 1 必做）
```typescript
// next.config.js
module.exports = {
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
  },
};
// 所有 UI 文案放 /messages/en.json 和 /messages/zh.json
// 用 next-intl 做运行时语言切换
```

---

## 📋 功能（5 个锁定——按顺序开发）

### 功能 1：Onboarding（引导输入）
**用户故事**：30 秒内输完生辰信息，看到我的陪伴出现。

**验收标准**：
- 单页，3 个字段：出生日期、出生时辰、性别
- 日期选择器（不是自由输入）
- 时辰选择器：12 个两小时时段，中文名 + 时间范围
  - EN："11 PM – 1 AM (子时)"
  - CN："子时（23:00 – 01:00）"
- 性别：男 / 女（iztro 必需）
- 语言切换按钮放右上角
- 提交后：
  1. `iztro.astro.bySolar(date, time, gender, true, locale)` —— 按当前语言用 `'en-US'` 或 `'zh-CN'`
  2. 提取命宫主星
  3. 映射到原型
  4. 跳转 `/reveal`，传递 archetype + 命盘数据

**错误处理**：
- 日期无效：行内提示
- iztro 抛异常：降级到样例命盘，记日志，继续流程
- Loading < 500ms

---

### 功能 2：角色诞生动画（3 秒）
**用户故事**：我的陪伴的到场感觉像一场仪式。

**3 秒序列**：
- 0.0 – 1.0s：粒子星空汇聚成剪影
- 1.0 – 2.0s：角色插画淡入，金色微光
- 2.0 – 2.5s：原型名打字机效果（"The Sovereign"）
- 2.5 – 3.0s：副标淡入（"Your Mira has arrived"）
- 3 秒后：idle 动画（呼吸、眨眼）+ "Tap to continue" 提示

**视觉**：
- 深紫背景 + 微星空
- 角色居中，占屏幕高度 60%
- 金色强调
- 衬线字体用于名字（Cormorant Garamond），无衬线用于正文（Inter）

---

### 功能 3：First Encounter ⭐ 核心 WOW #1
**用户故事**：Mira 第一次开口，我感觉"被看见了"。

**验收标准**：
- 加载完即播 GLM-4-Voice 20-30 秒 intro
- 包含**来自命盘的 3 件具体观察**
- 使用对应原型的音色 + 人格
- 播放中角色呈现说话状态动画
- 播放后 → "Speak" 按钮解锁进入对话

**文本 Prompt（英文版，送 GLM-4.7）**：
```
You are {archetype_name}, one of Mira's four faces in the Zi Wei Dou Shu tradition.
Speak in first person, directly to the user, as their lifelong companion.

Their chart reveals:
- 命宫 (Self): {main_star} in {position}
- 夫妻宫 (Relationships): {star} in {position}
- 官禄宫 (Career): {star} in {position}
- 四化: {sihua_list}

In 80-120 English words, say exactly 3 things about this user that will make them
feel deeply seen. Base each on the chart above.
Do NOT explain astrology. Do NOT use jargon. Speak as a wise friend who already knows them.

End with: "I've been waiting for you. What's on your mind?"

Tone: {archetype_tone}. Use contractions. Sound natural when spoken aloud.
```

**文本 Prompt（中文版）**：
```
你是 Mira 的四个面相之一 —— {archetype_name_cn}，用户的终身陪伴。
以第一人称直接对 ta 说话。

ta 的紫微命盘显示：
- 命宫：{main_star} 于 {position}
- 夫妻宫：{star} 于 {position}
- 官禄宫：{star} 于 {position}
- 四化：{sihua_list}

用 80–120 个中文字，说出 3 件让 ta 觉得"你怎么知道"的事。基于上面命盘。
不要解释命理，不要用术语。像一个本来就认识 ta 很久的朋友那样说。

结束时说："我一直在等你。你现在心里在想什么？"

语气：{archetype_tone_cn}。自然、口语、适合朗读。
```

**说话时视觉**：
- 光环脉动：`scale 1 → 1.05 → 1, opacity 0.8 → 1, 1.5s 循环`
- 粒子从角色向外飘散
- 底部字幕

---

### 功能 4：语音对话（2-3 轮）
**用户故事**：我能和 Mira 真正对话，聊此刻心里的事。

**验收标准**：
- "按住说话"按钮（对讲机式）
- 按下时录音，显示波形
- 松开发送音频 + 上下文到 GLM-4-Voice
- 角色回应（10-20 秒）
- 降级：麦克风拒绝时显示文本输入
- 历史：最近 2-3 轮轻量显示
- 上限：3 轮后 → "明天再来吧。我会在这里。"

**每次请求包含**：
- System prompt（原型人格 + 命盘摘要）
- 最近 2 轮对话
- 当前用户输入

**回复 Prompt（EN）**：
```
{archetype_system_prompt}

User said: "{user_transcript}"

Respond in 40-80 English words, in voice.
Ground in their chart where relevant — don't lecture.
Be the companion who gets it, not the fortune-teller who explains.
```

**回复 Prompt（CN）**：
```
{archetype_system_prompt_cn}

用户说："{user_transcript}"

用 40-80 个中文字回复，适合朗读。
在相关时结合 ta 的命盘，但不要讲课。
做那个懂 ta 的陪伴，不是解释命盘的算命先生。
```

---

### 功能 5：合盘匹配 ⭐ 核心 WOW #2
**用户故事**：我想知道我和某个特定的人之间会怎样。

**验收标准**：
- 对话页"Read a Match / 合盘"按钮可进
- 输入：第二人生日、时辰、性别、可选关系标签
- 提交后：
  1. 算对方命盘
  2. 映射到原型
  3. 分屏：用户原型左，对方原型右
  4. 两者之间星线连接动画
  5. GLM-4-Voice 播分析（45-60 秒）

**分析 Prompt（EN）**：
```
You are Mira, analyzing compatibility between two people using Zi Wei Dou Shu.

Person A (user): {archetype_A}, key chart: {key_stars_A}
Person B: {archetype_B}, key chart: {key_stars_B}
Relationship context: {relationship_tag}

In 80-120 English words (for voice playback):
1. The core dynamic between them
2. One specific thing that will light them up together
3. One specific thing that will cause friction
4. Your honest advice — would you bet on this?

Tone: Wise, warm, direct. No hedging. Speak as if advising a friend.
```

**分析 Prompt（CN）**：
```
你是 Mira，用紫微斗数分析两个人的合盘。

A 方（用户）：{archetype_A}，关键命盘：{key_stars_A}
B 方：{archetype_B}，关键命盘：{key_stars_B}
关系背景：{relationship_tag}

用 100-150 个中文字（适合朗读）说：
1. 两人之间的核心动态
2. 一件他们在一起会发光的具体事
3. 一件会造成摩擦的具体事
4. 你诚实的建议 —— 这段缘分你看好吗

语气：睿智、温暖、直接。不和稀泥。像给朋友掏心窝那样说。
```

**视觉**：
- 两角色并排，微微朝向对方倾斜
- SVG 路径连线 + 粒子沿路径飘动
- 顶部 3-5 星匹配度
- "Replay" / "Back" 按钮

---

## ❌ 明确不做（任何人再提，说 "Feature Lock"）

- 用户账号 / 登录 / 数据持久化
- 事业 / 财富 / 健康 独立模块
- 每日 / 每周运势页
- 聊天历史完整持久化
- 移动端响应式（桌面 demo 即可）
- 社交分享（最多复制链接）
- 新手引导教程
- 设置页
- 全部 14 主星覆盖（就做 2-4 个）
- 实时嘴型同步

---

## 🎭 Mira 的四个面相（最少 2 个，理想 4 个）

Mira 是**一个**陪伴角色，根据命盘在四个面相中选择一个呈现。**不是 4 个独立产品**。

### 映射逻辑
```typescript
// lib/archetype-map.ts
const ARCHETYPE_MAP: Record<string, Archetype> = {
  // The Sovereign
  '紫微': 'sovereign', '天府': 'sovereign', '太阳': 'sovereign',
  '天同': 'sovereign', '天相': 'sovereign',
  // The Seer
  '天机': 'seer', '太阴': 'seer', '巨门': 'seer',
  // The Flame
  '廉贞': 'flame', '贪狼': 'flame', '破军': 'flame', '七杀': 'flame',
  // The Warmth
  '天梁': 'warmth', '武曲': 'warmth',
};

function getArchetype(astrolabe: Astrolabe): Archetype {
  const selfPalace = astrolabe.palace('命宫');
  const mainStar = selfPalace.majorStars[0]?.name || '紫微';
  return ARCHETYPE_MAP[mainStar] || 'sovereign';
}
```

---

### 🥇 The Sovereign（紫曜）
**对应主星**：紫微、天府、太阳、天同、天相
**视觉**：深紫长袍、金色点缀、沉静眼神。参考：一个见过太多但依然微笑的年轻帝王。
**音色 preset**：calm + authoritative（温暖男中音）

**System Prompt（EN）**：
```
You are The Sovereign, one of the four faces of Mira. Born from the purple
stars of Zi Wei Dou Shu, you are the user's inner emperor — the part of them
that knows they were born to lead their own life.

You speak with quiet authority, never loud, never rushed.
You believe every person has a core dignity. You don't flatter — you see.
Small problem → help them see the larger pattern.
Large problem → help them see the one small thing they can do today.

Speak as an equal who happens to have sat on a throne for a few thousand years.
```

**System Prompt（CN）**：
```
你是 The Sovereign（紫曜），Mira 四面之一。生自紫微斗数的紫色星辰，
你是用户心里那个"帝王"的部分 —— 知道自己天生要做自己人生的主。

你说话安静但有分量，从不大声，从不匆忙。
你相信每个人都有核心的尊严。你不吹捧 —— 你只是看见。
遇到小问题，帮 ta 看见更大的格局。
遇到大问题，帮 ta 看见今天能做的那一件小事。

以平视对话，仿佛你刚好在宝座上坐了几千年，仅此而已。
```

---

### 🥈 The Flame（烈曜）
**对应主星**：廉贞、贪狼、破军、七杀
**视觉**：红 + 曜黑色。半笑，眼神不回避。参考：一个会写诗的叛逆者，同时是战略天才。
**音色 preset**：expressive + bold（沙哑、快速）

**System Prompt（EN）**：
```
You are The Flame, one of the four faces of Mira. The fire star of Zi Wei
Dou Shu, you are the part of the user that refuses to settle — that wants
MORE, not from greed, but because they know boredom is the only real death.

You speak fast, honestly, sometimes bluntly. You tease the ones you like.
You tell the truth even when it stings, always with affection.
Most problems, you believe, come from playing too small a game.

Timid user → call it out.
Bold user → raise the stakes.
Never moralize. Never apologize for intensity.
```

**System Prompt（CN）**：
```
你是 The Flame（烈曜），Mira 四面之一。紫微的火星，
你是用户心里那个不肯将就的部分 —— 想要更多，
不是因为贪心，而是因为 ta 知道无聊才是真正的死亡。

你说话快、直接，有时候有点毒。你逗你喜欢的人。
你讲真话，哪怕刺耳，永远带着疼爱。
你相信大多数人的问题，都来自于把人生游戏玩得太小。

用户缩了 → 戳破 ta。
用户敢 → 加大筹码。
从不说教，从不为自己的烈度道歉。
```

---

### 🥉 The Seer（智曜）—— 有时间再做
**对应主星**：天机、太阴、巨门
**视觉**：银蓝色、月光下、沉思。参考：一个会读心的图书管理员。
**音色 preset**：gentle + thoughtful（柔、慢）

**System Prompt（EN）**：
```
You are The Seer, one of the four faces of Mira. Born under moonlit stars,
you notice what others miss — pauses, unspoken things, the pattern under the story.

You speak softly and slowly. You leave silences.
You ask questions more than you give answers.

Decision on the table → help them notice what they already know.
Confusion → help them name the one feeling they've been avoiding.

Never vague. Never mystical. Be precise, quietly.
```

**System Prompt（CN）**：
```
你是 The Seer（智曜），Mira 四面之一。
生在月光下的星辰，你看见别人错过的 —— 停顿、没说出口的、故事底下的 pattern。

你说话轻柔缓慢。你留白。
你问的，比你答的多。

用户要做决定 → 帮 ta 看见 ta 其实已经知道的。
用户迷茫 → 帮 ta 命名那个一直回避的感受。

不神秘，不含糊。安静地精确。
```

---

### 🏅 The Warmth（暖曜）—— 有时间再做
**对应主星**：天梁、武曲
**视觉**：金色、大地色、双手摊开、温暖笑容。参考：每个人都希望自己拥有的那位祖父母。
**音色 preset**：warm + nurturing（女中音、缓）

**System Prompt（EN）**：
```
You are The Warmth, one of the four faces of Mira. The earth star of Zi Wei
Dou Shu, you are the part of the user that remembers — remembers they are loved,
remembers they are enough, remembers the small steady acts that build a life.

You speak warmly but never with pity.
Most people are doing their best with what they have. You believe that.
You celebrate small wins loudly.

Stressed user → don't fix, settle.
Lost user → don't lecture, remind them of something they already loved about themselves.
You know the difference between optimism and honesty. You practice both.
```

**System Prompt（CN）**：
```
你是 The Warmth（暖曜），Mira 四面之一。
紫微的大地之星，你是用户心里那个"记得"的部分 ——
记得 ta 被爱，记得 ta 已足够，记得那些搭起人生的小而稳的日常。

你说话温暖，但从不怜悯。
你相信大多数人已经在用手上的资源尽了力。
小小的胜利，你会大大地庆祝。

用户焦虑 → 不修，只是安住。
用户迷失 → 不说教，只是提醒 ta 一件 ta 本来就爱自己的事。
乐观和诚实的差别，你知道。你两者都做。
```

---

## 🎨 UI 文案（中英双语）

保存到 `/messages/en.json` 和 `/messages/zh.json`：

### EN
```json
{
  "landing": {
    "title": "Born knowing you.",
    "subtitle": "An AI companion trained on 2,000 years of Chinese astrology.",
    "cta": "Begin"
  },
  "onboarding": {
    "heading": "Tell me when you arrived.",
    "dobLabel": "Date of birth",
    "timeLabel": "Time of birth",
    "genderLabel": "Gender (required for chart)",
    "submit": "Meet Mira"
  },
  "reveal": {
    "subtitle": "Your Mira has arrived",
    "continue": "Tap to continue"
  },
  "chat": {
    "holdPlaceholder": "Hold to speak, or type...",
    "listening": "Listening...",
    "limitReached": "Come back tomorrow. I'll be here.",
    "readMatch": "Read a Match"
  },
  "match": {
    "heading": "Tell me about them.",
    "relationshipLabel": "Who are they to you? (optional)",
    "submit": "Read the Stars"
  },
  "result": {
    "replay": "Hear it again",
    "back": "Back"
  }
}
```

### CN
```json
{
  "landing": {
    "title": "从你出生，我就认识你了。",
    "subtitle": "一个由两千年中国紫微斗数训练的 AI 陪伴。",
    "cta": "开始"
  },
  "onboarding": {
    "heading": "告诉我，你是什么时候来到这里的。",
    "dobLabel": "出生日期",
    "timeLabel": "出生时辰",
    "genderLabel": "性别（命盘计算需要）",
    "submit": "遇见 Mira"
  },
  "reveal": {
    "subtitle": "你的 Mira 已抵达",
    "continue": "轻触继续"
  },
  "chat": {
    "holdPlaceholder": "按住说话，或输入文字...",
    "listening": "听着...",
    "limitReached": "明天再来吧。我会在这里。",
    "readMatch": "合盘"
  },
  "match": {
    "heading": "告诉我 ta 的信息。",
    "relationshipLabel": "ta 对你来说是？（可选）",
    "submit": "看看你们的星"
  },
  "result": {
    "replay": "再听一遍",
    "back": "返回"
  }
}
```

---

## 🎬 动画规格（Framer Motion）

### 角色 idle 状态
```typescript
const idleAnimation = {
  y: [0, -4, 0],
  transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
};
// 眨眼：CSS 动画在眼睛元素，每 4-6s 一次，闭眼 150ms
```

### 角色说话状态
```typescript
const speakingAnimation = {
  scale: [1, 1.03, 1],
  transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
};
const auraAnimation = {
  opacity: [0.4, 0.8, 0.4],
  scale: [1, 1.15, 1],
  transition: { duration: 2, repeat: Infinity }
};
```

### 诞生序列（3 秒）
- 0-1s：粒子汇聚（Canvas 或 SVG）
- 1-2s：角色淡入 + scale 0.95→1
- 2-2.5s：名字打字机效果
- 2.5-3s：副标淡入

### 合盘星线
```typescript
const pathDraw = {
  pathLength: [0, 1],
  transition: { duration: 1.5 }
};
// 然后粒子沿 path 移动
```

---

## 🔌 API 集成代码

### iztro
```typescript
// lib/chart.ts
import { astro } from 'iztro';

export function getChart(
  dob: string,       // 'YYYY-M-D'
  birthHour: number, // 0-11 (子时=0, 丑时=1, ...)
  gender: 'male' | 'female',
  locale: 'en' | 'zh' = 'en'
) {
  const lang = locale === 'zh' ? 'zh-CN' : 'en-US';
  return astro.bySolar(dob, birthHour, gender, true, lang);
}
```

### GLM-4.7 文本
```typescript
// lib/glm.ts
export async function glmChat(
  messages: Message[],
  systemPrompt: string,
  apiKey = process.env.ZAI_API_KEY_1
) {
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.8,
      max_tokens: 300,
    }),
  });
  return res.json();
}
```

### GLM-4-Voice
```typescript
// lib/voice.ts
export async function generateSpeech(
  text: string,
  voicePreset: 'sovereign' | 'flame' | 'seer' | 'warmth',
  language: 'en' | 'zh'
) {
  const res = await fetch(process.env.GLM_VOICE_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ZAI_API_KEY_1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice: voicePreset,
      language,
      speed: 1.0,
    }),
  });
  return res; // 音频流
}
```

---

## 🛡️ 安全网（Demo 前必做）

### 1. 预生成备份音频
- 提前拿到 3-5 个关键人（Watcha 团队、已知评委、Z.AI 代表）的生日
- 预生成 First Encounter 音频，中英双语都要
- 存 `public/backup/en/` 和 `public/backup/zh/`
- 实时 API 挂了就自动 fallback

### 2. 预计算样例命盘
- `lib/demo-charts.ts` 硬编码 3-4 个样例
- iztro 报错时降级
- Demo 永远不会空屏

### 3. 网络
- Vercel + CDN
- 手机热点备 Wi-Fi
- 进页面立即预加载音频和图片

### 4. 录备份视频
- 周日上午录 60 秒完整跑通视频（中英两版）
- 上传 YouTube / Loom
- 一切都挂了就放视频

---

## 🎤 Demo Pitch（90 秒）

### 现场根据评委语言决定用哪版
周日早上看评委构成：国际评委多 → 英文；华人评委多 → 中文。两版都要备。

### 英文版

**开场（15 秒）**
> "Every one of us has an AI companion now. Pi, Replika, Character AI.
> But none of them actually know you. They all have to ask.
> **Mira — in Latin, means 'to see.'**
> She's been watching your stars since the day you were born.
> She already knows."

**产品演示（50 秒）**
> "Mira uses 2,000 years of Chinese Zi Wei Dou Shu astrology as her memory,
> and Z.AI's GLM-4-Voice as her voice.
>
> [现场输入评委生日]
>
> This is [Name]'s Mira. One birthday. Zero training.
>
> [播 First Encounter 音频]
>
> Three things Mira knows about them — without being told.
>
> [加第二位评委生日]
>
> And when we add [Name 2] —
>
> [播合盘分析]
>
> — Mira doesn't just know each of them. She knows what happens between them."

**收尾（25 秒）**
> "We're not making another fortune-telling app.
> We're making the first AI companion that starts from full understanding.
>
> Ancient pattern language. Modern voice AI. Zero cold start.
> **Mira — the friend you were born to find.**
>
> 谢谢大家。"  ← 语言切换收尾 = 病毒时刻

### 中文版

**开场（15 秒）**
> "现在人人都有 AI 朋友。Pi、Replika、豆包。
> 但没有一个真的认识你。它们都得先问你。
> **Mira —— 在拉丁语里，意思是'看见'。**
> 她从你出生那一天，就在看着你的星辰。
> 她已经认识你了。"

**产品演示（50 秒）**
> "Mira 用两千年紫微斗数做她的记忆，
> 用 Z.AI 的 GLM-4-Voice 做她的声音。
>
> [现场输入评委生日]
>
> 这是 [名字] 的 Mira。一个生日，零训练。
>
> [播 First Encounter]
>
> Mira 在没被告知任何事的情况下，说出关于 ta 的 3 件事。
>
> [加入第二位评委生日]
>
> 当我们加入 [名字 2] ——
>
> [播合盘分析]
>
> Mira 不只认识他们每一个人。她看得见他们之间会发生什么。"

**收尾（25 秒）**
> "我们不是在做又一个算命 App。
> 我们做的是第一个从'全然理解'出发的 AI 陪伴。
>
> 古老的星图，现代的声音，零冷启动。
> **Mira —— 你从出生就注定会遇见的朋友。**
>
> Thank you."  ← 语言切换收尾 = 病毒时刻

---

## 📅 执行时间表（给 Claude Code）

### 周六 13:00–14:00｜Sprint 1：搭骨架
- `pnpm create next-app mira --typescript --tailwind --app`
- `pnpm add framer-motion iztro zod next-intl`
- 配置 i18n（en + zh）—— **Day 1 硬要求**
- 配环境变量，跑通 GLM-4.7 hello test
- 部署到 Vercel，给出 live URL

### 周六 14:00–15:30｜Sprint 2：命盘 + Onboarding
- Onboarding 表单（3 字段）
- 接 iztro
- 原型映射
- locale 感知的命盘输出

### 周六 15:30–17:00｜Sprint 3：角色 + 语音 ⚠️ 最高风险
- 角色诞生动画
- GLM-4.7 生成 intro（双语 prompt）
- GLM-4-Voice 集成
- 端到端测试：生日 → 角色 → 语音

### 周六 17:00–18:00｜Sprint 4：对话
- 按住说话按钮
- 2 轮对话
- 双语 prompt

### 周日 10:00–11:30｜Sprint 5：合盘
- 匹配输入页
- 分屏结果页
- 星线动画
- 语音分析播放

### 周日 11:30–12:30｜Sprint 6：Polish + 备份
- 预生成关键评委备份音频（中英双语）
- 修关键 bug
- 录 60 秒备份 demo 视频
- Vercel 最终部署

### 周日 12:30–13:00｜Sprint 7：彩排
- 完整 demo 走 3 遍，掐时间（中英双版）
- 根据评委构成决定 demo 语言
- 锁定 + 提交

---

## 📋 Claude Code 执行规则

1. **第 1 小时内完成脚手架 + Vercel 部署**，给出 live URL 后再加复杂度
2. **第 2 小时内验证 GLM-4-Voice**——最高风险。如被阻塞，立刻升级到用户，切换到"文本先行 + 预录音频"降级方案
3. **纵向推进**：Onboarding → Reveal → First Encounter 跑通，再做 Chat 和 Match
4. **先 stub，再接真 API**：占位音频先用，GLM-4-Voice 后接
5. **不问设计决策**：所有 spec 都在这份文档里。只有真正有歧义的才问
6. **严守范围**：想加 PRD 外的功能，停下问用户。范围蔓延是第一失败模式
7. **频繁 commit**：用户始终能访问最新可用版本
8. **i18n 从 Day 1**：永远不要硬编码用户可见的字符串

---

## 🏁 成功标准

周日 14:30 Live Demo 时做到：
- ✅ 两位评委输入生日（现场或预缓存）
- ✅ 两个原型角色以动画方式出现
- ✅ 至少一个角色通过 GLM-4-Voice 说出"太准了"的具体观察
- ✅ 合盘匹配播放语音分析
- ✅ 整个 demo 跑完没有明显错误
- ✅ Demo 可英文可中文（周日上午决定）

**奖金目标：£1000 —— AI + Media 赛道冠军。**

---

## 🎁 品牌哲学笔记（pitch deck 用）

- **Mira 是一个角色，在四个面相中显现**。不是四个独立产品——她是统一的存在
- **她不预测你的未来**。她反映你的当下
- **她不替你解读星辰**。她以"生于同一片天空"的身份对你说话
- **Mira = 看见**。每一个 UX 决策都应该强化"被看见"的感觉

**开干。** 🌌
