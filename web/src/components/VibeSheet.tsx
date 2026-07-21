"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { MODES, useSession } from "@/lib/session";
import type { SocialMode } from "@/lib/types";
import { clsx } from "@/lib/clsx";
import { ClayButton } from "./ClayButton";

/** Once-per-session bottom sheet over the dashboard (handoff screen 02). */
export function VibeSheet() {
  const { modeLocked, mode, lockMode } = useSession();
  const [selected, setSelected] = useState<SocialMode>(mode);

  return (
    <AnimatePresence>
      {!modeLocked && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--scrim)] p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Pick your Social Mode"
            className="w-full max-w-md rounded-card-lg border border-glass-line bg-glass-strong p-4 shadow-card backdrop-blur-2xl"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
              First thing tonight
            </div>
            <h2 className="mt-0.5 font-display text-lg font-extrabold">What&apos;s your mode?</h2>
            <p className="mt-0.5 text-[11px] text-ink2">
              Pick one — it tints the whole night. Change it anytime.
            </p>
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              {(Object.keys(MODES) as SocialMode[]).map((m) => (
                <motion.button
                  key={m}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelected(m)}
                  className={clsx(
                    "rounded-2xl bg-glass p-2.5 text-left",
                    selected === m
                      ? "shadow-[0_0_0_2px_var(--mode),var(--card-shadow)]"
                      : "border border-glass-line",
                  )}
                  style={selected === m ? { boxShadow: `0 0 0 2px var(--${m}), var(--card-shadow)` } : undefined}
                >
                  <Image
                    src={MODES[m].img}
                    alt=""
                    width={280}
                    height={140}
                    className="h-[70px] w-full rounded-xl object-cover"
                  />
                  <div
                    className="mt-1.5 font-display text-[13px] font-extrabold"
                    style={selected === m ? { color: `var(--${m})` } : undefined}
                  >
                    {MODES[m].name}
                  </div>
                  <div className="text-[10px] leading-snug text-ink2">{MODES[m].desc}</div>
                </motion.button>
              ))}
            </div>
            <ClayButton
              variant="mode"
              className="mt-3.5"
              onClick={() => lockMode(selected)}
            >
              {MODES[selected].buttonLabel}
            </ClayButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
