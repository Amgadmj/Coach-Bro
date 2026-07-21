"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SocialMode } from "./types";

export const MODES: Record<
  SocialMode,
  { name: string; desc: string; img: string; buttonLabel: string }
> = {
  hype: {
    name: "Hype",
    desc: "Big energy, loud room.",
    img: "/mascots/mascot-hype.png",
    buttonLabel: "Lock in Hype",
  },
  chill: {
    name: "Chill",
    desc: "Low-key, easy pace.",
    img: "/mascots/mascot-chill.png",
    buttonLabel: "Lock in Chill",
  },
  romantic: {
    name: "Romantic",
    desc: "Slow down, one-on-one.",
    img: "/mascots/mascot-romantic.png",
    buttonLabel: "Lock in Romantic",
  },
  direct: {
    name: "Direct",
    desc: "No games, say the thing.",
    img: "/mascots/mascot-direct.png",
    buttonLabel: "Lock in Direct",
  },
};

interface SessionState {
  mode: SocialMode;
  /** Whether the once-per-session Vibe Check-in sheet has been answered. */
  modeLocked: boolean;
  setMode: (mode: SocialMode) => void;
  lockMode: (mode: SocialMode) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      mode: "hype",
      modeLocked: false,
      setMode: (mode) => set({ mode }),
      lockMode: (mode) => set({ mode, modeLocked: true }),
    }),
    { name: "bro-coach-session" },
  ),
);

/** Stamps the session's Social Mode tint onto :root (--mode/--mode-soft/--mode-deep). */
export function applyModeVars(mode: SocialMode) {
  const root = document.documentElement;
  root.style.setProperty("--mode", `var(--${mode})`);
  root.style.setProperty("--mode-soft", `var(--${mode}-soft)`);
  root.style.setProperty("--mode-deep", `var(--${mode}-deep)`);
}
