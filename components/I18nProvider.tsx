"use client";

import { AbstractIntlMessages, NextIntlClientProvider } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";

export type Locale = "en" | "zh";

const MESSAGES: Record<Locale, AbstractIntlMessages> = {
  en: enMessages as AbstractIntlMessages,
  zh: zhMessages as AbstractIntlMessages,
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggle: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <I18nProvider>");
  return ctx;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("mira-locale") as Locale | null) : null;
    if (saved === "en" || saved === "zh") setLocaleState(saved);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") localStorage.setItem("mira-locale", next);
  }, []);

  const toggle = useCallback(() => {
    setLocale(locale === "en" ? "zh" : "en");
  }, [locale, setLocale]);

  const value = useMemo(() => ({ locale, setLocale, toggle }), [locale, setLocale, toggle]);

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
