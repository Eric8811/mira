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

type Turn = { role: "user" | "mira"; text: string };

export default function Chat() {
  const { locale } = useLocale();
  const router = useRouter();

  const [session, setSession] = useState<MiraSession | null>(null);
  const [state, setState] = useState<ChatState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [liveDelta, setLiveDelta] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const rtRef = useRef<RealtimeSession | null>(null);
  const startedRef = useRef(false);
  const deltaBufferRef = useRef("");

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
      onUserTranscript: (text) => {
        setTurns((prev) => [...prev, { role: "user", text }]);
      },
      onAudioStart: () => setState("speaking"),
      onAssistantTranscriptDelta: (delta) => {
        deltaBufferRef.current += delta;
        setLiveDelta(deltaBufferRef.current);
      },
      onAssistantTranscriptDone: (full) => {
        const final = full || deltaBufferRef.current;
        if (final) {
          setTurns((prev) => [...prev, { role: "mira", text: final }]);
        }
        deltaBufferRef.current = "";
        setLiveDelta("");
      },
      onResponseDone: () => {
        setState("listening");
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
    setTurns((prev) => [...prev, { role: "user", text }]);
    setTyped("");
    setState("thinking");
  }, [typed]);

  if (!session) return null;
  const archetype: Archetype = session.archetype;
  const meta = ARCHETYPE_META[archetype];

  const isMiraActive = state === "speaking" || state === "thinking";

  return (
    <main
      className="mira-stars relative flex min-h-screen flex-col items-center justify-between px-8 py-12"
      style={{
        background: `radial-gradient(ellipse at center, ${meta.background} 0%, #0B0618 80%)`,
      }}
    >
      <StatusPill state={state} locale={locale} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 py-8">
        <MiraCharacter archetype={archetype} state={isMiraActive ? "speaking" : "idle"} size={220} />

        <TranscriptStack turns={turns} liveDelta={liveDelta} locale={locale} />
      </div>

      {/* Keyboard icon + input */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <AnimatePresence>
          {keyboardOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex w-80 items-center gap-2 rounded-full border border-white/20 bg-black/70 p-2 backdrop-blur"
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-lg backdrop-blur transition hover:border-white/40"
          aria-label={locale === "zh" ? "键盘输入" : "Keyboard input"}
        >
          ⌨️
        </button>
      </div>

      {error && state !== "listening" && state !== "hearing" && state !== "speaking" && (
        <div className="pointer-events-none fixed bottom-6 left-6 max-w-sm rounded-lg border border-red-500/30 bg-red-950/60 px-3 py-2 text-xs text-red-200 backdrop-blur">
          {error}
        </div>
      )}
    </main>
  );
}

function StatusPill({ state, locale }: { state: ChatState; locale: "en" | "zh" }) {
  const labels: Record<ChatState, { icon: string; en: string; zh: string }> = {
    connecting: { icon: "🌙", en: "Connecting…", zh: "连接中…" },
    "mic-denied": { icon: "🔇", en: "Microphone blocked — type instead", zh: "麦克风未授权——请用文字" },
    error: { icon: "⚠️", en: "Connection issue", zh: "连接不稳" },
    listening: { icon: "🎙️", en: "I'm listening", zh: "在听你说" },
    hearing: { icon: "🎤", en: "Hearing you", zh: "听着呢" },
    thinking: { icon: "💭", en: "…", zh: "…" },
    speaking: { icon: "🌌", en: "Speaking", zh: "说话中" },
  };
  const l = labels[state];
  return (
    <motion.div
      key={state}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur"
    >
      <span>{l.icon}</span>
      <span>{locale === "zh" ? l.zh : l.en}</span>
    </motion.div>
  );
}

function TranscriptStack({
  turns,
  liveDelta,
  locale,
}: {
  turns: Turn[];
  liveDelta: string;
  locale: "en" | "zh";
}) {
  const recent = turns.slice(-4);
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-3">
      {recent.map((t, i) => (
        <motion.div
          key={`${i}-${t.role}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: i === recent.length - 1 ? 1 : 0.5, y: 0 }}
          className={`w-full rounded-2xl px-6 py-3 text-center text-base leading-relaxed backdrop-blur md:text-lg ${
            t.role === "mira"
              ? "border border-white/10 bg-black/30 font-serif-display italic text-white"
              : "border border-white/5 bg-white/5 text-white/70"
          }`}
        >
          {t.role === "user" && (
            <span className="mr-2 text-xs uppercase tracking-widest text-white/40">
              {locale === "zh" ? "你" : "you"}
            </span>
          )}
          {t.text}
        </motion.div>
      ))}
      {liveDelta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-6 py-3 text-center font-serif-display text-base italic leading-relaxed text-white backdrop-blur md:text-lg"
        >
          {liveDelta}
          <span className="ml-1 inline-block w-2 animate-pulse">▍</span>
        </motion.div>
      )}
      {!turns.length && !liveDelta && (
        <p className="text-sm text-white/30">
          {locale === "zh" ? "随便说点什么，ta 会接得住。" : "Say something. She'll catch it."}
        </p>
      )}
    </div>
  );
}
