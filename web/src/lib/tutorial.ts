"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** One entry per screen that has its own contextual coachmark sequence.
 * Keep in sync with the <Coachmark page="..."> usages in each screen. */
export type TutorialPageKey = "home" | "live" | "read" | "result" | "profile";

interface TutorialState {
  /** Set when the user taps "Skip the tour" on the welcome modal - suppresses
   * every future per-page sequence too, not just the welcome modal itself. */
  tourDisabled: boolean;
  welcomeSeen: boolean;
  seenPages: Partial<Record<TutorialPageKey, boolean>>;
  activePage: TutorialPageKey | null;
  activeStep: number;
  totalSteps: number;
  /** startTour=false means "Skip the tour" - also flips tourDisabled. */
  dismissWelcome: (startTour: boolean) => void;
  /** No-ops if the tour is disabled, welcome hasn't been dismissed yet, this
   * page's sequence has already been seen, or another page's is mid-run -
   * safe to call unconditionally from every screen's mount effect. */
  startPage: (page: TutorialPageKey, totalSteps: number) => void;
  next: () => void;
  back: () => void;
  /** Ends the current page's sequence early and marks it seen, same as
   * finishing it - a user who skips isn't nagged again next visit. */
  skipPage: () => void;
  /** Clears every seen/disabled flag - wired to Profile's "Replay tutorial". */
  replayAll: () => void;
}

export const useTutorial = create<TutorialState>()(
  persist(
    (set, get) => ({
      tourDisabled: false,
      welcomeSeen: false,
      seenPages: {},
      activePage: null,
      activeStep: 0,
      totalSteps: 0,

      dismissWelcome: (startTour) => set({ welcomeSeen: true, tourDisabled: !startTour }),

      startPage: (page, totalSteps) => {
        const { tourDisabled, welcomeSeen, seenPages, activePage } = get();
        if (tourDisabled || !welcomeSeen || seenPages[page] || activePage || totalSteps === 0) return;
        set({ activePage: page, activeStep: 0, totalSteps });
      },

      next: () => {
        const { activePage, activeStep, totalSteps, seenPages } = get();
        if (!activePage) return;
        if (activeStep + 1 >= totalSteps) {
          set({ activePage: null, activeStep: 0, seenPages: { ...seenPages, [activePage]: true } });
        } else {
          set({ activeStep: activeStep + 1 });
        }
      },

      back: () => {
        const { activeStep } = get();
        if (activeStep > 0) set({ activeStep: activeStep - 1 });
      },

      skipPage: () => {
        const { activePage, seenPages } = get();
        if (!activePage) return;
        set({ activePage: null, activeStep: 0, seenPages: { ...seenPages, [activePage]: true } });
      },

      replayAll: () =>
        set({ tourDisabled: false, welcomeSeen: false, seenPages: {}, activePage: null, activeStep: 0 }),
    }),
    { name: "bro-coach-tutorial" },
  ),
);
