"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { LanguageCode } from "./i18n";
import type { SocialMode } from "./types";

/** Language-independent assets only - names/descriptions live in i18n.ts
 * (translations.<lang>.modes.<mode>) so they translate with the rest of the app. */
export const MODE_IMAGES: Record<SocialMode, string> = {
  hype: "/mascots/mascot-hype.png",
  chill: "/mascots/mascot-chill.png",
  romantic: "/mascots/mascot-romantic.png",
  direct: "/mascots/mascot-direct.png",
};

interface SessionState {
  mode: SocialMode;
  /** Whether the once-per-session Vibe Check-in sheet has been answered. */
  modeLocked: boolean;
  /** Drives both the UI chrome's language and the AI response-language override
   * sent to the backend (see lib/api.ts). "auto" = English UI, AI matches the
   * screenshot's own language. */
  language: LanguageCode;
  setMode: (mode: SocialMode) => void;
  lockMode: (mode: SocialMode) => void;
  setLanguage: (language: LanguageCode) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      mode: "hype",
      modeLocked: false,
      language: "auto",
      setMode: (mode) => set({ mode }),
      lockMode: (mode) => set({ mode, modeLocked: true }),
      setLanguage: (language) => set({ language }),
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
