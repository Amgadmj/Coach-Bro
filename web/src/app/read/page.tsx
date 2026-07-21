"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { ClayButton } from "@/components/ClayButton";
import { GlassCard } from "@/components/GlassCard";
import { TopBar } from "@/components/TopBar";
import { useAnalysis } from "@/lib/analysis";
import type { AgentName } from "@/lib/types";

const AGENT_META: Record<AgentName, { name: string; role: string; colorVar: string }> = {
  arthur: { name: "Arthur", role: "Frame expert", colorVar: "var(--arthur)" },
  clara: { name: "Clara", role: "Psychology", colorVar: "var(--clara)" },
  leo: { name: "Leo", role: "The charmer", colorVar: "var(--leo)" },
};

const AGENT_ORDER: AgentName[] = ["arthur", "clara", "leo"];

function Avatar({ agent, size = 34 }: { agent: AgentName; size?: number }) {
  const meta = AGENT_META[agent];
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full font-display font-extrabold text-white"
      style={{ background: meta.colorVar, width: size, height: size, fontSize: size * 0.4 }}
    >
      {meta.name[0]}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1" aria-label="typing" role="status">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-ink3"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

export default function DebateRoom() {
  const router = useRouter();
  const { status, agentStatus, messages, error } = useAnalysis();
  const endRef = useRef<HTMLDivElement>(null);

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
      <TopBar title={status === "done" ? "The room has spoken" : "Reading the room…"} />

      <GlassCard className="mt-3.5 flex items-center gap-3 rounded-[18px] p-3">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-dashed border-hairline bg-[repeating-linear-gradient(45deg,var(--ground2)_0_6px,transparent_6px_12px)] font-mono text-[8px] text-ink3">
          shot
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[13px] font-extrabold">Your screenshot</div>
          <div className="text-[10.5px] text-ink2">
            {debating
              ? "Takes are in — now they hash it out."
              : status === "done"
                ? "Debate settled. Your read is ready."
                : "Three reads happening in parallel right now."}
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
              className={msg.kind === "reply" ? "pl-6" : undefined}
            >
              <GlassCard className="flex gap-3 p-3.5">
                <Avatar agent={msg.agent} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-[13px] font-extrabold">
                      {AGENT_META[msg.agent].name}
                    </span>
                    <span className="text-[9px] text-ink3">
                      {msg.kind === "take" ? AGENT_META[msg.agent].role : "in the debate"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink2">{msg.text}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>

        {typingAgents.map((agent) => (
          <div key={agent} className="flex items-center gap-3 px-3.5 py-1">
            <Avatar agent={agent} size={26} />
            <TypingDots />
          </div>
        ))}
        {debating && (
          <div className="flex items-center gap-2 px-3.5 py-1 text-[10.5px] text-ink3">
            <TypingDots /> the coaches are going back and forth…
          </div>
        )}
      </div>

      {status === "error" && (
        <p className="mt-4 text-center text-sm text-accent-deep">{error}</p>
      )}

      {status === "running" && (
        <p className="mx-auto mt-4 max-w-[230px] text-center text-[11px] text-ink3">
          Three takes, one debate, then one answer.
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
            <ClayButton onClick={() => router.push("/result")}>See your read</ClayButton>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={endRef} />
    </main>
  );
}
