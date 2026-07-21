"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AgentCard } from "@/components/AgentCard";
import { GlassCard } from "@/components/GlassCard";
import { TopBar } from "@/components/TopBar";
import { useAnalysis } from "@/lib/analysis";
import type { AgentName } from "@/lib/types";

const AGENT_ORDER: AgentName[] = ["arthur", "clara", "leo"];

export default function DebateReveal() {
  const router = useRouter();
  const { status, agentStatus, analysisByAgent, error } = useAnalysis();

  useEffect(() => {
    if (status === "done") router.replace("/result");
    if (status === "idle") router.replace("/live");
  }, [status, router]);

  const doneCount = AGENT_ORDER.filter((a) => agentStatus[a] === "done").length;

  return (
    <main>
      <TopBar title="Reading the room…" />

      <GlassCard className="mt-3.5 flex items-center gap-3 rounded-[18px] p-3">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-dashed border-hairline bg-[repeating-linear-gradient(45deg,var(--ground2)_0_6px,transparent_6px_12px)] font-mono text-[8px] text-ink3">
          shot
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[13px] font-extrabold">Your screenshot</div>
          <div className="text-[10.5px] text-ink2">
            Three reads happening in parallel right now.
          </div>
        </div>
      </GlassCard>

      <div className="mt-3.5 flex flex-col gap-2.5">
        {AGENT_ORDER.map((agent) => (
          <AgentCard
            key={agent}
            agent={agent}
            status={agentStatus[agent]}
            analysis={analysisByAgent[agent]}
          />
        ))}
      </div>

      {status === "error" && (
        <p className="mt-4 text-center text-sm text-accent-deep">{error}</p>
      )}

      <div className="mt-5 text-center">
        <div className="inline-flex items-center gap-1.5">
          {AGENT_ORDER.map((a, i) => (
            <span
              key={a}
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: i < doneCount ? "var(--accent)" : "var(--hairline)" }}
            />
          ))}
        </div>
        <p className="mx-auto mt-2 max-w-[230px] text-[11px] text-ink3">
          Three takes, then one answer.
        </p>
      </div>
    </main>
  );
}
