"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { MiraCharacter } from "@/components/MiraCharacter";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";
import { loadSession, type MiraSession } from "@/lib/session";
import { useLocale } from "@/components/I18nProvider";

type Status = "loading" | "speaking" | "ready";

export default function Encounter() {
  const tChat = useTranslations("chat");
  const { locale } = useLocale();
  const router = useRouter();

  const [session, setSession] = useState<MiraSession | null>(null);
  const [text, setText] = useState("");
  const [displayed, setDisplayed] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [source, setSource] = useState<"qwen" | "fallback" | null>(null);
  const requestedRef = useRef(false);

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
        const res = await fetch("/api/encounter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
        const data = (await res.json()) as { text: string; source: "qwen" | "fallback" };
        setText(data.text);
        setSource(data.source);
        setStatus("speaking");
      } catch (e) {
        console.error("encounter fetch failed", e);
        setStatus("ready");
      }
    })();
  }, [router]);

  // Typewriter reveal of the text
  useEffect(() => {
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setTimeout(() => setStatus("ready"), 600);
      }
    }, 35);
    return () => clearInterval(id);
  }, [text]);

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
          {status === "loading" && (
            <span className="text-white/50">{locale === "zh" ? "…" : "…"}</span>
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            onClick={() => router.push("/chat")}
            className="rounded-full border border-[var(--mira-accent)]/60 bg-[var(--mira-accent)]/10 px-8 py-3 text-sm font-medium uppercase tracking-[0.25em] text-[var(--mira-accent)] transition hover:bg-[var(--mira-accent)]/20"
          >
            {locale === "zh" ? "开始说" : "Speak"}
          </motion.button>
        )}

        {source === "fallback" && (
          <p className="text-xs text-white/30">
            {locale === "zh" ? "离线演示文本" : "offline demo text"}
          </p>
        )}
        <p className="sr-only">{tChat("holdPlaceholder")}</p>
      </div>
    </main>
  );
}
