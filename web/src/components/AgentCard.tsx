"use client";

import { motion } from "framer-motion";

import type { AgentStatus } from "@/lib/analysis";
import type { AgentName } from "@/lib/types";
import { clsx } from "@/lib/clsx";
import { GlassCard } from "./GlassCard";

const AGENT_META: Record<AgentName, { name: string; role: string; colorVar: string }> = {
  arthur: { name: "Arthur", role: "Frame expert", colorVar: "var(--arthur)" },
  clara: { name: "Clara", role: "Psychology", colorVar: "var(--clara)" },
  leo: { name: "Leo", role: "The charmer", colorVar: "var(--leo)" },
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  pending: "WAITING",
  active: "ANALYZING",
  done: "DONE",
};

export function AgentCard({
  agent,
  status,
  analysis,
}: {
  agent: AgentName;
  status: AgentStatus;
  analysis?: string;
}) {
  const meta = AGENT_META[agent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: status === "pending" ? 0.45 : 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <GlassCard className={clsx("flex gap-3 p-3.5", status === "pending" && "shadow-none")}>
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full font-display text-sm font-extrabold text-white"
          style={{ background: meta.colorVar }}
        >
          {meta.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[13px] font-extrabold">{meta.name}</span>
            <span className="text-[9px] text-ink3">{meta.role}</span>
            <span
              className="ml-auto font-mono text-[8.5px] font-bold tracking-[0.08em]"
              style={{ color: status === "pending" ? "var(--ink3)" : meta.colorVar }}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
          {status === "done" && analysis ? (
            <p className="mt-1 text-[11px] leading-relaxed text-ink2">{analysis}</p>
          ) : status === "active" ? (
            <div aria-label="analyzing" role="status">
              <div className="mt-2 h-2 animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--hairline)_25%,var(--ground2)_50%,var(--hairline)_75%)] [background-size:200%_100%]" />
              <div className="mt-1.5 h-2 w-2/3 animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--hairline)_25%,var(--ground2)_50%,var(--hairline)_75%)] [background-size:200%_100%]" />
            </div>
          ) : (
            <div className="mt-2 h-2 w-1/2 rounded-md bg-hairline" />
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
