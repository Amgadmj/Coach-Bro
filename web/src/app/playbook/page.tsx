"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { GlassCard } from "@/components/GlassCard";
import { TabBar } from "@/components/TabBar";
import { useT } from "@/lib/i18n";

/** Peers, not steps - mirrors Home's treatment (R3): no lock/gating backend
 * exists, so these are not numbered as a locked 01/02/03 sequence. Each gets
 * a distinct icon instead of an ordinal badge. This is the single canonical
 * place the full mission list (icon + title + desc + chevron) lives. */
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

export default function PlaybookScreen() {
  const t = useT();
  return (
    <main>
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {t("dashboard.playbookTitle")}
        </h1>
        <p className="mt-1 text-xs text-ink2">{t("playbook.subtitle")}</p>
      </header>

      <div className="mt-5 flex flex-col gap-2.5">
        {MISSIONS.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, type: "spring", stiffness: 220, damping: 22 }}
          >
            <Link href={`/live?mission=${m.key}`} className="interactive block">
              <GlassCard className="flex items-center gap-3 rounded-[20px] p-3.5">
                <div
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl text-xl"
                  style={{ background: m.tile, color: m.color }}
                >
                  {m.icon}
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

      <TabBar />
    </main>
  );
}
