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

const MISSIONS = [
  {
    key: "icebreaker",
    num: "01",
    tile: "linear-gradient(135deg,var(--hype-soft),var(--romantic-soft))",
    color: "var(--hype)",
  },
  {
    key: "vibeShift",
    num: "02",
    tile: "linear-gradient(135deg,var(--chill-soft),var(--direct-soft))",
    color: "var(--chill)",
  },
  {
    key: "exitStrategy",
    num: "03",
    tile: "linear-gradient(135deg,var(--direct-soft),var(--hype-soft))",
    color: "var(--direct)",
  },
] as const;

export default function Dashboard() {
  const { mode, modeLocked } = useSession();
  const t = useT();

  return (
    <main>
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <GlassCard className="mt-4 flex items-center gap-3 p-3.5">
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
            className="rounded-full border border-hairline bg-glass px-3 py-1.5 font-display text-[10.5px] font-bold"
          >
            {t("dashboard.change")}
          </button>
        </GlassCard>
      </motion.div>

      <div className="mt-4.5 flex items-baseline justify-between pt-4">
        <h2 className="font-display text-[15px] font-extrabold">{t("dashboard.playbookTitle")}</h2>
        <Link
          href="/playbook"
          className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent-deep"
        >
          {t("common.seeAll")}
        </Link>
      </div>
      <div className="mt-2.5 flex flex-col gap-2">
        {MISSIONS.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, type: "spring", stiffness: 220, damping: 22 }}
          >
            <Link href={`/live?mission=${m.key}`}>
              <GlassCard className="flex items-center gap-3 rounded-[20px] p-3">
                <div
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl font-display text-base font-extrabold"
                  style={{ background: m.tile, color: m.color }}
                >
                  {m.num}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[13px] font-extrabold">
                    {t(`missions.${m.key}.title`)}
                  </div>
                  <div className="text-[10.5px] text-ink2">{t(`missions.${m.key}.desc`)}</div>
                </div>
                <div className="rtl:rotate-180 text-sm text-ink3">›</div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {modeLocked && (
        <Link href="/live" className="mt-5 block">
          <ClayButton variant="mode" className="pointer-events-none">
            {t("dashboard.startRead")}
          </ClayButton>
        </Link>
      )}

      <VibeSheet />
      <TabBar />
    </main>
  );
}
