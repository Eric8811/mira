import type { Archetype } from "./archetype-map";

export type DemoChart = {
  label: string;
  dob: string;
  birthHour: number;
  gender: "male" | "female";
  archetype: Archetype;
  keyStars: {
    mainStar: string;
    mainStarPosition: string;
    spouseStar: string;
    spouseStarPosition: string;
    careerStar: string;
    careerStarPosition: string;
  };
};

export const DEMO_CHARTS: DemoChart[] = [
  {
    label: "Sovereign sample",
    dob: "1993-7-15",
    birthHour: 6,
    gender: "female",
    archetype: "sovereign",
    keyStars: {
      mainStar: "紫微",
      mainStarPosition: "午",
      spouseStar: "天相",
      spouseStarPosition: "辰",
      careerStar: "天府",
      careerStarPosition: "戌",
    },
  },
  {
    label: "Flame sample",
    dob: "1990-11-3",
    birthHour: 4,
    gender: "male",
    archetype: "flame",
    keyStars: {
      mainStar: "七杀",
      mainStarPosition: "寅",
      spouseStar: "贪狼",
      spouseStarPosition: "子",
      careerStar: "破军",
      careerStarPosition: "申",
    },
  },
];
