"use client";

import { useEffect } from "react";

import { applyModeVars, useSession } from "@/lib/session";

/** Keeps :root's --mode* custom properties in sync with the session's Social Mode. */
export function ModeSync() {
  const mode = useSession((s) => s.mode);
  useEffect(() => applyModeVars(mode), [mode]);
  return null;
}
