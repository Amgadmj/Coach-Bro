"use client";

import { create } from "zustand";

import { analyzeScreenshot } from "./api";
import type { AgentName, DebateEvent, SynthesisResult } from "./types";

export type AgentStatus = "pending" | "active" | "done";

/** Minimum dwell between agent-card reveals - the deliberate variable-reward
 * pacing floor from docs/ux_hook_blueprint.md. The mock backend answers in
 * milliseconds; revealing instantly would flatten the anticipation curve. */
const REVEAL_FLOOR_MS = 1300;

interface AnalysisState {
  status: "idle" | "running" | "done" | "error";
  agentStatus: Record<AgentName, AgentStatus>;
  analysisByAgent: Partial<Record<AgentName, string>>;
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
  analysisByAgent: {},
  result: null,
  scenario: null,
  error: null,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useAnalysis = create<AnalysisState>((set, get) => ({
  ...INITIAL,

  reset: () => set({ ...INITIAL, agentStatus: { ...INITIAL.agentStatus }, analysisByAgent: {} }),

  run: async (image, contactId, scenario) => {
    set({
      ...INITIAL,
      agentStatus: { ...INITIAL.agentStatus },
      analysisByAgent: {},
      status: "running",
      scenario: scenario ?? null,
    });

    let lastReveal = 0;
    try {
      for await (const event of analyzeScreenshot(image, contactId)) {
        await applyEvent(event);
      }
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }

    async function applyEvent(event: DebateEvent) {
      if (event.type === "agent_started" && event.agent) {
        set((s) => ({ agentStatus: { ...s.agentStatus, [event.agent!]: "active" } }));
      }
      if (event.type === "agent_done" && event.agent) {
        const elapsed = Date.now() - lastReveal;
        if (elapsed < REVEAL_FLOOR_MS) await sleep(REVEAL_FLOOR_MS - elapsed);
        lastReveal = Date.now();
        const analysis = (event.payload as { analysis?: string } | null)?.analysis ?? "";
        set((s) => ({
          agentStatus: { ...s.agentStatus, [event.agent!]: "done" },
          analysisByAgent: { ...s.analysisByAgent, [event.agent!]: analysis },
        }));
      }
      if (event.type === "synthesis_done" && event.payload) {
        // let the last agent card breathe before the verdict
        await sleep(700);
        set({ status: "done", result: event.payload as unknown as SynthesisResult });
      }
      if (event.type === "error") {
        set({ status: "error", error: String(event.payload?.message ?? "analysis failed") });
      }
    }
  },
}));
