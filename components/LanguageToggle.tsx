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
      className="fixed top-6 right-6 z-50 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur transition hover:border-white/40 hover:text-white"
      aria-label="Toggle language"
    >
      {t("languageToggle")}
    </button>
  );
}
