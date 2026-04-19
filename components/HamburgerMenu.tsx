"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";
import type { Locale } from "@/components/I18nProvider";

type MenuAction =
  | { type: "open-insights" }
  | { type: "open-match" }
  | { type: "toggle-locale" };

export function HamburgerMenu({
  open,
  onClose,
  archetype,
  locale,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  archetype: Archetype;
  locale: Locale;
  onAction: (action: MenuAction) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const meta = ARCHETYPE_META[archetype];
  const items: { icon: string; label: string; action: MenuAction }[] = [
    {
      icon: "✦",
      label: locale === "zh" ? "命盘解读" : "Chart Reading",
      action: { type: "open-insights" },
    },
    {
      icon: "❤",
      label: locale === "zh" ? "合盘·和谁" : "Read a Match",
      action: { type: "open-match" },
    },
    {
      icon: "🌐",
      label: locale === "zh" ? "Language · English" : "语言 · 中文",
      action: { type: "toggle-locale" },
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed left-0 top-0 z-[75] h-[100dvh] w-[80%] max-w-sm overflow-y-auto border-r border-white/10 bg-[#0C0619]/95 backdrop-blur-xl"
            style={{
              paddingTop: "max(1.5rem, env(safe-area-inset-top))",
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
              boxShadow: "20px 0 60px -10px rgba(80, 50, 140, 0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pb-6">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${meta.accent}, ${meta.background})`,
                  boxShadow: `0 0 16px ${meta.accent}55`,
                }}
              >
                ✦
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Mira</span>
                <span className="font-serif-display text-base text-white">
                  {locale === "zh" ? meta.nameZh : meta.nameEn}
                </span>
              </div>
            </div>

            <div className="mx-4 border-t border-white/5" />

            {/* Menu items */}
            <nav className="flex flex-col px-3 py-4">
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onAction(item.action);
                    onClose();
                  }}
                  className="flex items-center gap-4 rounded-2xl px-4 py-3 text-left text-white/85 transition hover:bg-white/5 active:bg-white/10"
                >
                  <span className="w-6 text-center text-lg" style={{ color: meta.accent }}>
                    {item.icon}
                  </span>
                  <span className="text-[15px]">{item.label}</span>
                </button>
              ))}

              {/* External link separator */}
              <div className="mx-4 my-2 border-t border-white/5" />

              <a
                href="https://tally.so/r/lblKJp"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center gap-4 rounded-2xl px-4 py-3 text-left text-white/85 transition hover:bg-white/5 active:bg-white/10"
              >
                <span className="w-6 text-center text-lg" style={{ color: meta.accent }}>
                  💬
                </span>
                <span className="flex-1 text-[15px]">
                  {locale === "zh" ? "反馈建议" : "Share Feedback"}
                </span>
                <span className="text-xs text-white/30">↗</span>
              </a>
            </nav>

            <div className="mx-4 border-t border-white/5" />

            <div className="px-6 pt-6 text-[10px] uppercase tracking-[0.25em] text-white/25">
              Mira · {locale === "zh" ? "从你出生，我就认识你了。" : "Born knowing you."}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
