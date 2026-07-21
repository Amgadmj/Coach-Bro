"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { ClayButton } from "@/components/ClayButton";
import { AgentAvatar, DebateBubble } from "@/components/DebateBubble";
import { GlassCard } from "@/components/GlassCard";
import { TopBar } from "@/components/TopBar";
import { useAnalysis } from "@/lib/analysis";
import { useT } from "@/lib/i18n";
import type { AgentName } from "@/lib/types";
import { clsx } from "@/lib/clsx";

const AGENT_ORDER: AgentName[] = ["arthur", "clara", "leo"];

function TypingRow({ agent, side }: { agent: AgentName; side: "left" | "right" }) {
  return (
    <div className={clsx("flex items-center gap-2", side === "right" && "flex-row-reverse")}>
      <AgentAvatar agent={agent} size={26} />
      <div className="flex gap-1 rounded-2xl border border-glass-line bg-glass px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-ink3"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    </div>
  );
}

export default function DebateRoom() {
  const router = useRouter();
  const { status, agentStatus, messages, error, imageCount } = useAnalysis();
  const endRef = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (status === "idle") router.replace("/live");
  }, [status, router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, status]);

  const takesIn = messages.filter((m) => m.kind === "take").length;
  const debating = status === "running" && takesIn === 3;
  const typingAgents =
    status === "running" && takesIn < 3
      ? AGENT_ORDER.filter(
          (a) => agentStatus[a] === "active" && !messages.some((m) => m.agent === a && m.kind === "take"),
        )
      : [];

  return (
    <main className="pb-24">
      <TopBar title={status === "done" ? t("read.spokenTitle") : t("read.readingTitle")} />

      <GlassCard className="mt-3.5 flex items-center gap-3 rounded-[18px] p-3">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-dashed border-hairline bg-[repeating-linear-gradient(45deg,var(--ground2)_0_6px,transparent_6px_12px)] font-mono text-[8px] text-ink3">
          shot
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[13px] font-extrabold">
            {imageCount === 1 ? t("read.yourScreenshot") : t("read.yourScreenshots")}
          </div>
          <div className="text-[10.5px] text-ink2">
            {debating ? t("read.statusDebating") : status === "done" ? t("read.statusDone") : t("read.statusRunning")}
          </div>
        </div>
      </GlassCard>

      <div className="mt-3.5 flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={`${msg.agent}-${msg.kind}-${i}`}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <DebateBubble message={msg} side={i % 2 === 0 ? "left" : "right"} />
            </motion.div>
          ))}
        </AnimatePresence>

        {typingAgents.map((agent, i) => (
          <TypingRow key={agent} agent={agent} side={(messages.length + i) % 2 === 0 ? "left" : "right"} />
        ))}
        {debating && (
          <div className="flex items-center justify-center gap-2 px-3.5 py-1 text-[10.5px] text-ink3">
            {t("read.goingBackAndForth")}
          </div>
        )}
      </div>

      {status === "error" && (
        <p className="mt-4 text-center text-sm text-accent-deep">{error}</p>
      )}

      {status === "running" && (
        <p className="mx-auto mt-4 max-w-[230px] text-center text-[11px] text-ink3">
          {t("read.threeTakes")}
        </p>
      )}

      <AnimatePresence>
        {status === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed inset-x-0 bottom-5 z-40 mx-auto w-[min(92%,26rem)]"
          >
            <ClayButton onClick={() => router.push("/result")}>{t("read.seeRead")}</ClayButton>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={endRef} />
    </main>
  );
}
