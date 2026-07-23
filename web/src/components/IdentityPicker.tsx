"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import type { Gender, InterestedIn } from "@/lib/types";
import { GlassCard } from "./GlassCard";

const GENDER_KEYS: { value: Gender; labelKey: "male" | "female" | "nonBinary" }[] = [
  { value: "male", labelKey: "male" },
  { value: "female", labelKey: "female" },
  { value: "non_binary", labelKey: "nonBinary" },
];

const INTEREST_KEYS: { value: InterestedIn; labelKey: "men" | "women" | "everyone" }[] = [
  { value: "men", labelKey: "men" },
  { value: "women", labelKey: "women" },
  { value: "everyone", labelKey: "everyone" },
];

/** Profile-editable counterpart to the once-ever IdentitySheet - same fields,
 * freely changeable afterward (mirrors LanguagePicker.tsx's pattern exactly:
 * a GlassCard, an aria-pressed button grid, a transient "updated" toast). */
export function IdentityPicker() {
  const { gender, interestedIn, setGender, setInterestedIn } = useSession();
  const t = useT();
  const [justUpdated, setJustUpdated] = useState(false);

  function flashUpdated() {
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1500);
  }

  return (
    <GlassCard className="p-4">
      <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
        {t("identity.pickerTitle")}
      </div>
      <p className="mt-1 text-[12px] text-ink2">{t("identity.pickerSubtitle")}</p>

      <div className="mt-3 text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
        {t("identity.genderLabel")}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {GENDER_KEYS.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setGender(value);
              flashUpdated();
            }}
            aria-pressed={gender === value}
            className="interactive tap-expand rounded-2xl border px-2 py-2.5 text-center font-display text-[12px] font-bold transition-colors"
            style={{
              borderColor: gender === value ? "var(--accent)" : "var(--hairline)",
              background: gender === value ? "var(--accent-soft)" : "var(--glass)",
              color: gender === value ? "var(--accent-deep)" : "var(--ink)",
            }}
          >
            {t(`genders.${labelKey}`)}
          </button>
        ))}
      </div>

      <div className="mt-3 text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
        {t("identity.interestedInLabel")}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {INTEREST_KEYS.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setInterestedIn(value);
              flashUpdated();
            }}
            aria-pressed={interestedIn === value}
            className="interactive tap-expand rounded-2xl border px-2 py-2.5 text-center font-display text-[12px] font-bold transition-colors"
            style={{
              borderColor: interestedIn === value ? "var(--accent)" : "var(--hairline)",
              background: interestedIn === value ? "var(--accent-soft)" : "var(--glass)",
              color: interestedIn === value ? "var(--accent-deep)" : "var(--ink)",
            }}
          >
            {t(`interests.${labelKey}`)}
          </button>
        ))}
      </div>

      {justUpdated && (
        <p className="mt-2.5 text-center text-[11px] font-semibold text-accent-deep" role="status">
          {t("identity.updated")}
        </p>
      )}
    </GlassCard>
  );
}
