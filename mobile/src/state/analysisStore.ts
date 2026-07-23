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

/** api/client.ts's uploadAsync-based analyzeScreenshot returns every DebateEvent
 * at once (no true live stream on device - see its docstring for why), so this
 * dwell between revealing each one keeps the debate feed feeling like a live
 * conversation instead of dumping the whole result on screen instantly -
 * mirrors web/src/lib/analysis.ts's REVEAL_FLOOR_MS. */
const REVEAL_DELAY_MS = 900;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      const allEvents = await analyzeScreenshot(params);

      for (const event of allEvents) {
        // Bail out of the reveal loop immediately on an error event instead of
        // pacing through remaining events that will never make sense without
        // the ones the backend never got to send.
        if (get().status === "error") break;

        await sleep(REVEAL_DELAY_MS);

        const events = [...get().events, event];
        const agentStatus = { ...get().agentStatus };

        if (event.type === "agent_started" && event.agent) {
          agentStatus[event.agent] = "active";
        }
        if (event.type === "agent_done" && event.agent) {
          agentStatus[event.agent] = "done";
        }

        if (event.type === "synthesis_done" && event.payload) {
          set({ events, agentStatus, status: "done", result: event.payload as unknown as SynthesisResult });
        } else if (event.type === "error") {
          set({
            events,
            agentStatus,
            status: "error",
            error: String(event.payload?.message ?? "analysis failed"),
          });
        } else {
          set({ events, agentStatus });
        }
      }

      // The backend stream ended without a synthesis_done or error event
      // (e.g. a dropped connection mid-run) - surface it instead of leaving
      // the debate reveal spinning forever.
      if (get().status === "running") {
        set({ status: "error", error: "The debate got cut off - try again." });
      }
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
