"use client";

import { motion } from "framer-motion";
import { ARCHETYPE_META, type Archetype } from "@/lib/archetype-map";

type State = "idle" | "speaking";

export function MiraCharacter({
  archetype,
  state = "idle",
  size = 280,
}: {
  archetype: Archetype;
  state?: State;
  size?: number;
}) {
  const meta = ARCHETYPE_META[archetype];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`${meta.nameEn} archetype`}
    >
      {/* Aura */}
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
      {/* Character silhouette (placeholder geometric) */}
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
        {/* Inner glyph (star-like) */}
        <svg
          viewBox="0 0 100 100"
          width={size * 0.32}
          height={size * 0.32}
          aria-hidden
          style={{ filter: `drop-shadow(0 0 8px ${meta.accent})` }}
        >
          <path
            d="M50 10 L58 38 L88 38 L63 56 L72 84 L50 68 L28 84 L37 56 L12 38 L42 38 Z"
            fill={meta.accent}
            opacity={0.9}
          />
        </svg>
      </motion.div>
    </div>
  );
}
