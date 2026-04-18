import type { Archetype } from "./archetype-map";

export type MiraSession = {
  dob: string;
  birthHour: number;
  gender: "male" | "female";
  timeUnknown: boolean;
  locale: "en" | "zh";
  archetype: Archetype;
  keyStars: {
    mainStar?: string;
    mainStarPosition?: string;
    spouseStar?: string;
    spouseStarPosition?: string;
    careerStar?: string;
    careerStarPosition?: string;
  };
};

const KEY = "mira-session";

export function saveSession(session: MiraSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function loadSession(): MiraSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MiraSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
