"use client";

import { useEffect, useState } from "react";

import { useT } from "@/lib/i18n";

/** Minimal shape of the non-standard `beforeinstallprompt` event - not yet in
 * lib.dom.d.ts, so we declare just the bits we use. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/** Stashed at module scope (not component state) so a future UI trigger
 * anywhere else in the app - e.g. a "Install app" row on a settings screen -
 * can call `triggerInstallPrompt()` without needing its own listener. The
 * browser only ever fires this event once until the page reloads, so a single
 * module-level slot is all that's needed. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

/** Fires the previously-captured install prompt on demand, instead of relying
 * on the browser's default mini-infobar timing. No-ops if the browser hasn't
 * fired `beforeinstallprompt` yet (unsupported browser, already installed, or
 * criteria not met) or if the prompt was already consumed. Whoever builds the
 * next UI entry point for "Install app" should call this. */
export async function triggerInstallPrompt(): Promise<void> {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  deferredPrompt = null;
}

/** Registers the app-shell service worker (public/sw.js) and captures the
 * install prompt. Silently no-ops SW registration on insecure origins (plain
 * http on a LAN IP) since browsers refuse SW registration outside a secure
 * context (https or localhost) - install still works there via the manifest
 * alone, just without offline caching. */
export function ServiceWorkerRegister() {
  const [showBanner, setShowBanner] = useState(false);
  const t = useT();

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
      // timing - stash the event for our own banner (below) or a later
      // caller of triggerInstallPrompt().
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      setShowBanner(true);
    }
    function onAppInstalled() {
      deferredPrompt = null;
      setShowBanner(false);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function handleInstall() {
    setShowBanner(false);
    await triggerInstallPrompt();
  }

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t border-glass-line bg-glass-strong px-4 py-2.5 backdrop-blur-xl">
      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-ink">
        {t("common.installTitle")}
      </span>
      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={() => setShowBanner(false)}
          className="px-1.5 py-1 text-[11px] font-semibold text-ink3"
        >
          {t("common.installDismiss")}
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-full bg-[linear-gradient(160deg,var(--accent),var(--accent-deep))] px-3 py-1.5 text-[11px] font-bold text-white shadow-clay"
        >
          {t("common.installAction")}
        </button>
      </div>
    </div>
  );
}
