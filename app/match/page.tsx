"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { MiraCharacter } from "@/components/MiraCharacter";
import {
  ARCHETYPE_META,
  type Archetype,
} from "@/lib/archetype-map";
import { loadSession, type MiraSession } from "@/lib/session";
import { useLocale } from "@/components/I18nProvider";
import { getChart, extractKeyStars } from "@/lib/chart";
import { getArchetypeFromMainStar } from "@/lib/archetype-map";
import { RealtimeSession } from "@/lib/RealtimeSession";
import { WS_PROXY_URL } from "@/lib/realtime-config";
import {
  buildMatchInstructions,
  buildMatchTrigger,
  compatibilityStars,
  type MatchSubject,
} from "@/lib/match-prompts";

type Phase = "form" | "reading" | "done";

const RELATIONSHIP_TAGS_EN = ["partner", "friend", "family", "colleague", "ex", "crush"];
const RELATIONSHIP_TAGS_ZH = ["伴侣", "朋友", "家人", "同事", "前任", "暗恋对象"];

export default function Match() {
  const { locale } = useLocale();
  const router = useRouter();
  const t = useTranslations("match");
  const tOn = useTranslations("onboarding");

  const [session, setSession] = useState<MiraSession | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [dob, setDob] = useState("1993-07-15");
  const [birthHour, setBirthHour] = useState(6);
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [relationship, setRelationship] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState<MatchSubject | null>(null);
  const [status, setStatus] = useState<"connecting" | "speaking" | "done">("connecting");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const rtRef = useRef<RealtimeSession | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/onboarding");
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    return () => {
      rtRef.current?.close();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSubmitting(true);

    const dobNormalized = dob.replace(/-0?/g, "-").replace(/^-/, "");
    const effectiveHour = timeUnknown ? 6 : birthHour;

    let archetype: Archetype = "sovereign";
    let keyStars: ReturnType<typeof extractKeyStars> = {} as ReturnType<typeof extractKeyStars>;
    try {
      const astrolabe = getChart({
        dob: dobNormalized,
        birthHour: effectiveHour,
        gender,
        locale,
        timeUnknown,
      });
      keyStars = extractKeyStars(astrolabe);
      archetype = getArchetypeFromMainStar(keyStars.mainStar);
    } catch (err) {
      console.warn("[match] iztro fallback", err);
      archetype = "flame";
    }

    const sub: MatchSubject = {
      dob: dobNormalized,
      birthHour: effectiveHour,
      gender,
      timeUnknown,
      mainStar: keyStars.mainStar,
      mainStarPosition: keyStars.mainStarPosition,
      archetype,
    };
    setSubject(sub);
    setPhase("reading");

    // Kick off the Realtime reading
    const relLabel =
      relationship ||
      (locale === "zh" ? "还没定义" : "undefined yet");

    const rt = new RealtimeSession({
      onAudioStart: () => setStatus("speaking"),
      onResponseDone: () => {
        setStatus("done");
        setPhase("done");
      },
      onError: (err) => console.warn("[match] realtime error", err.message),
      onClose: (code, reason) => console.log("[match] ws close", code, reason),
    });
    rtRef.current = rt;

    try {
      await rt.connect({
        proxyUrl: WS_PROXY_URL,
        instructions: buildMatchInstructions(session, sub, relLabel, locale),
        voice: "Cherry",
        turnDetection: false,
      });
      setAnalyser(rt.getOutputAnalyser());
      rt.triggerResponse(buildMatchTrigger(locale));
    } catch (e) {
      console.error("[match] connect failed", e);
      setStatus("done");
      setPhase("done");
    }
    setSubmitting(false);
  }

  function replay() {
    if (!rtRef.current) return;
    setStatus("speaking");
    setPhase("reading");
    rtRef.current.triggerResponse(buildMatchTrigger(locale));
  }

  if (!session) return null;

  if (phase === "form") {
    return (
      <main className="mira-stars relative flex min-h-screen items-center justify-center px-8 py-16">
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-lg space-y-8"
        >
          <h1 className="font-serif-display text-center text-3xl font-medium leading-snug md:text-4xl">
            {t("heading")}
          </h1>

          <div className="space-y-2">
            <label className="block text-sm uppercase tracking-[0.2em] text-white/60">
              {tOn("dobLabel")}
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-[var(--mira-accent)] focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm uppercase tracking-[0.2em] text-white/60">
              {tOn("timeLabel")}
            </label>
            <select
              value={birthHour}
              onChange={(e) => setBirthHour(Number(e.target.value))}
              disabled={timeUnknown}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-[var(--mira-accent)] focus:outline-none disabled:opacity-50"
            >
              {Array.from({ length: 12 }, (_, i) => i).map((h) => (
                <option key={h} value={h} className="bg-[#1A0E2E]">
                  {tOn(`hours.${h}`)}
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
              {tOn("timeUnknownLabel")}
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm uppercase tracking-[0.2em] text-white/60">
              {tOn("genderLabel")}
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
                  {g === "female" ? tOn("genderFemale") : tOn("genderMale")}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm uppercase tracking-[0.2em] text-white/60">
              {t("relationshipLabel")}
            </label>
            <div className="flex flex-wrap gap-2">
              {(locale === "zh" ? RELATIONSHIP_TAGS_ZH : RELATIONSHIP_TAGS_EN).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setRelationship((cur) => (cur === tag ? "" : tag))}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    relationship === tag
                      ? "border-[var(--mira-accent)] bg-[var(--mira-accent)]/15 text-white"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  {tag}
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

  // reading / done: split screen
  const userMeta = ARCHETYPE_META[session.archetype];
  const otherMeta = subject ? ARCHETYPE_META[subject.archetype] : userMeta;
  const stars = subject ? compatibilityStars(session.archetype, subject.archetype) : 4;

  return (
    <main
      className="mira-stars relative flex min-h-screen flex-col items-center justify-center px-8 py-12"
      style={{
        background: `linear-gradient(135deg, ${userMeta.background}88 0%, #0B0618 50%, ${otherMeta.background}88 100%)`,
      }}
    >
      {/* compatibility stars */}
      <div className="fixed top-8 left-1/2 z-10 -translate-x-1/2 text-lg tracking-[0.4em] text-[var(--mira-accent)]/80">
        {"★".repeat(stars)}
        <span className="text-white/15">{"★".repeat(5 - stars)}</span>
      </div>

      <div className="relative z-10 flex w-full max-w-5xl items-center justify-between gap-6 md:gap-16">
        {/* User side */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-1 flex-col items-center gap-3"
          style={{ transform: "rotate(-2deg)" }}
        >
          <MiraCharacter
            archetype={session.archetype}
            state={status === "speaking" ? "speaking" : "idle"}
            size={200}
            analyser={analyser}
          />
          <div className="text-center text-xs uppercase tracking-[0.3em] text-white/50">
            {locale === "zh" ? "你" : "you"}
          </div>
        </motion.div>

        {/* Connection line */}
        <div className="relative h-48 w-24 md:w-48">
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="match-line" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor={userMeta.accent} stopOpacity="0.8" />
                <stop offset="50%" stopColor="#fff" stopOpacity="1" />
                <stop offset="100%" stopColor={otherMeta.accent} stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <motion.path
              d="M 0 100 Q 100 60 200 100"
              stroke="url(#match-line)"
              strokeWidth="1.5"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
            />
            <motion.path
              d="M 0 100 Q 100 140 200 100"
              stroke="url(#match-line)"
              strokeWidth="1"
              fill="none"
              strokeDasharray="3 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 2.2, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
        </div>

        {/* Other side */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-1 flex-col items-center gap-3"
          style={{ transform: "rotate(2deg)" }}
        >
          {subject && (
            <MiraCharacter
              archetype={subject.archetype}
              state={status === "speaking" ? "speaking" : "idle"}
              size={200}
            />
          )}
          <div className="text-center text-xs uppercase tracking-[0.3em] text-white/50">
            {relationship || (locale === "zh" ? "ta" : "them")}
          </div>
        </motion.div>
      </div>

      {/* controls */}
      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 flex gap-3"
          >
            <button
              onClick={replay}
              className="rounded-full border border-white/20 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white/80 backdrop-blur transition hover:border-white/40"
            >
              {locale === "zh" ? "再听一遍" : "Hear it again"}
            </button>
            <button
              onClick={() => {
                rtRef.current?.close();
                router.push("/chat");
              }}
              className="rounded-full border border-white/20 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white/80 backdrop-blur transition hover:border-white/40"
            >
              {locale === "zh" ? "返回" : "Back"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
