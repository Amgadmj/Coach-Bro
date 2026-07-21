"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import { ClayButton } from "@/components/ClayButton";
import { GlassCard } from "@/components/GlassCard";
import { TopBar } from "@/components/TopBar";
import { MODES, useSession } from "@/lib/session";

// Recap has no backend yet (see docs/design/design.md handoff notes) -
// this screen renders demo data until a sessions/recap API exists.
const DEMO_STATS = [
  { n: "6", unit: "", label: "Approaches" },
  { n: "2", unit: "", label: "New contacts" },
  { n: "14", unit: "min", label: "Best convo" },
  { n: "91", unit: "", label: "Peak confidence", tinted: true },
];

export default function RecapScreen() {
  const mode = useSession((s) => s.mode);
  const meta = MODES[mode];

  return (
    <main>
      <TopBar title="Night Out Recap" action="↗" />
      <p className="mt-2.5 text-center text-[11px] text-ink3">11:42 PM · Downtown Lounge</p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <GlassCard className="mt-2.5 rounded-3xl p-4.5 text-center">
          <Image
            src={meta.img}
            alt=""
            width={248}
            height={266}
            className="mx-auto h-[133px] w-[124px] rounded-[20px] object-cover"
          />
          <div
            className="mt-2 font-display text-lg font-extrabold"
            style={{ color: "var(--mode)" }}
          >
            A {meta.name} night
          </div>
          <div className="mt-0.5 text-[11px] text-ink2">
            68% of the night in {meta.name} mode — you led the charge.
          </div>
        </GlassCard>
      </motion.div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {DEMO_STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, type: "spring", stiffness: 220, damping: 22 }}
          >
            <GlassCard className="rounded-[18px] p-3.5">
              <div
                className="font-display text-2xl font-extrabold tabular-nums"
                style={s.tinted ? { color: "var(--mode)" } : undefined}
              >
                {s.n}
                {s.unit && <span className="text-[13px] text-ink3">{s.unit}</span>}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.06em] text-ink2">
                {s.label}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <GlassCard className="mt-3 rounded-[18px] p-3.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
          Best line dropped
        </div>
        <p className="mt-1 text-xs font-semibold leading-relaxed">
          &ldquo;Careful, if you keep quoting my favorite book at me I&apos;m going to have to buy
          you a coffee.&rdquo;
        </p>
      </GlassCard>

      <ClayButton className="mt-4">Share recap</ClayButton>
      <p className="mt-2.5 text-center text-[10px] leading-relaxed text-ink3">
        Shares as a watermarked story card — the summary,
        <br />
        never the raw conversation.
      </p>
    </main>
  );
}
