"use client";

import { LANGUAGES, useT } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { GlassCard } from "./GlassCard";

/** Drives both the app's UI language and the AI response-language override
 * sent with every /analyze and /suggest call - see lib/i18n.ts and
 * backend/agents/prompts.py::resolve_response_language. */
export function LanguagePicker() {
  const { language, setLanguage } = useSession();
  const t = useT();

  return (
    <GlassCard className="p-4">
      <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
        {t("language.title")}
      </div>
      <p className="mt-1 text-[12px] text-ink2">{t("language.subtitle")}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            aria-pressed={language === lang.code}
            className="rounded-2xl border px-3 py-2.5 text-start font-display text-[13px] font-bold transition-colors"
            style={{
              borderColor: language === lang.code ? "var(--accent)" : "var(--hairline)",
              background: language === lang.code ? "var(--accent-soft)" : "var(--glass)",
              color: language === lang.code ? "var(--accent-deep)" : "var(--ink)",
            }}
          >
            {lang.nativeName}
            {lang.code !== "auto" && lang.nativeName !== lang.englishName && (
              <span className="ms-1 font-sans text-[10px] font-normal text-ink3">
                ({lang.englishName})
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-ink3">{t("language.autoNote")}</p>
    </GlassCard>
  );
}
