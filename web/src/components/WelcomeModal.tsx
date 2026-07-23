"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useT } from "@/lib/i18n";
import { useTutorial } from "@/lib/tutorial";

const POINT_KEYS = ["welcomePoint1", "welcomePoint2", "welcomePoint3"] as const;

/** First-ever-visit overlay, mounted once in the root layout so it shows
 * regardless of which route a new visitor lands on first. Dismissing it with
 * "Show me around" doesn't itself start any page's coachmark sequence - each
 * screen's own mount effect re-checks `welcomeSeen` and starts its sequence
 * once it's true, so the right tour runs no matter where the user was
 * standing when they dismissed this. */
export function WelcomeModal() {
  const welcomeSeen = useTutorial((s) => s.welcomeSeen);
  const dismissWelcome = useTutorial((s) => s.dismissWelcome);
  const t = useT();

  return (
    <AnimatePresence>
      {!welcomeSeen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--scrim)] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("tutorial.welcomeTitle")}
            className="w-full max-w-md rounded-card-lg border border-glass-line bg-glass-strong p-5 text-center shadow-card backdrop-blur-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--romantic),var(--direct))] text-2xl">
              👋
            </div>
            <h2 className="mt-3 font-display text-lg font-extrabold">{t("tutorial.welcomeTitle")}</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">{t("tutorial.welcomeBody")}</p>

            <ul className="mt-3.5 flex flex-col gap-2 text-start">
              {POINT_KEYS.map((k) => (
                <li
                  key={k}
                  className="flex items-start gap-2 rounded-2xl border border-glass-line bg-glass px-3 py-2 text-[11.5px] text-ink2"
                >
                  <span className="mt-0.5 text-accent-deep">•</span>
                  <span>{t(`tutorial.${k}`)}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => dismissWelcome(true)}
              className="interactive mt-4 w-full rounded-full bg-[linear-gradient(160deg,var(--accent),var(--accent-deep))] px-5 py-3 font-display text-sm font-extrabold text-white shadow-clay"
            >
              {t("tutorial.showMeAround")}
            </button>
            <button
              type="button"
              onClick={() => dismissWelcome(false)}
              className="interactive mt-2 w-full rounded-full px-5 py-2 font-display text-[12px] font-bold text-ink3"
            >
              {t("tutorial.skipTour")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
