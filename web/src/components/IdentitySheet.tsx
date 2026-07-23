"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import type { Gender, InterestedIn } from "@/lib/types";
import { clsx } from "@/lib/clsx";
import { ClayButton } from "./ClayButton";

const GENDER_KEYS: { value: Gender; labelKey: "male" | "female" | "nonBinary" }[] = [
  { value: "male", labelKey: "male" },
  { value: "female", labelKey: "female" },
  { value: "non_binary", labelKey: "nonBinary" },
];

const INTEREST_KEYS: { value: InterestedIn; labelKey: "men" | "women" | "everyone" }[] = [
  { value: "men", labelKey: "men" },
  { value: "women", labelKey: "women" },
  { value: "everyone", labelKey: "everyone" },
];

/** Once-ever, blocking onboarding sheet - asks the two fields that tune
 * pronouns/coaching (see backend/agents/prompts.py::_pronoun_set): the
 * user's own gender, and who they're generally interested in (the default
 * assumed match gender until overridden per-contact - see
 * lib/api.ts::setContactGender). Modeled directly on VibeSheet.tsx's
 * full-screen scrim + bottom-sheet pattern, but unlike Social Mode this
 * never re-shows once answered - gender identity isn't a nightly toggle. */
export function IdentitySheet() {
  const { identityLocked, gender, interestedIn, lockIdentity } = useSession();
  const [selectedGender, setSelectedGender] = useState<Gender | null>(gender);
  const [selectedInterest, setSelectedInterest] = useState<InterestedIn | null>(interestedIn);
  const t = useT();

  const canContinue = selectedGender !== null && selectedInterest !== null;

  return (
    <AnimatePresence>
      {!identityLocked && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-end justify-center bg-[var(--scrim)] p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("identity.sheetTitle")}
            className="w-full max-w-md rounded-card-lg border border-glass-line bg-glass-strong p-4 shadow-card backdrop-blur-2xl"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
              {t("identity.eyebrow")}
            </div>
            <h2 className="mt-0.5 font-display text-lg font-extrabold">{t("identity.sheetTitle")}</h2>
            <p className="mt-0.5 text-[11px] text-ink2">{t("identity.sheetSubtitle")}</p>

            <div className="mt-3.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
              {t("identity.genderLabel")}
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {GENDER_KEYS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedGender(value)}
                  aria-pressed={selectedGender === value}
                  className={clsx(
                    "interactive tap-expand rounded-2xl border px-2 py-2.5 text-center font-display text-[12px] font-bold",
                  )}
                  style={{
                    borderColor: selectedGender === value ? "var(--accent)" : "var(--hairline)",
                    background: selectedGender === value ? "var(--accent-soft)" : "var(--glass)",
                    color: selectedGender === value ? "var(--accent-deep)" : "var(--ink)",
                  }}
                >
                  {t(`genders.${labelKey}`)}
                </button>
              ))}
            </div>

            <div className="mt-3 text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
              {t("identity.interestedInLabel")}
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {INTEREST_KEYS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedInterest(value)}
                  aria-pressed={selectedInterest === value}
                  className="interactive tap-expand rounded-2xl border px-2 py-2.5 text-center font-display text-[12px] font-bold"
                  style={{
                    borderColor: selectedInterest === value ? "var(--accent)" : "var(--hairline)",
                    background: selectedInterest === value ? "var(--accent-soft)" : "var(--glass)",
                    color: selectedInterest === value ? "var(--accent-deep)" : "var(--ink)",
                  }}
                >
                  {t(`interests.${labelKey}`)}
                </button>
              ))}
            </div>

            <ClayButton
              className="mt-3.5"
              disabled={!canContinue}
              onClick={() => {
                if (selectedGender && selectedInterest) lockIdentity(selectedGender, selectedInterest);
              }}
            >
              {t("identity.continueCta")}
            </ClayButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
