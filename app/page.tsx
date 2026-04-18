"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export default function Landing() {
  const t = useTranslations("landing");

  return (
    <main className="mira-stars relative flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <h1 className="font-serif-display text-5xl font-medium leading-tight text-white md:text-7xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-base text-white/70 md:text-lg">{t("subtitle")}</p>
        <Link
          href="/onboarding"
          className="mt-6 rounded-full border border-[var(--mira-accent)]/60 bg-[var(--mira-accent)]/10 px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-[var(--mira-accent)] transition hover:bg-[var(--mira-accent)]/20"
        >
          {t("cta")}
        </Link>
      </motion.div>
    </main>
  );
}
