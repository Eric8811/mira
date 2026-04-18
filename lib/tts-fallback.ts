/**
 * Fallback TTS via browser speechSynthesis.
 * Used when Realtime pipeline hasn't started or fails. Guarantees the demo always has a voice.
 */

const ZH_PREFERRED = ["Tingting", "Mei-Jia", "Sin-ji", "Google 普通话"];
const EN_PREFERRED = ["Samantha", "Karen", "Moira", "Google US English"];

function pickVoice(locale: "en" | "zh"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferred = locale === "zh" ? ZH_PREFERRED : EN_PREFERRED;
  for (const name of preferred) {
    const v = voices.find((voice) => voice.name === name);
    if (v) return v;
  }
  // fall back to first matching lang
  const langPrefix = locale === "zh" ? "zh" : "en";
  return voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ?? voices[0] ?? null;
}

export type FallbackTTSHandle = {
  cancel: () => void;
};

export function speakFallback(
  text: string,
  locale: "en" | "zh",
  opts: { onStart?: () => void; onEnd?: () => void; onError?: (e: Error) => void } = {},
): FallbackTTSHandle {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    opts.onError?.(new Error("speechSynthesis not available"));
    return { cancel: () => {} };
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const start = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale === "zh" ? "zh-CN" : "en-US";
    const v = pickVoice(locale);
    if (v) u.voice = v;
    u.rate = locale === "zh" ? 0.95 : 1;
    u.pitch = 1;
    u.volume = 1;
    u.onstart = () => opts.onStart?.();
    u.onend = () => opts.onEnd?.();
    u.onerror = (e) => opts.onError?.(new Error(e.error || "speech error"));
    synth.speak(u);
  };

  // Voices may load asynchronously in Chrome/Safari.
  if (synth.getVoices().length === 0) {
    const onVoices = () => {
      synth.removeEventListener("voiceschanged", onVoices);
      start();
    };
    synth.addEventListener("voiceschanged", onVoices);
    // Also try after a tick in case voiceschanged already fired
    setTimeout(() => {
      if (synth.getVoices().length > 0 && !synth.speaking) start();
    }, 300);
  } else {
    start();
  }

  return {
    cancel: () => synth.cancel(),
  };
}
