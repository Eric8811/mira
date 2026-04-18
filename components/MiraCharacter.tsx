"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";

type State = "idle" | "thinking" | "speaking";

export function MiraCharacter({
  archetype,
  state = "idle",
  size = 280,
  analyser,
}: {
  archetype: Archetype;
  state?: State;
  size?: number;
  analyser?: AnalyserNode | null;
}) {
  const meta = ARCHETYPE_META[archetype];
  const auraRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Audio-driven pulsation. When analyser delivers real signal (speaking), we
  // pulse to the voice. When idle/thinking, we fall back to a time-based
  // oscillator so the orb always feels alive — thinking oscillates faster to
  // hint "she's working on it".
  useEffect(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);

    let smoothed = 0;
    const t0 = performance.now();
    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      const n = Math.min(data.length, 64);
      for (let i = 0; i < n; i++) sum += data[i];
      const raw = sum / n / 255;
      smoothed = smoothed * 0.75 + Math.pow(raw, 0.7) * 0.25;

      // Time-based fallback oscillation when audio is silent.
      const t = (performance.now() - t0) / 1000;
      const thinkPulse = (Math.sin(t * 2 * Math.PI / 1.1) + 1) / 2; // period 1.1s
      const idlePulse = (Math.sin(t * 2 * Math.PI / 4.0) + 1) / 2; // period 4s
      const fallback =
        state === "thinking" ? thinkPulse * 0.35 : idlePulse * 0.18;

      // Use whichever is larger — real voice wins when present.
      const level = Math.max(smoothed, fallback);

      if (auraRef.current) {
        const s = 1 + level * 0.35;
        const o = 0.3 + level * 0.6;
        auraRef.current.style.transform = `scale(${s.toFixed(3)})`;
        auraRef.current.style.opacity = o.toFixed(3);
      }
      if (innerRef.current) {
        const s = 1 + level * 0.06;
        innerRef.current.style.transform = `scale(${s.toFixed(3)})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (auraRef.current) {
        auraRef.current.style.transform = "";
        auraRef.current.style.opacity = "";
      }
      if (innerRef.current) innerRef.current.style.transform = "";
    };
  }, [analyser, state]);

  const useAnalyser = !!analyser;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`${meta.nameEn} archetype`}
    >
      {useAnalyser ? (
        <div
          ref={auraRef}
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${meta.accent}40 0%, ${meta.accent}10 45%, transparent 70%)`,
            transform: "scale(1)",
            opacity: 0.3,
            transformOrigin: "center",
            transition: "none",
          }}
        />
      ) : (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${meta.accent}40 0%, ${meta.accent}10 45%, transparent 70%)`,
          }}
          animate={
            state === "speaking"
              ? { scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }
              : { scale: [1, 1.05, 1], opacity: [0.35, 0.55, 0.35] }
          }
          transition={{
            duration: state === "speaking" ? 2 : 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {useAnalyser ? (
        <div
          ref={innerRef}
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: size * 0.72,
            height: size * 0.72,
            background: `radial-gradient(circle at 40% 30%, ${meta.accent}, ${meta.background})`,
            boxShadow: `0 0 40px ${meta.accent}55, inset 0 0 30px ${meta.background}`,
            transformOrigin: "center",
            transition: "none",
          }}
        >
          <StarGlyph color={meta.accent} size={size * 0.32} />
        </div>
      ) : (
        <motion.div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: size * 0.72,
            height: size * 0.72,
            background: `radial-gradient(circle at 40% 30%, ${meta.accent}, ${meta.background})`,
            boxShadow: `0 0 40px ${meta.accent}55, inset 0 0 30px ${meta.background}`,
          }}
          animate={
            state === "speaking"
              ? { scale: [1, 1.03, 1], y: 0 }
              : { y: [0, -4, 0], scale: 1 }
          }
          transition={{
            duration: state === "speaking" ? 1.5 : 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <StarGlyph color={meta.accent} size={size * 0.32} />
        </motion.div>
      )}
    </div>
  );
}

function StarGlyph({ color, size }: { color: string; size: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      style={{ filter: `drop-shadow(0 0 8px ${color})` }}
    >
      <path
        d="M50 10 L58 38 L88 38 L63 56 L72 84 L50 68 L28 84 L37 56 L12 38 L42 38 Z"
        fill={color}
        opacity={0.9}
      />
    </svg>
  );
}
