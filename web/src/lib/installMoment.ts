"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Lifetime cap on the milestone-triggered install ask (see InstallMoment) -
 * enough to catch a user across a few sessions without turning into a nag.
 * The manual "Install app" row in Profile is uncapped since the user opened
 * it on purpose. */
export const MAX_TIMES_SHOWN = 3;

interface InstallMomentState {
  timesShown: number;
  markShown: () => void;
}

export const useInstallMoment = create<InstallMomentState>()(
  persist(
    (set) => ({
      timesShown: 0,
      markShown: () => set((s) => ({ timesShown: s.timesShown + 1 })),
    }),
    { name: "bro-coach-install-moment" },
  ),
);
