"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { ClayButton, GhostButton } from "@/components/ClayButton";
import { GlassCard } from "@/components/GlassCard";
import { TopBar } from "@/components/TopBar";
import { useT } from "@/lib/i18n";
import { MODE_IMAGES, useSession } from "@/lib/session";

// Recap has no backend yet (see docs/design/design.md handoff notes) -
// this screen renders demo data until a sessions/recap API exists.
const DEMO_STATS = [
  { n: "6", unit: "", key: "approaches" },
  { n: "2", unit: "", key: "newContacts" },
  { n: "14", unit: "min", key: "bestConvo" },
  { n: "91", unit: "", key: "peakConfidence", tinted: true },
] as const;

/** Small hand-drawn shield glyph, same inline-SVG style as TabBar.tsx's icons. */
function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" className="flex-none" aria-hidden="true">
      <path
        d="M9 2l5.5 2v4.2c0 3.6-2.3 6.6-5.5 7.8-3.2-1.2-5.5-4.2-5.5-7.8V4L9 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6.4 9.2l1.8 1.8 3.4-3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RecapScreen() {
  const mode = useSession((s) => s.mode);
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [shared, setShared] = useState(false);

  // Shares the recap's summary stats/text only - never raw conversation
  // content (privacy boundary from root CLAUDE.md and docs/ux_hook_blueprint.md).
  // There's no raw conversation on this demo-data screen anyway, but the
  // string built here is deliberately limited to summary fields.
  async function performShare() {
    const text =
      `${t("recap.nightEnergy", { mode: t(`modes.${mode}.name`) })}\n` +
      `${t("recap.bestLineDropped")}: ${t("recap.demoQuote")}\n` +
      `— Bro Code`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${t("recap.title")} — Bro Code`, text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // user dismissed the share sheet - nothing to do
    }
  }

  return (
    <main>
      <TopBar title={t("recap.title")} action="↗" />
      <p className="mt-2.5 text-center text-[11px] text-ink3">{t("recap.dateVenue")}</p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <GlassCard className="mt-2.5 rounded-3xl p-4.5 text-center">
          <Image
            src={MODE_IMAGES[mode]}
            alt=""
            width={248}
            height={266}
            className="mx-auto h-[133px] w-[124px] rounded-[20px] object-cover"
          />
          <div className="mt-2 font-display text-lg font-extrabold" style={{ color: "var(--mode)" }}>
            {t("recap.nightEnergy", { mode: t(`modes.${mode}.name`) })}
          </div>
          <div className="mt-0.5 text-[11px] text-ink2">
            {t("recap.energyPct", { pct: 68, mode: t(`modes.${mode}.name`) })}
          </div>
        </GlassCard>
      </motion.div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {DEMO_STATS.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, type: "spring", stiffness: 220, damping: 22 }}
          >
            <GlassCard className="rounded-[18px] p-3.5">
              <div
                className="font-display text-2xl font-extrabold tabular-nums"
                style={"tinted" in s && s.tinted ? { color: "var(--mode)" } : undefined}
              >
                {s.n}
                {s.unit && <span className="text-[13px] text-ink3">{s.unit}</span>}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.06em] text-ink2">
                {t(`recap.stats.${s.key}`)}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <GlassCard className="mt-3 rounded-[18px] p-3.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
          {t("recap.bestLineDropped")}
        </div>
        <p className="mt-1 text-xs font-semibold leading-relaxed">{t("recap.demoQuote")}</p>
      </GlassCard>

      <ClayButton className="mt-4 interactive tap-expand" onClick={() => setConfirming(true)}>
        {t("recap.shareRecap")}
      </ClayButton>
      {shared && (
        <p className="mt-2.5 text-center text-[10.5px] text-ink2" role="status">
          {t("recap.shareCopied")}
        </p>
      )}

      <AnimatePresence initial={false}>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
          >
            <GlassCard strong className="mt-3 rounded-[18px] p-3.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
                {t("recap.shareConfirmTitle")}
              </div>
              <div className="mt-1.5 flex items-start gap-1.5 text-ink">
                <ShieldIcon />
                <p className="text-[12px] leading-relaxed text-ink2">{t("recap.shareDisclaimer")}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <GhostButton
                  className="interactive tap-expand"
                  onClick={() => setConfirming(false)}
                >
                  {t("recap.shareCancel")}
                </GhostButton>
                <ClayButton
                  className="interactive tap-expand"
                  onClick={() => {
                    setConfirming(false);
                    void performShare();
                  }}
                >
                  {t("recap.shareConfirm")}
                </ClayButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
