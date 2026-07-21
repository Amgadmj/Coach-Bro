"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GlassCard } from "@/components/GlassCard";
import { TabBar } from "@/components/TabBar";
import { fetchContacts } from "@/lib/api";
import { useAnalysis } from "@/lib/analysis";
import type { ContactSummary } from "@/lib/types";
import { clsx } from "@/lib/clsx";

const MISSION_CHIPS = [
  { label: "Icebreaker", bg: "var(--hype-soft)", color: "var(--hype)" },
  { label: "Vibe Shift", bg: "var(--chill-soft)", color: "var(--chill)" },
  { label: "Exit Strategy", bg: "var(--direct-soft)", color: "var(--direct)" },
];

export default function LiveScenarioInput() {
  const router = useRouter();
  const runAnalysis = useAnalysis((s) => s.run);
  const [scenario, setScenario] = useState("");
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContacts().then(setContacts).catch(() => setContacts([]));
  }, []);

  function submit() {
    if (screenshot) {
      // Screenshots get the full Arthur - Clara - Leo debate.
      void runAnalysis(screenshot, selectedContact, scenario || null);
      router.push("/read");
    } else if (scenario.trim()) {
      router.push(`/say?scenario=${encodeURIComponent(scenario.trim())}`);
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--romantic),var(--direct))] font-display text-xs font-bold text-white">
          A
        </div>
        <h1 className="font-display text-base font-extrabold">Bro Coach</h1>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-glass-line bg-glass font-extrabold text-ink2">
          ⋯
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h2 className="font-display text-[15px] font-extrabold">Your reads</h2>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent-deep">
          See all
        </span>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-webkit-mask-image:linear-gradient(90deg,#000_88%,transparent)]">
        {contacts.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedContact(selectedContact === c.id ? null : c.id)}
            className={clsx(
              "flex flex-none items-center gap-1.5 rounded-full border bg-glass py-1 pl-1 pr-3",
              selectedContact === c.id ? "border-accent" : "border-glass-line",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-clara font-display text-[11px] font-bold text-white">
              {c.display_name[0]}
            </span>
            <span className="text-left">
              <span className="block font-display text-[11px] font-bold leading-tight">
                {c.display_name}
              </span>
              <span className="block text-[9px] leading-tight text-ink3">
                {c.session_count} {c.session_count === 1 ? "read" : "reads"}
              </span>
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const name = window.prompt("Who are you talking to? (first name is fine)")?.trim();
            if (!name) return;
            const id = name.toLowerCase();
            setContacts((prev) =>
              prev.some((c) => c.id === id)
                ? prev
                : [...prev, { id, display_name: name, session_count: 0 }],
            );
            setSelectedContact(id);
          }}
          className="flex flex-none items-center rounded-full border border-dashed border-hairline bg-glass px-3.5 py-1 text-[11px] font-bold text-ink3"
        >
          ＋ New
        </button>
      </div>

      <GlassCard className="mt-4 p-3.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">Scenario</div>
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder={'Describe the situation… e.g. "At a coffee shop, she\'s reading my favorite book."'}
          rows={3}
          className="mt-1.5 w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink3"
        />
        <div className="mt-2 flex items-center justify-between">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={clsx(
              "whitespace-nowrap rounded-full border px-3.5 py-2 font-display text-[10.5px] font-bold",
              screenshot ? "border-accent text-accent-deep" : "border-hairline bg-glass text-ink2",
            )}
          >
            {screenshot ? `✓ ${screenshot.name.slice(0, 18)}` : "Add screenshot"}
          </button>
          <button
            type="button"
            aria-label="Send"
            onClick={submit}
            disabled={!screenshot && !scenario.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(160deg,var(--mode),var(--mode-deep))] shadow-clay transition-transform active:translate-y-0.5 disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M3 2 L11 7 L3 12 Z" fill="#fff" />
            </svg>
          </button>
        </div>
      </GlassCard>
      <p className="mt-3 text-center text-[11px] text-ink3">
        Screenshots get the full Arthur · Clara · Leo debate.
      </p>

      <h2 className="mt-4 font-display text-[15px] font-extrabold">Or start from a mission</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MISSION_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setScenario(`${chip.label}: `)}
            className="rounded-full px-3.5 py-2 font-display text-[11px] font-bold"
            style={{ background: chip.bg, color: chip.color }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <TabBar />
    </main>
  );
}
