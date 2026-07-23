"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { useT } from "@/lib/i18n";

const BENEFIT_KEYS = ["benefit1", "benefit2", "benefit3"] as const;

/** Pure presentational install ask - shared by the milestone-timed
 * InstallMoment (on /result) and Profile's manual "Install app" row, so the
 * pitch and the iOS fallback instructions only exist in one place. `platform`
 * picks the CTA: a real "Add to Home Screen" button where the browser
 * supports `beforeinstallprompt` (Android/desktop Chrome/Edge), or numbered
 * Share-sheet steps on iOS Safari, which has no such event. */
export function InstallSheet({
  platform,
  onInstall,
  onDismiss,
}: {
  platform: "android" | "ios";
  onInstall: () => void;
  onDismiss: () => void;
}) {
  const t = useT();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--scrim)] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t("installMoment.title")}
          className="w-full max-w-md rounded-card-lg border border-glass-line bg-glass-strong p-5 text-center shadow-card backdrop-blur-2xl"
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] shadow-clay">
            <Image src="/icons/icon-192.png" alt="" width={64} height={64} className="h-16 w-16 rounded-[20px]" />
          </div>
          <h2 className="mt-3 font-display text-lg font-extrabold">{t("installMoment.title")}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">{t("installMoment.body")}</p>

          <ul className="mt-3.5 flex flex-col gap-2 text-start">
            {BENEFIT_KEYS.map((k) => (
              <li
                key={k}
                className="flex items-start gap-2 rounded-2xl border border-glass-line bg-glass px-3 py-2 text-[11.5px] text-ink2"
              >
                <span className="mt-0.5 text-accent-deep">•</span>
                <span>{t(`installMoment.${k}`)}</span>
              </li>
            ))}
          </ul>

          {platform === "android" ? (
            <button
              type="button"
              onClick={onInstall}
              className="interactive mt-4 w-full rounded-full bg-[linear-gradient(160deg,var(--accent),var(--accent-deep))] px-5 py-3 font-display text-sm font-extrabold text-white shadow-clay"
            >
              {t("installMoment.androidCta")}
            </button>
          ) : (
            <div className="mt-4 flex flex-col gap-2 text-start">
              <div className="flex items-center gap-2.5 rounded-2xl border border-glass-line bg-glass px-3 py-2.5">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-deep))] font-display text-[10px] font-extrabold text-white">
                  1
                </span>
                <span className="text-[12px] text-ink2">{t("installMoment.iosStep1")}</span>
                <span aria-hidden className="ms-auto flex-none text-base">
                  ⬆️
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-glass-line bg-glass px-3 py-2.5">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-deep))] font-display text-[10px] font-extrabold text-white">
                  2
                </span>
                <span className="text-[12px] text-ink2">{t("installMoment.iosStep2")}</span>
                <span aria-hidden className="ms-auto flex-none text-base">
                  ➕
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="interactive mt-2.5 w-full rounded-full px-5 py-2 font-display text-[12px] font-bold text-ink3"
          >
            {platform === "android" ? t("installMoment.maybeLater") : t("installMoment.gotIt")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
