/** Small runtime checks for the install-moment flow - kept out of the
 * component so both the milestone trigger (InstallMoment) and the manual
 * Profile row can share the same detection logic. */

/** True once actually installed (standalone/fullscreen display), on any
 * platform - iOS exposes this via the non-standard `navigator.standalone`,
 * everyone else via the `display-mode` media feature. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true;
}

/** iOS/iPadOS Safari never fires `beforeinstallprompt` - "Add to Home
 * Screen" only exists behind the manual Share-sheet flow there, so this
 * gates which install UI (button vs numbered steps) we show. iPadOS 13+
 * reports a "Macintosh" UA, hence the touch-points check. */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIphoneFamily = /iPhone|iPad|iPod/.test(ua);
  const isIpadOsDesktopUa = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isIphoneFamily || isIpadOsDesktopUa;
}
