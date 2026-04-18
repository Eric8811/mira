import type { Archetype } from "./archetype-map";

export type VoicePreset = Archetype;

export async function generateSpeech(params: {
  text: string;
  voicePreset: VoicePreset;
  language: "en" | "zh";
}): Promise<ArrayBuffer> {
  const endpoint = process.env.GLM_VOICE_ENDPOINT;
  const apiKey = process.env.ZAI_API_KEY_1;
  if (!endpoint || !apiKey) {
    throw new Error("GLM_VOICE_ENDPOINT or ZAI_API_KEY_1 is not set");
  }

  const res = await fetch(`${endpoint.replace(/\/$/, "")}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "glm-4-voice",
      input: params.text,
      voice: params.voicePreset,
      language: params.language,
      speed: 1.0,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GLM voice failed: ${res.status} ${body}`);
  }

  return res.arrayBuffer();
}
