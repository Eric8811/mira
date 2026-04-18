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
import { useResponsiveSize } from "@/lib/useResponsiveSize";

type ChatState =
  | "connecting"
  | "mic-denied"
  | "error"
  | "listening"
  | "hearing"
  | "thinking"
  | "speaking"
  | "reconnecting";

export default function Chat() {
  const { locale } = useLocale();
  const router = useRouter();

  const [session, setSession] = useState<MiraSession | null>(null);
  const [state, setState] = useState<ChatState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const rtRef = useRef<RealtimeSession | null>(null);
  const startedRef = useRef(false);

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
      onUserSpeechStarted: () => setState("hearing"),
      onUserSpeechStopped: () => setState("thinking"),
      onAudioStart: () => setState("speaking"),
      onResponseDone: () => setState("listening"),
      onReconnecting: (attempt) => {
        console.log("[chat] reconnecting", attempt);
        // Only surface UI after the 2nd attempt — the 1st often succeeds invisibly.
        if (attempt >= 2) setState("reconnecting");
      },
      onReconnected: () => {
        console.log("[chat] reconnected");
        setState("listening");
        setError(null);
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
          miraSession: s,
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
  }, [typed]);

  const charSize = useResponsiveSize(180, 260);

  if (!session) return null;
  const archetype: Archetype = session.archetype;
  const meta = ARCHETYPE_META[archetype];

  return (
    <main
      className="mira-stars relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10 sm:px-8 sm:py-12"
      style={{
        background: `radial-gradient(ellipse at center, ${meta.background} 0%, #0B0618 80%)`,
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(4rem, env(safe-area-inset-bottom))",
      }}
    >
      <StatusPill state={state} locale={locale} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <MiraCharacter
          archetype={archetype}
          state={state === "speaking" ? "speaking" : "idle"}
          size={charSize}
          analyser={analyser}
        />
      </div>

      {/* Match CTA — subtle, lower-left */}
      <button
        onClick={() => router.push("/match")}
        className="fixed left-4 z-30 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white/60 backdrop-blur transition hover:border-white/30 hover:text-white/90 sm:left-6 sm:px-4 sm:py-2 sm:text-xs"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {locale === "zh" ? "✦ 合盘" : "✦ read a match"}
      </button>

      {/* Keyboard fallback */}
      <div
        className="fixed right-4 z-40 flex flex-col items-end gap-2 sm:right-6"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <AnimatePresence>
          {keyboardOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex w-[min(20rem,calc(100vw-2rem))] items-center gap-2 rounded-full border border-white/15 bg-black/70 p-2 backdrop-blur"
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
    reconnecting: { icon: "🔌", en: "reconnecting…", zh: "重新连接中…" },
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
      className="fixed left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/60 backdrop-blur"
    style={{ top: "max(1rem, calc(env(safe-area-inset-top) + 0.5rem))" }}
    >
      <span className="text-sm">{l.icon}</span>
      {(locale === "zh" ? l.zh : l.en) && <span>{locale === "zh" ? l.zh : l.en}</span>}
    </motion.div>
  );
}
