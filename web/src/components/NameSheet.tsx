"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { setProfile } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { ClayButton } from "./ClayButton";

/** Once-ever, blocking onboarding sheet - collects the user's own name and
 * phone number (see backend/models/schemas.py::UserProfile). Modeled
 * directly on IdentitySheet.tsx's scrim + bottom-sheet pattern, but with
 * text inputs instead of button-grids. Shown after IdentitySheet so the
 * onboarding order is: explain app, ask identity, ask name/phone, pick
 * tonight's mode. Name is required to continue; phone is optional - the
 * backend already handles either as nullable (see models.UserProfile). */
export function NameSheet() {
  const { profileLocked, lockProfile } = useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const t = useT();

  const canContinue = name.trim().length > 0 && !submitting;

  const handleContinue = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSubmitting(true);
    lockProfile(trimmedName);
    // Fire-and-forget - the local session store is the source of truth for
    // display (see lib/session.ts::displayName), this just persists it
    // server-side per-device. Not blocking Continue on network latency.
    void setProfile(trimmedName, phone.trim() || null);
  };

  return (
    <AnimatePresence>
      {!profileLocked && (
        <motion.div
          className="fixed inset-0 z-[62] flex items-end justify-center bg-[var(--scrim)] p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("name.sheetTitle")}
            className="w-full max-w-md rounded-card-lg border border-glass-line bg-glass-strong p-4 shadow-card backdrop-blur-2xl"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
              {t("name.eyebrow")}
            </div>
            <h2 className="mt-0.5 font-display text-lg font-extrabold">{t("name.sheetTitle")}</h2>
            <p className="mt-0.5 text-[11px] text-ink2">{t("name.sheetSubtitle")}</p>

            <div className="mt-3.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
              {t("name.nameLabel")}
            </div>
            <input
              type="text"
              inputMode="text"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("name.namePlaceholder")}
              className="mt-1.5 w-full rounded-2xl border border-hairline bg-glass px-3 py-2.5 font-display text-[13px] font-bold text-ink outline-none focus:border-[var(--accent)]"
            />

            <div className="mt-3 text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
              {t("name.phoneLabel")}
            </div>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("name.phonePlaceholder")}
              className="mt-1.5 w-full rounded-2xl border border-hairline bg-glass px-3 py-2.5 font-display text-[13px] font-bold text-ink outline-none focus:border-[var(--accent)]"
            />

            <p className="mt-2.5 text-[10px] leading-snug text-ink3">{t("name.disclosure")}</p>

            <ClayButton className="mt-3" disabled={!canContinue} onClick={handleContinue}>
              {t("name.continueCta")}
            </ClayButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
