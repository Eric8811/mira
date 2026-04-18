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
    <main className="mira-stars relative flex min-h-screen items-center justify-center px-8 py-16">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg space-y-8"
      >
        <h1 className="font-serif-display text-center text-3xl font-medium leading-snug md:text-4xl">
          {t("heading")}
        </h1>

        <div className="space-y-2">
          <label className="block text-sm uppercase tracking-[0.2em] text-white/60">
            {t("dobLabel")}
          </label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-[var(--mira-accent)] focus:outline-none"
            required
          />
          {dobError && <p className="text-sm text-red-400">{dobError}</p>}
        </div>

        <div className="space-y-2">
          <label className="block text-sm uppercase tracking-[0.2em] text-white/60">
            {t("timeLabel")}
          </label>
          <select
            value={birthHour}
            onChange={(e) => setBirthHour(Number(e.target.value))}
            disabled={timeUnknown}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-[var(--mira-accent)] focus:outline-none disabled:opacity-50"
          >
            {hours.map((h) => (
              <option key={h} value={h} className="bg-[#1A0E2E]">
                {t(`hours.${h}`)}
              </option>
            ))}
          </select>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => setTimeUnknown(e.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-white/5 accent-[var(--mira-accent)]"
            />
            {t("timeUnknownLabel")}
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm uppercase tracking-[0.2em] text-white/60">
            {t("genderLabel")}
          </label>
          <div className="flex gap-3">
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 rounded-lg border px-4 py-3 transition ${
                  gender === g
                    ? "border-[var(--mira-accent)] bg-[var(--mira-accent)]/15 text-white"
                    : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                }`}
              >
                {g === "female" ? t("genderFemale") : t("genderMale")}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full border border-[var(--mira-accent)]/60 bg-[var(--mira-accent)]/10 py-4 text-sm font-medium uppercase tracking-[0.25em] text-[var(--mira-accent)] transition hover:bg-[var(--mira-accent)]/20 disabled:opacity-50"
        >
          {submitting ? "…" : t("submit")}
        </button>
      </motion.form>
    </main>
  );
}
