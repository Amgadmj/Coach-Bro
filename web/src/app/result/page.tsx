"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { ClayButton, GhostButton } from "@/components/ClayButton";
import { ExpandChevron, useExpandable } from "@/components/ExpandHint";
import { Gauge } from "@/components/Gauge";
import { GlassCard } from "@/components/GlassCard";
import { TopBar } from "@/components/TopBar";
import { useAnalysis } from "@/lib/analysis";
import { useT } from "@/lib/i18n";

function GaugeDetail({ summary, detail }: { summary: string; detail: string }) {
  const { open, toggle, hoverHandlers } = useExpandable();
  const t = useT();

  return (
    <button type="button" onClick={toggle} {...hoverHandlers} className="mt-2.5 w-full text-center">
      <p className="text-[11px] font-medium text-ink2">{summary}</p>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="mt-1.5 border-t border-hairline pt-1.5 text-[11px] leading-relaxed text-ink2">
              {detail}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <ExpandChevron
        open={open}
        moreLabel={t("read.showMore")}
        lessLabel={t("read.showLess")}
        className="mt-1 flex items-center justify-center gap-1 text-[9px] font-bold text-ink3"
      />
    </button>
  );
}

const AGENT_DOTS = [
  { initial: "A", colorVar: "var(--arthur)" },
  { initial: "C", colorVar: "var(--clara)" },
  { initial: "L", colorVar: "var(--leo)" },
];

export default function ResultScreen() {
  const router = useRouter();
  const { result, memoryUpdate, reset } = useAnalysis();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!result) router.replace("/live");
  }, [result, router]);

  if (!result) return null;

  async function copyBest() {
    if (!result) return;
    await navigator.clipboard.writeText(result.best_response);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Shares the summary only - never the raw conversation (privacy boundary
  // from docs/ux_hook_blueprint.md). Web Share API where available (mobile),
  // clipboard fallback on desktop.
  async function shareRead() {
    if (!result) return;
    const text =
      `${t("result.attractionGauge")}: ${result.attraction_level * 10}/100\n` +
      `${t("result.lesson")}: ${result.coaching_lesson}\n` +
      `— Bro Coach`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${t("result.title")} — Bro Coach`, text });
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
      <TopBar title={t("result.title")} action={shared ? "✓" : "↗"} onAction={shareRead} />
      {shared && (
        <p className="mt-1.5 text-center text-[10.5px] text-ink3" role="status">
          {t("result.shareCopied")}
        </p>
      )}

      <GlassCard className="mt-3 rounded-[20px] p-3.5">
        <div className="font-display text-[13px] font-extrabold">{t("result.thinkingHeading")}</div>
        <ul className="mt-1 text-[11.5px] leading-relaxed text-ink2">
          {result.what_she_is_thinking.map((thought, i) => (
            <li key={i}>· {thought}</li>
          ))}
        </ul>
      </GlassCard>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        <GlassCard className="mt-3.5 p-4">
          <Gauge value={result.attraction_level * 10} label={t("result.attractionGauge")} />
          <GaugeDetail summary={result.dynamic_summary} detail={result.dynamic_analysis} />
        </GlassCard>
      </motion.div>

      <div className="mt-3 rounded-[20px] border border-glass-line bg-glass px-3.5 py-3 text-center">
        <span className="text-[11px] font-semibold tracking-[0.04em] text-clara">
          {t("result.lesson")} · {result.coaching_lesson}
        </span>
      </div>

      <div className="mt-3 rounded-[20px] border border-glass-line bg-accent-soft p-3.5 shadow-card">
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent-deep">
          {t("result.bestResponse")}
        </div>
        <p className="mt-1.5 text-[13px] font-semibold leading-relaxed">
          &ldquo;{result.best_response}&rdquo;
        </p>
        <div className="mt-2.5 flex gap-2">
          <details className="group">
            <summary className="cursor-pointer list-none rounded-full border border-hairline bg-white/40 px-3 py-1.5 font-display text-[10px] font-bold text-ink2 dark:bg-white/10">
              {t("result.playfulAlt")}
            </summary>
            <p className="mt-1.5 text-[12px] text-ink2">{result.alternative_responses.playful}</p>
          </details>
          <details className="group">
            <summary className="cursor-pointer list-none rounded-full border border-hairline bg-white/40 px-3 py-1.5 font-display text-[10px] font-bold text-ink2 dark:bg-white/10">
              {t("result.directAlt")}
            </summary>
            <p className="mt-1.5 text-[12px] text-ink2">{result.alternative_responses.direct}</p>
          </details>
        </div>
      </div>

      <ClayButton className="mt-4" onClick={copyBest}>
        {copied ? t("result.copied") : t("result.copyResponse")}
      </ClayButton>
      <GhostButton
        className="mt-2.5"
        onClick={() => {
          reset();
          router.push("/live");
        }}
      >
        {t("result.tryAgain")}
      </GhostButton>

      <div className="mt-3.5 flex items-center justify-center gap-2">
        <div className="flex">
          {AGENT_DOTS.map((d, i) => (
            <span
              key={d.initial}
              className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-ground font-display text-[8px] font-extrabold text-white"
              style={{ background: d.colorVar, marginInlineStart: i === 0 ? 0 : -6 }}
            >
              {d.initial}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-ink3">{t("result.synthesizedFrom")}</span>
      </div>

      {memoryUpdate && (
        <div className="mt-2.5 rounded-2xl border border-glass-line bg-glass px-3.5 py-2.5 text-center">
          <span className="text-[10.5px] text-ink2">
            🧠{" "}
            {t("result.savedToMemory", {
              name: memoryUpdate.contact_id,
              count: memoryUpdate.read_count,
            })}
          </span>
        </div>
      )}
    </main>
  );
}
