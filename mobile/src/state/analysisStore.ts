import { create } from "zustand";

import { analyzeScreenshot } from "@/api/client";
import type { AgentName, DebateEvent, SynthesisResult } from "@/types/schemas";

export type AgentStatus = "pending" | "active" | "done";

interface AnalysisState {
  status: "idle" | "running" | "done" | "error";
  agentStatus: Record<AgentName, AgentStatus>;
  events: DebateEvent[];
  result: SynthesisResult | null;
  error: string | null;
  runAnalysis: (params: { imageUri: string; mimeType: string; fileName: string; contactId?: string | null }) => Promise<void>;
  reset: () => void;
}

const INITIAL_AGENT_STATUS: Record<AgentName, AgentStatus> = {
  arthur: "pending",
  clara: "pending",
  leo: "pending",
};

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  status: "idle",
  agentStatus: { ...INITIAL_AGENT_STATUS },
  events: [],
  result: null,
  error: null,

  reset: () =>
    set({
      status: "idle",
      agentStatus: { ...INITIAL_AGENT_STATUS },
      events: [],
      result: null,
      error: null,
    }),

  runAnalysis: async (params) => {
    set({
      status: "running",
      agentStatus: { ...INITIAL_AGENT_STATUS },
      events: [],
      result: null,
      error: null,
    });

    try {
      for await (const event of analyzeScreenshot(params)) {
        const events = [...get().events, event];
        const agentStatus = { ...get().agentStatus };

        if (event.type === "agent_started" && event.agent) {
          agentStatus[event.agent] = "active";
        }
        if (event.type === "agent_done" && event.agent) {
          agentStatus[event.agent] = "done";
        }

        if (event.type === "synthesis_done" && event.payload) {
          set({
            events,
            agentStatus,
            status: "done",
            result: event.payload as unknown as SynthesisResult,
          });
        } else {
          set({ events, agentStatus });
        }
      }
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
