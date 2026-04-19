"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export default function Landing() {
  const t = useTranslations("landing");

  return (
    <main
      className="mira-stars relative flex min-h-[100dvh] flex-col items-center justify-center px-8 text-center"
      style={{
        paddingTop: "max(3rem, env(safe-area-inset-top))",
        paddingBottom: "max(3rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="relative z-10 flex flex-col items-center gap-20 sm:gap-28">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
          className="flex w-full max-w-[520px] flex-col items-center gap-5"
        >
          {/* Golden orb — echoes the i-dot in the brand mark and the in-app orb */}
          <div
            className="h-[14px] w-[14px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 40% 35%, #FCE9A8 0%, #F59E0B 60%, rgba(245,158,11,0.2) 100%)",
              boxShadow:
                "0 0 18px rgba(251, 191, 36, 0.75), 0 0 38px rgba(251, 191, 36, 0.35)",
            }}
          />

          {/* Wordmark */}
          <h1
            className="font-serif-display italic leading-none"
            style={{
              fontSize: "clamp(80px, 18vw, 140px)",
              fontWeight: 500,
              color: "#F5E9C9",
              letterSpacing: "-0.02em",
            }}
          >
            mira
          </h1>

          {/* Golden divider */}
          <div
            className="h-px w-10"
            style={{
              background:
                "linear-gradient(to right, transparent 0%, #F59E0B 50%, transparent 100%)",
            }}
          />

          {/* Slogan */}
          <p
            className="uppercase"
            style={{
              fontSize: "clamp(11px, 2.5vw, 13px)",
              letterSpacing: "0.35em",
              color: "rgba(255, 255, 255, 0.72)",
              fontWeight: 300,
            }}
          >
            Born Knowing You
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
        >
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-full px-10 py-4 text-sm font-medium uppercase tracking-[0.28em] text-white transition active:scale-[0.97]"
            style={{
              minHeight: 56,
              background:
                "linear-gradient(135deg, rgba(168, 85, 247, 0.95) 0%, rgba(232, 185, 97, 0.9) 100%)",
              boxShadow:
                "0 12px 32px -8px rgba(168, 85, 247, 0.55), 0 0 48px -10px rgba(232, 185, 97, 0.3)",
            }}
          >
            ✦ {t("cta")}
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
