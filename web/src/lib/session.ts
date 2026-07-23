"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { LanguageCode } from "./i18n";
import type { Gender, InterestedIn, SocialMode } from "./types";

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
  /** null until the once-ever IdentitySheet is answered (see identityLocked) -
   * editable anytime after via components/IdentityPicker.tsx in Profile. */
  gender: Gender | null;
  /** The default assumed match gender for a contact until overridden
   * per-contact (see lib/api.ts::setContactGender) - a preference, not an
   * identity, since a user may be dating people of more than one gender. */
  interestedIn: InterestedIn | null;
  /** Whether the once-ever IdentitySheet has been answered - unlike `mode`,
   * this never resets and isn't tied to a session, since gender identity
   * isn't a nightly toggle. */
  identityLocked: boolean;
  setMode: (mode: SocialMode) => void;
  lockMode: (mode: SocialMode) => void;
  setLanguage: (language: LanguageCode) => void;
  setGender: (gender: Gender) => void;
  setInterestedIn: (interestedIn: InterestedIn) => void;
  lockIdentity: (gender: Gender, interestedIn: InterestedIn) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      mode: "hype",
      modeLocked: false,
      language: "auto",
      gender: null,
      interestedIn: null,
      identityLocked: false,
      setMode: (mode) => set({ mode }),
      lockMode: (mode) => set({ mode, modeLocked: true }),
      setLanguage: (language) => set({ language }),
      setGender: (gender) => set({ gender }),
      setInterestedIn: (interestedIn) => set({ interestedIn }),
      lockIdentity: (gender, interestedIn) => set({ gender, interestedIn, identityLocked: true }),
    }),
    { name: "bro-coach-session" },
  ),
);

/** The default assumed gender for a contact whose own match_gender hasn't
 * been set yet (see lib/api.ts::setContactGender) - null for "everyone" or
 * unset, since guessing would be worse than the neutral they/them fallback
 * backend/agents/prompts.py::_pronoun_set already applies for null. */
export function defaultMatchGenderFrom(interestedIn: InterestedIn | null): Gender | null {
  if (interestedIn === "men") return "male";
  if (interestedIn === "women") return "female";
  return null;
}

/** Stamps the session's Social Mode tint onto :root (--mode/--mode-soft/--mode-deep). */
export function applyModeVars(mode: SocialMode) {
  const root = document.documentElement;
  root.style.setProperty("--mode", `var(--${mode})`);
  root.style.setProperty("--mode-soft", `var(--${mode}-soft)`);
  root.style.setProperty("--mode-deep", `var(--${mode}-deep)`);
}
