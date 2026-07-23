"use client";

import { useEffect } from "react";

/** Minimal shape of the non-standard `beforeinstallprompt` event - not yet in
 * lib.dom.d.ts, so we declare just the bits we use. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/** Stashed at module scope (not component state) so any UI that wants to
 * trigger install - the milestone-timed InstallMoment on /result, or the
 * manual "Install app" row on Profile - can call `triggerInstallPrompt()`
 * without needing its own listener. The browser only ever fires this event
 * once until the page reloads, so a single module-level slot is all that's
 * needed. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

/** Whether a native install prompt is available to fire right now (Chrome/
 * Edge/Android - never true on iOS Safari, which has no such event). Callers
 * that find this false but still want to offer install should fall back to
 * the iOS Share-sheet instructions instead. */
export function hasDeferredInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

/** Fires the previously-captured install prompt on demand, instead of relying
 * on the browser's default mini-infobar timing. No-ops if the browser hasn't
 * fired `beforeinstallprompt` yet (unsupported browser, already installed, or
 * criteria not met) or if the prompt was already consumed. */
export async function triggerInstallPrompt(): Promise<void> {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  deferredPrompt = null;
}

/** Registers the app-shell service worker (public/sw.js) and captures the
 * install prompt for later, deliberate use - see InstallMoment and Profile's
 * "Install app" row for where it's actually surfaced. Deliberately renders no
 * banner of its own: a generic bottom banner that appears the moment Chrome
 * decides to fire the event would compete with, and undercut, the
 * milestone-timed ask. Silently no-ops SW registration on insecure origins
 * (plain http on a LAN IP) since browsers refuse SW registration outside a
 * secure context (https or localhost) - install still works there via the
 * manifest alone, just without offline caching. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // insecure origin or unsupported - the app still works, just without
        // offline caching until served over https
      });
    }
  }, []);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      // Suppress the browser's default mini-infobar/banner so we control the
      // timing entirely - see InstallMoment and the Profile install row.
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
    }
    function onAppInstalled() {
      deferredPrompt = null;
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  return null;
}
