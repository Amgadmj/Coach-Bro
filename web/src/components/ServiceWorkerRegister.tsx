"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker (public/sw.js). Silently no-ops on
 * insecure origins (plain http on a LAN IP) since browsers refuse SW
 * registration outside a secure context (https or localhost) - install still
 * works there via the manifest alone, just without offline caching. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // insecure origin or unsupported - the app still works, just without
        // offline caching until served over https
      });
    }
  }, []);
  return null;
}
