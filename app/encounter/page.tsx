"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MiraCharacter } from "@/components/MiraCharacter";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";
import { loadSession, type MiraSession } from "@/lib/session";
import { useLocale } from "@/components/I18nProvider";
import { speakFallback, type FallbackTTSHandle } from "@/lib/tts-fallback";
import { RealtimeSession } from "@/lib/RealtimeSession";
import {
  buildEncounterTrigger,
  buildRealtimeInstructions,
  WS_PROXY_URL,
} from "@/lib/realtime-config";

type Status = "loading" | "speaking" | "ready";
type Source = "realtime" | "fallback";

export default function Encounter() {
  const { locale } = useLocale();
  const router = useRouter();

  const [session, setSession] = useState<MiraSession | null>(null);
  const [displayed, setDisplayed] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [source, setSource] = useState<Source | null>(null);
  const [errorNote, setErrorNote] = useState<string | null>(null);

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
        setErrorNote((err as Error).message);
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
      onAssistantTranscriptDelta: (delta) => setDisplayed((prev) => prev + delta),
      onAssistantTranscriptDone: (full) => {
        if (full) setDisplayed(full);
      },
      onResponseDone: () => setStatus("ready"),
      onError: (err) => {
        console.warn("[realtime] error event:", err.message);
      },
      onClose: (code, reason) => {
        console.log("[realtime] close", code, reason);
      },
    });
    rtRef.current = rt;

    await rt.connect({
      proxyUrl: WS_PROXY_URL,
      instructions: buildRealtimeInstructions(s),
      voice: "Cherry",
      turnDetection: false,
    });

    setSource("realtime");
    rt.triggerResponse(buildEncounterTrigger(s));
  }

  async function openFallback(s: MiraSession) {
    setSource("fallback");
    try {
      const res = await fetch("/api/encounter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = (await res.json()) as { text: string };
      setStatus("speaking");

      ttsRef.current = speakFallback(data.text, s.locale, {
        onError: (e) => console.warn("[tts fallback]", e.message),
      });

      let i = 0;
      const id = window.setInterval(() => {
        i += 1;
        setDisplayed(data.text.slice(0, i));
        if (i >= data.text.length) {
          clearInterval(id);
          window.setTimeout(() => setStatus("ready"), 600);
        }
      }, 35);
    } catch (e) {
      console.error("[encounter] fallback failed", e);
      setStatus("ready");
    }
  }

  if (!session) return null;
  const archetype: Archetype = session.archetype;
  const meta = ARCHETYPE_META[archetype];
  const isSpeaking = status === "speaking";

  return (
    <main
      className="mira-stars relative flex min-h-screen flex-col items-center justify-center px-8 py-16"
      style={{
        background: `radial-gradient(ellipse at center, ${meta.background} 0%, #0B0618 80%)`,
      }}
    >
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-10">
        <MiraCharacter archetype={archetype} state={isSpeaking ? "speaking" : "idle"} size={260} />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="min-h-[10rem] w-full rounded-2xl border border-white/10 bg-black/30 px-8 py-6 text-center text-lg leading-relaxed text-white/90 backdrop-blur md:text-xl"
        >
          {status === "loading" && !displayed && (
            <span className="text-white/50">…</span>
          )}
          {displayed && (
            <span className="font-serif-display italic text-white">
              {displayed}
              {isSpeaking && <span className="ml-1 inline-block w-2 animate-pulse">▍</span>}
            </span>
          )}
        </motion.div>

        {status === "ready" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            onClick={() => {
              rtRef.current?.close();
              ttsRef.current?.cancel();
              router.push("/chat");
            }}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-[var(--mira-accent)]/50 bg-[var(--mira-accent)]/10 text-2xl text-[var(--mira-accent)] transition hover:bg-[var(--mira-accent)]/25"
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

        {source && (
          <p className="text-xs text-white/25">
            {source === "realtime"
              ? locale === "zh"
                ? "Mira 正在直接对你说话"
                : "Mira is speaking to you directly"
              : locale === "zh"
                ? "离线演示声音"
                : "offline fallback voice"}
            {errorNote && source === "fallback" ? ` · ${errorNote}` : null}
          </p>
        )}
      </div>

      <style jsx global>{`
        @keyframes mira-breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 0.1; }
        }
      `}</style>
    </main>
  );
}
