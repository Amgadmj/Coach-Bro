"use client";

import { useLayoutEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useT } from "@/lib/i18n";
import { useTutorial, type TutorialPageKey } from "@/lib/tutorial";

export interface CoachmarkStep {
  /** Matches the `data-tutorial="<target>"` attribute on the wrapper div
   * placed around whatever this step is pointing at. */
  target: string;
  titleKey: string;
  bodyKey: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const RING_PAD = 8;
const CARD_HEIGHT_ESTIMATE = 200;

/** Anchored spotlight + callout for one screen's onboarding sequence. Renders
 * nothing unless this screen's sequence is the one currently active in the
 * shared tutorial store (see lib/tutorial.ts) - every screen mounts its own
 * <Coachmark> with its own step list, keyed off the same `page` identity it
 * passed to `startPage`. */
export function Coachmark({ page, steps }: { page: TutorialPageKey; steps: CoachmarkStep[] }) {
  const activePage = useTutorial((s) => s.activePage);
  const activeStep = useTutorial((s) => s.activeStep);
  const next = useTutorial((s) => s.next);
  const back = useTutorial((s) => s.back);
  const skipPage = useTutorial((s) => s.skipPage);
  const t = useT();
  const [rect, setRect] = useState<Rect | null>(null);

  const active = activePage === page;
  const step = active ? steps[activeStep] : null;

  useLayoutEffect(() => {
    if (!active || !step) {
      setRect(null);
      return;
    }
    const target = step.target;
    function measure() {
      const el = document.querySelector(`[data-tutorial="${target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    const el = document.querySelector(`[data-tutorial="${target}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    measure();
    const settleId = window.setTimeout(measure, 320);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(settleId);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // `step` changes identity every activeStep change, which is what should
    // re-trigger measurement - target alone would miss a re-run if two
    // consecutive steps ever shared a target string.
  }, [active, step]);

  if (!active || !step) return null;

  const isLast = activeStep === steps.length - 1;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const placeBelow = !rect || rect.top < viewportH / 2;
  const cardTop = rect
    ? placeBelow
      ? Math.min(rect.top + rect.height + RING_PAD * 2 + 12, viewportH - CARD_HEIGHT_ESTIMATE)
      : Math.max(rect.top - RING_PAD * 2 - 12 - CARD_HEIGHT_ESTIMATE, 16)
    : viewportH * 0.4;

  return (
    <AnimatePresence>
      <motion.div
        key="coachmark-scrim"
        className="fixed inset-0 z-[70]"
        style={{ background: "var(--scrim)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={next}
      />

      {rect && (
        <motion.div
          key="coachmark-ring"
          className="pointer-events-none fixed z-[71] rounded-2xl"
          style={{
            top: rect.top - RING_PAD,
            left: rect.left - RING_PAD,
            width: rect.width + RING_PAD * 2,
            height: rect.height + RING_PAD * 2,
            boxShadow: "0 0 0 3px var(--accent), 0 0 26px var(--accent-glow)",
          }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        />
      )}

      <motion.div
        key={`coachmark-card-${page}-${activeStep}`}
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 z-[72] mx-auto max-w-[26rem] rounded-card border border-glass-line bg-glass-strong p-4 shadow-card backdrop-blur-2xl"
        style={{ top: cardTop }}
        initial={{ opacity: 0, y: placeBelow ? -8 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
            {t("tutorial.stepOf", { step: activeStep + 1, total: steps.length })}
          </span>
          <button
            type="button"
            onClick={skipPage}
            className="interactive tap-expand text-[10px] font-bold text-ink3"
          >
            {t("tutorial.skip")}
          </button>
        </div>

        <h3 className="mt-1.5 font-display text-base font-extrabold">{t(step.titleKey)}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">{t(step.bodyKey)}</p>

        <div className="mt-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            aria-label={t("tutorial.back")}
            className="interactive tap-expand rounded-full border border-hairline bg-glass px-3.5 py-1.5 text-[11px] font-bold text-ink2 disabled:opacity-0"
            style={{ visibility: activeStep === 0 ? "hidden" : "visible" }}
          >
            {t("tutorial.back")}
          </button>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: i === activeStep ? "var(--accent)" : "var(--hairline)" }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="interactive tap-expand rounded-full bg-[linear-gradient(160deg,var(--accent),var(--accent-deep))] px-4 py-1.5 font-display text-[11px] font-bold text-white"
          >
            {isLast ? t("tutorial.done") : t("tutorial.next")}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
