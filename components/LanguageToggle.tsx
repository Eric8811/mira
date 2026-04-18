"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "./I18nProvider";

export function LanguageToggle() {
  const { toggle } = useLocale();
  const t = useTranslations("common");
  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed right-4 top-4 z-50 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur transition hover:border-white/40 hover:text-white sm:right-6 sm:top-6 sm:px-4 sm:py-1.5 sm:text-sm"
      style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      aria-label="Toggle language"
    >
      {t("languageToggle")}
    </button>
  );
}
