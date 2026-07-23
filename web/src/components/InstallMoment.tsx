"use client";

import { useEffect, useState } from "react";

import { hasDeferredInstallPrompt, triggerInstallPrompt } from "@/components/ServiceWorkerRegister";
import { InstallSheet } from "@/components/InstallSheet";
import { MAX_TIMES_SHOWN, useInstallMoment } from "@/lib/installMoment";
import { isIosDevice, isStandaloneDisplay } from "@/lib/platform";

/** Milestone-timed install ask, mounted on the Result screen only - reaching
 * the Attraction Gauge reveal is this app's proven "aha" moment (per
 * docs/ux_hook_blueprint.md), so that's when installing actually means
 * something to the user, instead of a cold prompt on page load that most
 * PWAs get dismissed on reflex. Fires a beat after mount so the gauge/best-
 * response reveal registers first. Capped at MAX_TIMES_SHOWN lifetime shows
 * (persisted) so a "maybe later" doesn't turn into a nag across sessions -
 * users who want to install later can still do it from Profile any time. */
export function InstallMoment({ ready }: { ready: boolean }) {
  const timesShown = useInstallMoment((s) => s.timesShown);
  const markShown = useInstallMoment((s) => s.markShown);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios">("android");

  useEffect(() => {
    if (!ready || timesShown >= MAX_TIMES_SHOWN || isStandaloneDisplay()) return;
    const ios = isIosDevice();
    if (!ios && !hasDeferredInstallPrompt()) return;

    const id = window.setTimeout(() => {
      setPlatform(ios ? "ios" : "android");
      setOpen(true);
      markShown();
    }, 1800);
    return () => window.clearTimeout(id);
    // Deliberately excludes timesShown/markShown from deps - this should only
    // ever evaluate once per Result mount, not re-fire mid-display.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!open) return null;

  async function handleInstall() {
    setOpen(false);
    await triggerInstallPrompt();
  }

  return <InstallSheet platform={platform} onInstall={handleInstall} onDismiss={() => setOpen(false)} />;
}
