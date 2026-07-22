"use client";

import { create } from "zustand";

import { analyzeInput } from "./api";
import { useSession } from "./session";
import type { AgentName, DebateEvent, MemoryUpdate, SynthesisResult } from "./types";

export type AgentStatus = "pending" | "active" | "done";

export interface DebateMessage {
  agent: AgentName;
  /** Always visible in the chat bubble - one short sentence. */
  headline: string;
  /** Fuller reasoning, shown only on tap/hover expand. Empty for "reply" kind -
   * rebuttals are already one short sentence, nothing to expand into. */
  detail: string;
  /** "take" = round-1 read of the screenshot; "reply" = round-2 debate rebuttal. */
  kind: "take" | "reply";
}

/** Minimum dwell between debate-feed reveals - the deliberate variable-reward
 * pacing floor from docs/ux_hook_blueprint.md. The mock backend answers in
 * milliseconds; revealing instantly would flatten the anticipation curve. */
const REVEAL_FLOOR_MS = 1300;

interface AnalysisState {
  status: "idle" | "running" | "done" | "error";
  agentStatus: Record<AgentName, AgentStatus>;
  /** The visible conversation: three takes, then the agents debating each other. */
  messages: DebateMessage[];
  result: SynthesisResult | null;
  /** Set when the backend confirms the contact's memory/persona was updated. */
  memoryUpdate: MemoryUpdate | null;
  /** How many screenshots were attached to this read - drives singular/plural
   * copy on the debate screen ("Your screenshot" vs "Your screenshots"). */
  imageCount: number;
  /** Whether this read included typed/pasted text (standalone or alongside
   * screenshots) - see read/page.tsx for how this and imageCount together
   * pick the debate screen's header copy. */
  hasText: boolean;
  textContent: string | null;
  error: string | null;
  run: (opts: {
    images?: File[];
    textContent?: string | null;
    contactId?: string | null;
  }) => Promise<void>;
  reset: () => void;
}

const INITIAL = {
  status: "idle" as const,
  agentStatus: { arthur: "pending", clara: "pending", leo: "pending" } as Record<
    AgentName,
    AgentStatus
  >,
  messages: [] as DebateMessage[],
  result: null,
  memoryUpdate: null,
  imageCount: 0,
  hasText: false,
  textContent: null,
  error: null,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useAnalysis = create<AnalysisState>((set, get) => ({
  ...INITIAL,

  reset: () => set({ ...INITIAL, agentStatus: { ...INITIAL.agentStatus }, messages: [] }),

  run: async ({ images = [], textContent = null, contactId = null }) => {
    const trimmedText = textContent?.trim() || null;
    set({
      ...INITIAL,
      agentStatus: { ...INITIAL.agentStatus },
      messages: [],
      status: "running",
      imageCount: images.length,
      hasText: !!trimmedText,
      textContent: trimmedText,
    });

    let lastReveal = 0;

    async function pace() {
      const elapsed = Date.now() - lastReveal;
      if (elapsed < REVEAL_FLOOR_MS) await sleep(REVEAL_FLOOR_MS - elapsed);
      lastReveal = Date.now();
    }

    async function applyEvent(event: DebateEvent) {
      if (event.type === "agent_started" && event.agent) {
        set((s) => ({ agentStatus: { ...s.agentStatus, [event.agent!]: "active" } }));
      }
      if (event.type === "agent_done" && event.agent) {
        await pace();
        const payload = event.payload as { headline?: string; analysis?: string } | null;
        set((s) => ({
          agentStatus: { ...s.agentStatus, [event.agent!]: "done" },
          messages: [
            ...s.messages,
            {
              agent: event.agent!,
              headline: payload?.headline ?? "",
              detail: payload?.analysis ?? "",
              kind: "take",
            },
          ],
        }));
      }
      if (event.type === "agent_reply" && event.agent) {
        await pace();
        const text = (event.payload as { text?: string } | null)?.text ?? "";
        set((s) => ({
          messages: [...s.messages, { agent: event.agent!, headline: text, detail: "", kind: "reply" }],
        }));
      }
      if (event.type === "synthesis_done" && event.payload) {
        // let the last bubble breathe before the continue button appears
        await sleep(700);
        set({ status: "done", result: event.payload as unknown as SynthesisResult });
      }
      if (event.type === "memory_updated" && event.payload) {
        set({ memoryUpdate: event.payload as unknown as MemoryUpdate });
      }
      if (event.type === "error") {
        set({ status: "error", error: String(event.payload?.message ?? "analysis failed") });
      }
    }

    try {
      const { language, mode } = useSession.getState();
      for await (const event of analyzeInput(images, trimmedText ?? undefined, contactId, language, mode)) {
        await applyEvent(event);
      }
      // stream ended without a synthesis_done (backend crash mid-run, dropped
      // connection): surface it instead of leaving the debate spinning forever
      if (get().status === "running") {
        set({ status: "error", error: "The debate got cut off - try again." });
      }
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
