"use client";

import { useEffect } from "react";

import { languageDir } from "@/lib/i18n";
import { applyModeVars, useSession } from "@/lib/session";

/** Keeps :root's --mode* custom properties, and the document's lang/dir
 * attributes, in sync with the session's Social Mode and Language. */
export function ModeSync() {
  const mode = useSession((s) => s.mode);
  const language = useSession((s) => s.language);

  useEffect(() => applyModeVars(mode), [mode]);

  useEffect(() => {
    const dir = languageDir(language);
    document.documentElement.dir = dir;
    document.documentElement.lang = language === "auto" ? "en" : language;
  }, [language]);

  return null;
}
