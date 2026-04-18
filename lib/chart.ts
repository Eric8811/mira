import { astro } from "iztro";

export type ChartInput = {
  dob: string;
  birthHour: number;
  gender: "male" | "female";
  locale?: "en" | "zh";
  timeUnknown?: boolean;
};

export function getChart(input: ChartInput) {
  const lang = input.locale === "zh" ? "zh-CN" : "en-US";
  return astro.bySolar(
    input.dob,
    input.birthHour,
    input.gender === "male" ? "男" : "女",
    true,
    lang as never,
  );
}

export function extractKeyStars(astrolabe: ReturnType<typeof getChart>) {
  const palace = (name: string) => {
    try {
      return astrolabe.palace(name as never);
    } catch {
      return null;
    }
  };

  const self = palace("命宫");
  const spouse = palace("夫妻");
  const career = palace("官禄");

  const mainStar = self?.majorStars?.[0]?.name;
  const spouseStar = spouse?.majorStars?.[0]?.name;
  const careerStar = career?.majorStars?.[0]?.name;

  return {
    mainStar,
    mainStarPosition: self?.earthlyBranch,
    spouseStar,
    spouseStarPosition: spouse?.earthlyBranch,
    careerStar,
    careerStarPosition: career?.earthlyBranch,
  };
}
