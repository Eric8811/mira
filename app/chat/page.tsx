"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MiraCharacter } from "@/components/MiraCharacter";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";
import { loadSession, type MiraSession } from "@/lib/session";
import { useLocale } from "@/components/I18nProvider";
import { RealtimeSession } from "@/lib/RealtimeSession";
import {
  buildEncounterTrigger,
  buildRealtimeInstructions,
  voiceForLocale,
  WS_PROXY_URL,
} from "@/lib/realtime-config";
import { useResponsiveSize } from "@/lib/useResponsiveSize";
import { ChartInsights } from "@/components/ChartInsights";
import { HamburgerMenu } from "@/components/HamburgerMenu";

type ChatState =
  | "connecting"
  | "mic-denied"
  | "error"
  | "listening"
  | "hearing"
  | "thinking"
  | "speaking"
  | "reconnecting"
  | "reconnect-failed";

const ENCOUNTER_FLAG = "mira-encounter-delivered";

export default function Chat() {
  const { locale, toggle: toggleLocale } = useLocale();
  const router = useRouter();

  const [session, setSession] = useState<MiraSession | null>(null);
  const [state, setState] = useState<ChatState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [micGranted, setMicGranted] = useState(false);
  const [micPrompt, setMicPrompt] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const rtRef = useRef<RealtimeSession | null>(null);
  const startedRef = useRef(false);

  const enableMic = useCallback(async () => {
    if (!rtRef.current || micGranted) return;
    try {
      await rtRef.current.startInputCapture();
      setMicGranted(true);
      setMicPrompt(false);
      if (state === "connecting" || state === "speaking") {
        // keep current state; onResponseDone will drop us into listening
      } else {
        setState("listening");
      }
    } catch (e) {
      console.warn("[chat] mic denied/failed", e);
      setMicPrompt(true);
      setError((e as Error).message);
    }
  }, [micGranted, state]);

  const toggleMic = useCallback(async () => {
    if (!rtRef.current) return;
    if (micGranted) {
      rtRef.current.stopInputCapture();
      setMicGranted(false);
      setMicPrompt(true);
    } else {
      await enableMic();
    }
  }, [micGranted, enableMic]);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/onboarding");
      return;
    }
    setSession(s);

    if (startedRef.current) return;
    startedRef.current = true;

    const alreadyDelivered = sessionStorage.getItem(ENCOUNTER_FLAG) === "true";
    let micStartRequested = false;

    const rt = new RealtimeSession({
      onUserSpeechStarted: () => setState("hearing"),
      onUserSpeechStopped: () => setState("thinking"),
      onAudioStart: () => setState("speaking"),
      onResponseDone: () => {
        setState("listening");
        if (!alreadyDelivered) {
          sessionStorage.setItem(ENCOUNTER_FLAG, "true");
          if (!micStartRequested) {
            micStartRequested = true;
            rtRef.current?.startInputCapture()
              .then(() => {
                setMicGranted(true);
                setMicPrompt(false);
              })
              .catch((e) => {
                console.warn("[chat] mic pending user action", e);
                setMicPrompt(true);
              });
          }
        }
      },
      onReconnecting: (attempt) => {
        if (attempt >= 2) setState("reconnecting");
      },
      onReconnected: () => {
        setState("listening");
        setError(null);
      },
      onReconnectFailed: () => {
        setState("reconnect-failed");
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
          voice: voiceForLocale(s.locale),
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

      if (!alreadyDelivered) {
        setState("thinking");
        rt.triggerResponse(buildEncounterTrigger(s));
      }

      if (alreadyDelivered) {
        try {
          micStartRequested = true;
          await rt.startInputCapture();
          setMicGranted(true);
          setState("listening");
        } catch (e) {
          console.warn("[chat] mic pending user action", e);
          setMicPrompt(true);
        }
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

  const orbState: "idle" | "thinking" | "speaking" =
    state === "speaking" ? "speaking" : state === "thinking" || state === "hearing" ? "thinking" : "idle";

  return (
    <main
      className="mira-stars relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10 sm:px-8 sm:py-12"
      style={{
        background: `radial-gradient(ellipse at center, ${meta.background} 0%, #0B0618 80%)`,
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(4rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Hamburger — top-left */}
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg text-white/80 backdrop-blur transition hover:border-white/35 active:scale-95"
        style={{
          left: "max(1rem, env(safe-area-inset-left))",
          top: "max(1rem, env(safe-area-inset-top))",
        }}
        aria-label={locale === "zh" ? "菜单" : "Menu"}
      >
        ☰
      </button>

      <HamburgerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        archetype={archetype}
        locale={locale}
        onAction={(action) => {
          if (action.type === "open-insights") setInsightsOpen(true);
          else if (action.type === "open-match") router.push("/match");
          else if (action.type === "toggle-locale") toggleLocale();
        }}
      />

      <ChartInsights
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        archetype={archetype}
        locale={locale}
      />

      <StatusPill state={state} locale={locale} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <MiraCharacter
          archetype={archetype}
          state={orbState}
          size={charSize}
          analyser={analyser}
        />
      </div>

      {/* Manual reconnect after exhausting retries */}
      <AnimatePresence>
        {state === "reconnect-failed" && (
          <motion.button
            key="manual-reconnect"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={async () => {
              setState("reconnecting");
              try {
                await rtRef.current?.manualReconnect();
              } catch {
                setState("reconnect-failed");
              }
            }}
            className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/30 bg-black/60 px-5 py-3 text-sm text-white backdrop-blur transition hover:border-white/60"
            style={{ bottom: "max(7rem, calc(env(safe-area-inset-bottom) + 6rem))" }}
          >
            <span>🔌</span>
            <span>{locale === "zh" ? "轻触重新连接" : "Tap to reconnect"}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mic permission prompt (shown when not granted) */}
      <AnimatePresence>
        {micPrompt && !micGranted && (
          <motion.button
            key="mic-prompt"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={enableMic}
            className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--mira-accent)]/50 bg-black/50 px-5 py-3 text-sm text-white backdrop-blur transition hover:border-[var(--mira-accent)]"
            style={{ bottom: "max(7rem, calc(env(safe-area-inset-bottom) + 6rem))" }}
          >
            <span>🎙️</span>
            <span>
              {locale === "zh"
                ? "点铃铛激活麦克风"
                : "Tap the bell to enable the mic"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bell button — bottom-right (gradient) + keyboard fallback icon */}
      <div
        className="fixed right-4 z-40 flex flex-col items-end gap-3 sm:right-6"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {/* Keyboard typing overlay */}
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setKeyboardOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-sm backdrop-blur transition hover:border-white/30 active:scale-95"
            aria-label={locale === "zh" ? "键盘输入" : "Keyboard input"}
          >
            ⌨️
          </button>

          <button
            onClick={toggleMic}
            className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl text-white transition active:scale-95"
            style={{
              background: micGranted
                ? "linear-gradient(135deg, rgba(124, 58, 237, 0.95) 0%, rgba(212, 175, 55, 0.9) 100%)"
                : "linear-gradient(135deg, rgba(80, 60, 120, 0.4) 0%, rgba(150, 120, 60, 0.4) 100%)",
              boxShadow: micGranted
                ? "0 10px 30px -8px rgba(124, 58, 237, 0.55), 0 0 30px -4px rgba(212, 175, 55, 0.4)"
                : "0 4px 14px -4px rgba(0,0,0,0.4)",
            }}
            aria-label={micGranted ? (locale === "zh" ? "暂停麦克风" : "Mute") : (locale === "zh" ? "激活麦克风" : "Unmute")}
          >
            {micGranted ? "🔔" : "🔕"}
          </button>
        </div>
      </div>

      {error && state !== "listening" && state !== "hearing" && state !== "speaking" && !micPrompt && (
        <div className="pointer-events-none fixed left-6 max-w-sm rounded-lg border border-red-500/25 bg-red-950/40 px-3 py-2 text-xs text-red-200/80 backdrop-blur"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {error}
        </div>
      )}
    </main>
  );
}

function StatusPill({ state, locale }: { state: ChatState; locale: "en" | "zh" }) {
  const labels: Record<ChatState, { icon: string; en: string; zh: string }> = {
    connecting: { icon: "🌙", en: "arriving", zh: "正在到来" },
    reconnecting: { icon: "🔌", en: "reconnecting…", zh: "重新连接中…" },
    "reconnect-failed": { icon: "", en: "", zh: "" },
    "mic-denied": { icon: "🔇", en: "mic blocked — type", zh: "麦克风未开 · 请用文字" },
    error: { icon: "⚠️", en: "connection issue", zh: "连接不稳" },
    listening: { icon: "🎙️", en: "listening", zh: "在听" },
    hearing: { icon: "🎤", en: "hearing you", zh: "听着呢" },
    thinking: { icon: "💭", en: "…", zh: "…" },
    speaking: { icon: "🌌", en: "", zh: "" },
  };
  if (!labels[state].icon && !labels[state].en && !labels[state].zh) return null;
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
