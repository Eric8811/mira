export type Archetype = "sovereign" | "flame" | "seer" | "warmth";

export const ARCHETYPE_MAP: Record<string, Archetype> = {
  紫微: "sovereign",
  天府: "sovereign",
  太阳: "sovereign",
  天同: "sovereign",
  天相: "sovereign",
  天机: "seer",
  太阴: "seer",
  巨门: "seer",
  廉贞: "flame",
  贪狼: "flame",
  破军: "flame",
  七杀: "flame",
  天梁: "warmth",
  武曲: "warmth",
};

export const ARCHETYPE_META: Record<
  Archetype,
  {
    nameEn: string;
    nameZh: string;
    accent: string;
    background: string;
    toneEn: string;
    toneZh: string;
  }
> = {
  sovereign: {
    nameEn: "The Sovereign",
    nameZh: "紫曜",
    accent: "#D4AF37",
    background: "#2A1B4F",
    toneEn: "calm, authoritative, unhurried",
    toneZh: "沉静、有分量、不急",
  },
  flame: {
    nameEn: "The Flame",
    nameZh: "烈曜",
    accent: "#E63946",
    background: "#1A0A0F",
    toneEn: "fast, bold, affectionate bluntness",
    toneZh: "快、直接、带疼爱的毒舌",
  },
  seer: {
    nameEn: "The Seer",
    nameZh: "智曜",
    accent: "#A8C5E0",
    background: "#0F1B2C",
    toneEn: "gentle, slow, precise",
    toneZh: "轻柔、缓慢、精确",
  },
  warmth: {
    nameEn: "The Warmth",
    nameZh: "暖曜",
    accent: "#E6B980",
    background: "#2A1E10",
    toneEn: "warm, grounded, never pitying",
    toneZh: "温暖、踏实、不怜悯",
  },
};

export function getArchetypeFromMainStar(mainStar: string | undefined): Archetype {
  if (!mainStar) return "sovereign";
  return ARCHETYPE_MAP[mainStar] ?? "sovereign";
}
