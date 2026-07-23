"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { ClayButton } from "@/components/ClayButton";
import { GlassCard } from "@/components/GlassCard";
import { TabBar } from "@/components/TabBar";
import { VibeSheet } from "@/components/VibeSheet";
import { useT } from "@/lib/i18n";
import { MODE_IMAGES, useSession } from "@/lib/session";

/** Peers, not steps - there's no unlock/progress backend, so these are not
 * numbered as a locked 01/02/03 sequence. Each gets a distinct icon instead. */
const MISSIONS = [
  {
    key: "icebreaker",
    icon: "💬",
    tile: "linear-gradient(135deg,var(--hype-soft),var(--romantic-soft))",
    color: "var(--hype)",
  },
  {
    key: "vibeShift",
    icon: "🔄",
    tile: "linear-gradient(135deg,var(--chill-soft),var(--direct-soft))",
    color: "var(--chill)",
  },
  {
    key: "exitStrategy",
    icon: "🚪",
    tile: "linear-gradient(135deg,var(--direct-soft),var(--hype-soft))",
    color: "var(--direct)",
  },
] as const;

export default function Dashboard() {
  const { mode, modeLocked } = useSession();
  const t = useT();

  return (
    <main className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-ink2">{t("dashboard.greeting", { name: "Adam" })}</div>
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-balance">
            {t("dashboard.heading")}
          </h1>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--romantic),var(--direct))] font-display text-[13px] font-bold text-white">
          A
        </div>
      </header>

      {/* Remaining content is vertically centered in the leftover space now
          that the playbook section below is a compact summary (R5.1) */}
      <div className="flex flex-1 flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <GlassCard className="flex items-center gap-3 p-3.5">
            <Image
              src={MODE_IMAGES[mode]}
              alt=""
              width={124}
              height={116}
              className="h-[58px] w-[62px] flex-none rounded-2xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
                {t("dashboard.tonightsMode")}
              </div>
              <div className="font-display text-base font-extrabold" style={{ color: "var(--mode)" }}>
                {t(`modes.${mode}.name`)}
              </div>
              <div className="text-[10.5px] text-ink2">{t(`modes.${mode}.desc`)}</div>
            </div>
            <button
              type="button"
              onClick={() => useSession.setState({ modeLocked: false })}
              className="interactive tap-expand flex-none rounded-full border border-hairline bg-glass px-3 py-1.5 font-display text-[10.5px] font-bold"
            >
              {t("dashboard.change")}
            </button>
          </GlassCard>
        </motion.div>

        <div className="mt-6 flex items-baseline justify-between">
          <h2 className="font-display text-[15px] font-extrabold">{t("dashboard.playbookTitle")}</h2>
          <Link
            href="/playbook"
            className="interactive tap-expand text-[10px] font-bold uppercase tracking-[0.08em] text-accent-deep"
          >
            {t("common.seeAll")}
          </Link>
        </div>

        {/* Compact 1-2 line summary - the full row list now lives only on
            /playbook (R3). This card is a single peer navigation target,
            not a second competing primary CTA (that's still "Start a read"
            below). */}
        <Link href="/playbook" className="interactive mt-2.5 block">
          <GlassCard className="flex items-center gap-3 rounded-[20px] p-3.5">
            <div className="flex flex-none -space-x-2.5">
              {MISSIONS.map((m) => (
                <div
                  key={m.key}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm ring-2 ring-[var(--ground)]"
                  style={{ background: m.tile, color: m.color }}
                >
                  {m.icon}
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[13px] font-extrabold">
                {t("dashboard.playbookSummaryTitle")}
              </div>
              <div className="text-[10.5px] text-ink2">{t("dashboard.playbookSummaryDesc")}</div>
            </div>
            <div className="rtl:rotate-180 text-sm text-ink3">›</div>
          </GlassCard>
        </Link>

        {modeLocked && (
          <Link href="/live" className="interactive mt-5 block">
            <ClayButton variant="mode" className="pointer-events-none">
              {t("dashboard.startRead")}
            </ClayButton>
          </Link>
        )}
      </div>

      <VibeSheet />
      <TabBar />
    </main>
  );
}
