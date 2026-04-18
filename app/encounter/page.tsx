"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MiraCharacter } from "@/components/MiraCharacter";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";
import { loadSession, type MiraSession } from "@/lib/session";
import { useLocale } from "@/components/I18nProvider";
import { speakFallback, type FallbackTTSHandle } from "@/lib/tts-fallback";
import { useResponsiveSize } from "@/lib/useResponsiveSize";
import { RealtimeSession } from "@/lib/RealtimeSession";
import {
  buildEncounterTrigger,
  buildRealtimeInstructions,
  WS_PROXY_URL,
} from "@/lib/realtime-config";

type Status = "connecting" | "speaking" | "ready";

export default function Encounter() {
  const { locale } = useLocale();
  const router = useRouter();

  const [session, setSession] = useState<MiraSession | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const requestedRef = useRef(false);
  const rtRef = useRef<RealtimeSession | null>(null);
  const ttsRef = useRef<FallbackTTSHandle | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/onboarding");
      return;
    }
    setSession(s);

    if (requestedRef.current) return;
    requestedRef.current = true;

    (async () => {
      try {
        await openRealtime(s);
      } catch (err) {
        console.warn("[encounter] realtime failed, falling back:", err);
        await openFallback(s);
      }
    })();

    return () => {
      rtRef.current?.close();
      ttsRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openRealtime(s: MiraSession) {
    const rt = new RealtimeSession({
      onAudioStart: () => setStatus("speaking"),
      onResponseDone: () => setStatus("ready"),
      onError: (err) => console.warn("[realtime] error:", err.message),
      onClose: (code, reason) => console.log("[realtime] close", code, reason),
    });
    rtRef.current = rt;

    await rt.connect({
      proxyUrl: WS_PROXY_URL,
      instructions: buildRealtimeInstructions(s),
      voice: "Cherry",
      turnDetection: false,
    });

    setAnalyser(rt.getOutputAnalyser());
    rt.triggerResponse(buildEncounterTrigger(s));
  }

  async function openFallback(s: MiraSession) {
    try {
      const res = await fetch("/api/encounter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = (await res.json()) as { text: string };
      setStatus("speaking");

      ttsRef.current = speakFallback(data.text, s.locale, {
        onEnd: () => setStatus("ready"),
        onError: (e) => {
          console.warn("[tts fallback]", e.message);
          setStatus("ready");
        },
      });

      // If speechSynthesis has no voices / silent, still surface CTA after a timeout
      window.setTimeout(() => setStatus((cur) => (cur === "speaking" ? "ready" : cur)), Math.max(4000, data.text.length * 90));
    } catch (e) {
      console.error("[encounter] fallback failed", e);
      setStatus("ready");
    }
  }

  const charSize = useResponsiveSize(200, 260);

  if (!session) return null;
  const archetype: Archetype = session.archetype;
  const meta = ARCHETYPE_META[archetype];

  return (
    <main
      className="mira-stars relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10 sm:px-8 sm:py-12"
      style={{
        background: `radial-gradient(ellipse at center, ${meta.background} 0%, #0B0618 80%)`,
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <StatusPill status={status} locale={locale} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <MiraCharacter
          archetype={archetype}
          state={status === "speaking" ? "speaking" : "idle"}
          size={charSize}
          analyser={analyser}
        />
      </div>

      <AnimatePresence>
        {status === "ready" && (
          <motion.button
            key="continue-cta"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onClick={() => {
              rtRef.current?.close();
              ttsRef.current?.cancel();
              router.push("/chat");
            }}
            className="group relative mb-10 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--mira-accent)]/50 bg-[var(--mira-accent)]/10 text-2xl text-[var(--mira-accent)] transition hover:bg-[var(--mira-accent)]/25"
            aria-label={locale === "zh" ? "开始对话" : "Start conversation"}
          >
            <span
              className="absolute inset-0 rounded-full border border-[var(--mira-accent)]/40"
              style={{ animation: "mira-breathe 2.4s ease-in-out infinite" }}
              aria-hidden
            />
            💬
          </motion.button>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes mira-breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 0.1; }
        }
      `}</style>
    </main>
  );
}

function StatusPill({ status, locale }: { status: Status; locale: "en" | "zh" }) {
  const labels: Record<Status, { icon: string; en: string; zh: string }> = {
    connecting: { icon: "🌙", en: "arriving", zh: "正在到来" },
    speaking: { icon: "🌌", en: "", zh: "" },
    ready: { icon: "", en: "", zh: "" },
  };
  const l = labels[status];
  if (!l.icon && !l.en && !l.zh) return null;
  return (
    <motion.div
      key={status}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 0.55, y: 0 }}
      className="fixed top-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/60 backdrop-blur"
    >
      <span className="text-sm">{l.icon}</span>
      {(locale === "zh" ? l.zh : l.en) && <span>{locale === "zh" ? l.zh : l.en}</span>}
    </motion.div>
  );
}
