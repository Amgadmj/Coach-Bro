"use client";

import { create } from "zustand";

import { analyzeScreenshot } from "./api";
import type { AgentName, DebateEvent, SynthesisResult } from "./types";

export type AgentStatus = "pending" | "active" | "done";

export interface DebateMessage {
  agent: AgentName;
  text: string;
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
  scenario: string | null;
  error: string | null;
  run: (image: File | Blob, contactId?: string | null, scenario?: string | null) => Promise<void>;
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
  scenario: null,
  error: null,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useAnalysis = create<AnalysisState>((set, get) => ({
  ...INITIAL,

  reset: () => set({ ...INITIAL, agentStatus: { ...INITIAL.agentStatus }, messages: [] }),

  run: async (image, contactId, scenario) => {
    set({
      ...INITIAL,
      agentStatus: { ...INITIAL.agentStatus },
      messages: [],
      status: "running",
      scenario: scenario ?? null,
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
        const analysis = (event.payload as { analysis?: string } | null)?.analysis ?? "";
        set((s) => ({
          agentStatus: { ...s.agentStatus, [event.agent!]: "done" },
          messages: [...s.messages, { agent: event.agent!, text: analysis, kind: "take" }],
        }));
      }
      if (event.type === "agent_reply" && event.agent) {
        await pace();
        const text = (event.payload as { text?: string } | null)?.text ?? "";
        set((s) => ({
          messages: [...s.messages, { agent: event.agent!, text, kind: "reply" }],
        }));
      }
      if (event.type === "synthesis_done" && event.payload) {
        // let the last bubble breathe before the continue button appears
        await sleep(700);
        set({ status: "done", result: event.payload as unknown as SynthesisResult });
      }
      if (event.type === "error") {
        set({ status: "error", error: String(event.payload?.message ?? "analysis failed") });
      }
    }

    try {
      for await (const event of analyzeScreenshot(image, contactId)) {
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
