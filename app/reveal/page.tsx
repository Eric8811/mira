"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { MiraCharacter } from "@/components/MiraCharacter";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";
import { loadSession } from "@/lib/session";
import { useLocale } from "@/components/I18nProvider";

export default function Reveal() {
  const t = useTranslations("reveal");
  const { locale } = useLocale();
  const router = useRouter();
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/onboarding");
      return;
    }
    setArchetype(s.archetype);

    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [router]);

  if (!archetype) return null;
  const meta = ARCHETYPE_META[archetype];
  const name = locale === "zh" ? meta.nameZh : meta.nameEn;

  return (
    <main
      className="mira-stars relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8"
      style={{
        background: `radial-gradient(ellipse at center, ${meta.background} 0%, #0B0618 80%)`,
      }}
    >
      {/* Particle convergence phase */}
      <AnimatePresence>
        {phase === 0 && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-white"
                initial={{
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  opacity: 0,
                }}
                animate={{
                  x: "50vw",
                  y: "50vh",
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 1, ease: "easeIn", delay: Math.random() * 0.3 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <MiraCharacter archetype={archetype} state="idle" size={320} />
        </motion.div>

        <div className="flex min-h-[6rem] flex-col items-center gap-3">
          {phase >= 2 && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="font-serif-display text-4xl text-white md:text-5xl"
              style={{ color: meta.accent }}
            >
              <TypewriterText text={name} />
            </motion.h1>
          )}
          {phase >= 3 && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-white/70"
            >
              {t("subtitle")}
            </motion.p>
          )}
        </div>

        {phase >= 4 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={() => router.push("/chat")}
            className="mt-8 rounded-full border border-white/30 px-6 py-2 text-sm uppercase tracking-[0.25em] text-white/80 transition hover:border-white/60 hover:text-white"
          >
            {t("continue")}
          </motion.button>
        )}
      </div>
    </main>
  );
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [text]);
  return <span>{displayed}</span>;
}
