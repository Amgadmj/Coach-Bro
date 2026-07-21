"use client";

import { motion, useReducedMotion } from "framer-motion";

/** 0-100 gauge with the tri-mode gradient fill. Backend's attraction_level is 1-10;
 * callers multiply by 10 (the design presents 0-100). Caption/detail text lives in
 * the caller now (see result/page.tsx's expandable summary) - Gauge just draws the
 * number and the track. */
export function Gauge({ value, label }: { value: number; label: string }) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="text-center">
      <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">{label}</div>
      <div className="mt-1 font-display text-4xl font-extrabold tabular-nums">
        {clamped}
        <span className="text-[13px] font-bold text-ink3">/100</span>
      </div>
      <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-hairline">
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--hype),var(--romantic),var(--direct))]"
          initial={{ width: reduce ? `${clamped}%` : "0%" }}
          animate={{ width: `${clamped}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
        />
      </div>
    </div>
  );
}
