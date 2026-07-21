"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { GhostButton } from "@/components/ClayButton";
import { TopBar } from "@/components/TopBar";
import { suggestOpeners } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import type { Suggestion } from "@/lib/types";

const CARD_GRADIENTS = [
  "linear-gradient(160deg,var(--hype),var(--hype-deep))",
  "linear-gradient(160deg,var(--romantic),var(--romantic-deep))",
  "linear-gradient(160deg,var(--direct),var(--direct-deep))",
];

function WhatToSayNext() {
  const params = useSearchParams();
  const scenario = params.get("scenario") ?? "";
  const { mode, language } = useSession();
  const t = useT();
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    setSuggestions(null);
    setError(null);
    suggestOpeners(scenario, mode, language)
      .then((r) => setSuggestions(r.suggestions))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [scenario, mode, language, round]);

  async function copy(text: string, i: number) {
    await navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <main>
      <TopBar title={t("say.title")} />

      {scenario && (
        <div className="mt-3.5 flex items-center gap-2 rounded-2xl border border-glass-line bg-glass px-3.5 py-2.5">
          <span className="h-2 w-2 flex-none rounded-full" style={{ background: "var(--mode)" }} />
          <p className="text-[11px] italic leading-snug text-ink2">&ldquo;{scenario}&rdquo;</p>
        </div>
      )}

      {error && <p className="mt-4 text-center text-sm text-accent-deep">{error}</p>}

      <div className="mt-4 flex flex-col gap-4">
        {(suggestions ?? Array.from({ length: 3 }, () => null)).map((s, i) => (
          <motion.div
            key={`${round}-${i}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, type: "spring", stiffness: 220, damping: 22 }}
            className="rounded-card p-4 text-white shadow-[0_5px_0_rgba(0,0,0,.22),0_16px_26px_var(--shadow-tint)]"
            style={{ background: CARD_GRADIENTS[i % CARD_GRADIENTS.length] }}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-[13px] font-extrabold opacity-90">
                {s?.label ?? "…"}
              </span>
              {s && (
                <button
                  type="button"
                  onClick={() => copy(s.text, i)}
                  className="rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]"
                >
                  {copied === i ? t("say.copied") : t("say.copy")}
                </button>
              )}
            </div>
            <p className="mt-1.5 min-h-5 text-[13.5px] font-semibold leading-relaxed">
              {s ? `"${s.text}"` : t("say.thinking")}
            </p>
          </motion.div>
        ))}
      </div>

      <GhostButton className="mt-5" onClick={() => setRound((r) => r + 1)}>
        {t("say.giveMeThree")}
      </GhostButton>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <WhatToSayNext />
    </Suspense>
  );
}
