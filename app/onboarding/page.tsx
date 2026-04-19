"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useLocale } from "@/components/I18nProvider";
import { getChart, extractKeyStars } from "@/lib/chart";
import { getArchetypeFromMainStar } from "@/lib/archetype-map";
import { saveSession } from "@/lib/session";
import { DEMO_CHARTS } from "@/lib/demo-charts";

export default function Onboarding() {
  const t = useTranslations("onboarding");
  const { locale } = useLocale();
  const router = useRouter();

  const [dob, setDob] = useState("1993-07-15");
  const [birthHour, setBirthHour] = useState(6);
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("female");
  const [submitting, setSubmitting] = useState(false);
  const [dobError, setDobError] = useState<string | null>(null);

  const hours = Array.from({ length: 12 }, (_, i) => i);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDobError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setDobError(locale === "zh" ? "日期格式无效" : "Invalid date");
      return;
    }
    setSubmitting(true);

    const dobNormalized = dob.replace(/-0?/g, "-").replace(/^-/, "");
    const effectiveHour = timeUnknown ? 6 : birthHour;

    try {
      const astrolabe = getChart({
        dob: dobNormalized,
        birthHour: effectiveHour,
        gender,
        locale,
        timeUnknown,
      });
      const stars = extractKeyStars(astrolabe);
      const archetype = getArchetypeFromMainStar(stars.mainStar);

      saveSession({
        dob: dobNormalized,
        birthHour: effectiveHour,
        gender,
        timeUnknown,
        locale,
        archetype,
        keyStars: stars,
      });
    } catch (err) {
      console.error("iztro failed, falling back to demo chart", err);
      const demo = DEMO_CHARTS[0];
      saveSession({
        dob: demo.dob,
        birthHour: demo.birthHour,
        gender: demo.gender,
        timeUnknown,
        locale,
        archetype: demo.archetype,
        keyStars: demo.keyStars,
      });
    }

    router.push("/reveal");
  }

  return (
    <main
      className="mira-stars relative flex min-h-[100dvh] items-start justify-center px-4 py-8 sm:items-center"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-6"
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-6 rounded-full bg-[var(--mira-accent)]" />
          <span className="h-1.5 w-3 rounded-full bg-white/15" />
        </div>

        {/* Floating card */}
        <div
          className="w-full space-y-7 rounded-[28px] border border-[var(--mira-accent)]/20 bg-black/45 p-6 backdrop-blur-xl sm:p-8"
          style={{
            boxShadow:
              "0 20px 60px -20px rgba(80, 50, 140, 0.45), 0 0 40px -10px rgba(212, 175, 55, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div className="space-y-2 text-center">
            <h1 className="font-serif-display text-2xl font-medium leading-snug sm:text-3xl">
              {t("heading")}
            </h1>
            <p className="font-serif-display text-sm italic text-white/55 sm:text-base">
              {t("subtitle")}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-[0.25em] text-white/50">
              {t("dobLabel")}
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-base text-white transition focus:border-[var(--mira-accent)]/60 focus:bg-white/10 focus:outline-none"
              required
            />
            {dobError && <p className="text-sm text-red-400">{dobError}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-[0.25em] text-white/50">
              {t("timeLabel")}
            </label>
            <div className="relative">
              <select
                value={birthHour}
                onChange={(e) => setBirthHour(Number(e.target.value))}
                disabled={timeUnknown}
                className="w-full appearance-none rounded-2xl border border-white/15 bg-white/5 px-4 py-4 pr-10 text-base text-white transition focus:border-[var(--mira-accent)]/60 focus:bg-white/10 focus:outline-none disabled:opacity-40"
              >
                {hours.map((h) => (
                  <option key={h} value={h} className="bg-[#1A0E2E] text-white">
                    {t(`hours.${h}`)}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                viewBox="0 0 20 20"
                aria-hidden
              >
                <path d="M5.25 7.75L10 12.5l4.75-4.75" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-3 py-1 text-sm text-white/65">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
                className="h-[18px] w-[18px] rounded-md border-white/30 bg-white/5 accent-[var(--mira-accent)]"
              />
              {t("timeUnknownLabel")}
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-[0.25em] text-white/50">
              {t("genderLabel")}
            </label>
            <div className="flex gap-3">
              {(["female", "male"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 rounded-2xl border px-4 py-4 text-base transition active:scale-[0.98] ${
                    gender === g
                      ? "border-[var(--mira-accent)]/70 bg-[var(--mira-accent)]/15 text-white shadow-[0_0_20px_-5px_rgba(212,175,55,0.4)]"
                      : "border-white/15 bg-white/5 text-white/65 hover:border-white/30"
                  }`}
                >
                  {g === "female" ? t("genderFemale") : t("genderMale")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="relative w-full overflow-hidden rounded-full py-4 text-sm font-medium uppercase tracking-[0.28em] text-white transition active:scale-[0.97] disabled:opacity-60"
          style={{
            minHeight: 56,
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.9) 0%, rgba(212, 175, 55, 0.85) 100%)",
            boxShadow: "0 10px 30px -8px rgba(124, 58, 237, 0.5), 0 0 20px -5px rgba(212, 175, 55, 0.3)",
          }}
        >
          <span className="relative z-10">{submitting ? "…" : `✦  ${t("submit")}`}</span>
        </button>
      </motion.form>
    </main>
  );
}
