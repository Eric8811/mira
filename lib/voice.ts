import type { Archetype } from "./archetype-map";

export type VoicePreset = Archetype;

export type VoiceResult =
  | { kind: "audio"; audio: ArrayBuffer; mime: string }
  | { kind: "stub"; reason: string };

/**
 * Stub: returns a placeholder until qwen3-omni-flash is wired up.
 * Client should fall back to SpeechSynthesis or silence when kind === "stub".
 */
export async function generateSpeech(params: {
  text: string;
  voicePreset: VoicePreset;
  language: "en" | "zh";
}): Promise<VoiceResult> {
  void params;
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return { kind: "stub", reason: "DASHSCOPE_API_KEY is not set" };
  }
  return { kind: "stub", reason: "qwen3-omni-flash integration pending" };
}
