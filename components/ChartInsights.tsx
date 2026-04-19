"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";
import { INSIGHTS, type InsightTab } from "@/lib/chart-insights";

const TAB_LABELS: Record<InsightTab, { zh: string; en: string; icon: string }> = {
  personality: { zh: "性格", en: "Self", icon: "✦" },
  love: { zh: "感情", en: "Love", icon: "❤" },
  career: { zh: "事业", en: "Work", icon: "◆" },
  wellbeing: { zh: "身心", en: "Wellbeing", icon: "☯" },
  fortune: { zh: "近势", en: "Now", icon: "☽" },
};

const TAB_ORDER: InsightTab[] = ["personality", "love", "career", "wellbeing", "fortune"];

export function ChartInsights({
  open,
  onClose,
  archetype,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  archetype: Archetype;
  locale: "en" | "zh";
}) {
  const [activeTab, setActiveTab] = useState<InsightTab>("personality");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const meta = ARCHETYPE_META[archetype];
  const passage = INSIGHTS[archetype][activeTab][locale];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[90] mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border-t border-white/10 bg-[#0C0619]/95 backdrop-blur-xl shadow-2xl sm:bottom-4 sm:rounded-[28px] sm:border"
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
              boxShadow:
                "0 -20px 60px -10px rgba(80, 50, 140, 0.5), 0 0 40px -10px rgba(212, 175, 55, 0.25)",
            }}
          >
            {/* Header */}
            <div className="relative flex items-center gap-4 border-b border-white/5 px-6 py-5">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${meta.accent}, ${meta.background})`,
                  boxShadow: `0 0 20px ${meta.accent}55`,
                }}
              >
                <span className="text-lg text-white/90">✦</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  {locale === "zh" ? "你的命盘解读" : "Your chart reading"}
                </span>
                <span className="font-serif-display text-xl text-white">
                  {locale === "zh" ? meta.nameZh : meta.nameEn}
                </span>
              </div>
              <button
                onClick={onClose}
                className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition active:scale-95 hover:bg-white/10"
                aria-label={locale === "zh" ? "关闭" : "Close"}
              >
                ✕
              </button>
            </div>

            {/* Tab bar — horizontal scroll on tight screens */}
            <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-white/5 px-4 py-2">
              {TAB_ORDER.map((tab) => {
                const isActive = activeTab === tab;
                const label = TAB_LABELS[tab][locale];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                      isActive
                        ? "bg-[var(--mira-accent)]/15 text-[var(--mira-accent)]"
                        : "text-white/55 hover:text-white/85"
                    }`}
                  >
                    <span className="mr-1.5 text-[10px] opacity-70">{TAB_LABELS[tab].icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Body — scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${locale}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4 whitespace-pre-wrap font-serif-display text-[15px] leading-[1.75] text-white/85 sm:text-base"
                >
                  {passage.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </motion.div>
              </AnimatePresence>

              <div className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-white/25">
                {locale === "zh" ? "读完之后，跟 Mira 聊聊" : "When you're done, talk to Mira"}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
