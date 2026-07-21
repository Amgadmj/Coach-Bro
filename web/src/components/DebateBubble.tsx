"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { DebateMessage } from "@/lib/analysis";
import { useT } from "@/lib/i18n";
import type { AgentName } from "@/lib/types";
import { clsx } from "@/lib/clsx";
import { ExpandChevron, useExpandable } from "./ExpandHint";

export const AGENT_META: Record<AgentName, { name: string; colorVar: string }> = {
  arthur: { name: "Arthur", colorVar: "var(--arthur)" },
  clara: { name: "Clara", colorVar: "var(--clara)" },
  leo: { name: "Leo", colorVar: "var(--leo)" },
};

export function AgentAvatar({ agent, size = 32 }: { agent: AgentName; size?: number }) {
  const meta = AGENT_META[agent];
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full font-display font-extrabold text-white"
      style={{ background: meta.colorVar, width: size, height: size, fontSize: size * 0.42 }}
    >
      {meta.name[0]}
    </div>
  );
}

export function DebateBubble({
  message,
  side,
}: {
  message: DebateMessage;
  side: "left" | "right";
}) {
  const { open, toggle, hoverHandlers } = useExpandable();
  const t = useT();

  const meta = AGENT_META[message.agent];
  const expandable = message.kind === "take" && message.detail.length > 0;
  const isOpen = expandable && open;

  return (
    <div className={clsx("flex items-end gap-2", side === "right" && "flex-row-reverse")}>
      <AgentAvatar agent={message.agent} />
      <button
        type="button"
        onClick={() => expandable && toggle()}
        {...hoverHandlers}
        className={clsx(
          "max-w-[78%] rounded-2xl border border-glass-line bg-glass px-3.5 py-2.5 text-start shadow-card transition-colors",
          side === "left" ? "rounded-bl-md" : "rounded-br-md",
          expandable ? "cursor-pointer" : "cursor-default",
          message.kind === "reply" && "opacity-80",
        )}
      >
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[11.5px] font-extrabold" style={{ color: meta.colorVar }}>
            {meta.name}
          </span>
          {message.kind === "reply" && (
            <span className="text-[9px] text-ink3">{t("read.inDebate")}</span>
          )}
        </div>

        <p className="mt-0.5 text-[12.5px] font-medium leading-snug text-ink">{message.headline}</p>

        {expandable && (
          <>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p className="mt-1.5 border-t border-hairline pt-1.5 text-[11.5px] leading-relaxed text-ink2">
                    {message.detail}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <ExpandChevron open={isOpen} moreLabel={t("read.showMore")} lessLabel={t("read.showLess")} />
          </>
        )}
      </button>
    </div>
  );
}
