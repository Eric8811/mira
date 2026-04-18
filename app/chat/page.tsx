"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MiraCharacter } from "@/components/MiraCharacter";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";
import { loadSession, type MiraSession } from "@/lib/session";
import { useLocale } from "@/components/I18nProvider";
import { RealtimeSession } from "@/lib/RealtimeSession";
import { buildRealtimeInstructions, WS_PROXY_URL } from "@/lib/realtime-config";

type ChatState =
  | "connecting"
  | "mic-denied"
  | "error"
  | "listening"
  | "hearing"
  | "thinking"
  | "speaking";

export default function Chat() {
  const { locale } = useLocale();
  const router = useRouter();

  const [session, setSession] = useState<MiraSession | null>(null);
  const [state, setState] = useState<ChatState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState("");
  const [lineVisible, setLineVisible] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const rtRef = useRef<RealtimeSession | null>(null);
  const startedRef = useRef(false);
  const deltaBufferRef = useRef("");
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/onboarding");
      return;
    }
    setSession(s);

    if (startedRef.current) return;
    startedRef.current = true;

    const rt = new RealtimeSession({
      onUserSpeechStarted: () => {
        setState("hearing");
        // Clear any lingering Mira line when user starts speaking
        setLineVisible(false);
      },
      onUserSpeechStopped: () => setState("thinking"),
      onAudioStart: () => {
        setState("speaking");
        deltaBufferRef.current = "";
        setCurrentLine("");
        setLineVisible(true);
      },
      onAssistantTranscriptDelta: (delta) => {
        deltaBufferRef.current += delta;
        setCurrentLine(deltaBufferRef.current);
      },
      onAssistantTranscriptDone: (full) => {
        if (full) setCurrentLine(full);
      },
      onResponseDone: () => {
        setState("listening");
        // Let the final line linger briefly, then fade out
        if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = window.setTimeout(() => {
          setLineVisible(false);
        }, 2600);
      },
      onError: (err) => {
        console.warn("[chat realtime error]", err.message);
        setError(err.message);
      },
      onClose: (code, reason) => {
        console.log("[chat ws close]", code, reason);
      },
    });
    rtRef.current = rt;

    (async () => {
      try {
        await rt.connect({
          proxyUrl: WS_PROXY_URL,
          instructions: buildRealtimeInstructions(s),
          voice: "Cherry",
          turnDetection: true,
        });
        setAnalyser(rt.getOutputAnalyser());
      } catch (e) {
        console.error("[chat] ws connect failed", e);
        setState("error");
        setError((e as Error).message);
        return;
      }

      try {
        await rt.startInputCapture();
        setState("listening");
      } catch (e) {
        console.warn("[chat] mic denied", e);
        setState("mic-denied");
        setError((e as Error).message);
      }
    })();

    return () => {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      rtRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendTyped = useCallback(() => {
    const text = typed.trim();
    if (!text || !rtRef.current) return;
    rtRef.current.sendUserText(text);
    setTyped("");
    setState("thinking");
    setLineVisible(false);
  }, [typed]);

  if (!session) return null;
  const archetype: Archetype = session.archetype;
  const meta = ARCHETYPE_META[archetype];

  return (
    <main
      className="mira-stars relative flex min-h-screen flex-col items-center justify-center px-8 py-12"
      style={{
        background: `radial-gradient(ellipse at center, ${meta.background} 0%, #0B0618 80%)`,
      }}
    >
      <StatusPill state={state} locale={locale} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10">
        <MiraCharacter
          archetype={archetype}
          state={state === "speaking" ? "speaking" : "idle"}
          size={240}
          analyser={analyser}
        />

        {/* Single-line whisper of what Mira is saying right now, fades in/out */}
        <div className="relative min-h-[4rem] w-full max-w-xl">
          <AnimatePresence mode="wait">
            {lineVisible && currentLine && (
              <motion.p
                key="mira-line"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.8, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="px-4 text-center font-serif-display text-xl italic leading-relaxed text-white/80 md:text-2xl"
              >
                {currentLine}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Keyboard fallback */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <AnimatePresence>
          {keyboardOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex w-80 items-center gap-2 rounded-full border border-white/15 bg-black/70 p-2 backdrop-blur"
            >
              <input
                type="text"
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendTyped();
                  } else if (e.key === "Escape") {
                    setKeyboardOpen(false);
                  }
                }}
                placeholder={locale === "zh" ? "输入文字…" : "Type a message…"}
                className="flex-1 bg-transparent px-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                onClick={sendTyped}
                disabled={!typed.trim()}
                className="rounded-full bg-[var(--mira-accent)]/20 px-3 py-1 text-xs text-[var(--mira-accent)] disabled:opacity-30"
              >
                {locale === "zh" ? "发送" : "Send"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setKeyboardOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-lg backdrop-blur transition hover:border-white/30"
          aria-label={locale === "zh" ? "键盘输入" : "Keyboard input"}
        >
          ⌨️
        </button>
      </div>

      {error && state !== "listening" && state !== "hearing" && state !== "speaking" && (
        <div className="pointer-events-none fixed bottom-6 left-6 max-w-sm rounded-lg border border-red-500/25 bg-red-950/40 px-3 py-2 text-xs text-red-200/80 backdrop-blur">
          {error}
        </div>
      )}
    </main>
  );
}

function StatusPill({ state, locale }: { state: ChatState; locale: "en" | "zh" }) {
  const labels: Record<ChatState, { icon: string; en: string; zh: string }> = {
    connecting: { icon: "🌙", en: "connecting", zh: "连接中" },
    "mic-denied": { icon: "🔇", en: "mic blocked — type", zh: "麦克风未开 · 请用文字" },
    error: { icon: "⚠️", en: "connection issue", zh: "连接不稳" },
    listening: { icon: "🎙️", en: "listening", zh: "在听" },
    hearing: { icon: "🎤", en: "hearing you", zh: "听着呢" },
    thinking: { icon: "💭", en: "…", zh: "…" },
    speaking: { icon: "🌌", en: "", zh: "" },
  };
  const l = labels[state];
  return (
    <motion.div
      key={state}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 0.6, y: 0 }}
      className="fixed top-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/60 backdrop-blur"
    >
      <span className="text-sm">{l.icon}</span>
      {(locale === "zh" ? l.zh : l.en) && <span>{locale === "zh" ? l.zh : l.en}</span>}
    </motion.div>
  );
}
