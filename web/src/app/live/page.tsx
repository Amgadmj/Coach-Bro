"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GlassCard } from "@/components/GlassCard";
import { TabBar } from "@/components/TabBar";
import { fetchContacts } from "@/lib/api";
import { useAnalysis } from "@/lib/analysis";
import { useT } from "@/lib/i18n";
import type { ContactSummary, SuggestCategory } from "@/lib/types";
import { clsx } from "@/lib/clsx";

const MISSION_KEYS = [
  { key: "icebreaker", category: "icebreaker", bg: "var(--hype-soft)", color: "var(--hype)" },
  { key: "vibeShift", category: "vibe_shift", bg: "var(--chill-soft)", color: "var(--chill)" },
  { key: "exitStrategy", category: "exit_strategy", bg: "var(--direct-soft)", color: "var(--direct)" },
] as const satisfies readonly { key: string; category: SuggestCategory; bg: string; color: string }[];

/** Mirrors backend/main.py's MAX_IMAGES_PER_ANALYZE default - catching this
 * client-side gives an immediate, friendly message instead of a failed
 * request after the user has already waited for the upload. */
const MAX_SCREENSHOTS = 20;

/** Dedupe key for a File so re-picking the same file twice (e.g. reopening the
 * picker and selecting it again by mistake) doesn't attach it twice. */
function fileKey(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

export default function LiveScenarioInput() {
  const router = useRouter();
  const runAnalysis = useAnalysis((s) => s.run);
  const t = useT();
  const [scenario, setScenario] = useState("");
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  // Set by tapping a mission chip; cleared the moment the user hand-edits the
  // scenario text afterward (see the textarea's onChange below) so an edited
  // message reverts to the default full-debate send instead of silently still
  // routing to the lightweight /say suggestions.
  const [missionCategory, setMissionCategory] = useState<SuggestCategory | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContacts().then(setContacts).catch(() => setContacts([]));
  }, []);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setScreenshots((prev) => {
      const seen = new Set(prev.map(fileKey));
      const additions = Array.from(files).filter((f) => !seen.has(fileKey(f)));
      const room = MAX_SCREENSHOTS - prev.length;
      if (additions.length > room) {
        setAttachError(t("live.tooManyScreenshots", { max: MAX_SCREENSHOTS }));
      } else {
        setAttachError(null);
      }
      return [...prev, ...additions.slice(0, Math.max(0, room))];
    });
  }

  function removeFile(index: number) {
    setAttachError(null);
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  }

  function submit() {
    const trimmed = scenario.trim();

    // A mission chip is a distinct, lighter request (three short lines for a
    // specific job) rather than a full screenshot-style read - route straight
    // to /say with its category. Only applies screenshot-free: if the user also
    // attached screenshots, the mission text is folded into the debate instead.
    if (screenshots.length === 0 && missionCategory && trimmed) {
      router.push(`/say?category=${missionCategory}&scenario=${encodeURIComponent(trimmed)}`);
      return;
    }

    // Screenshots and/or typed/pasted text both get the full Arthur - Clara -
    // Leo swarm debate - see CLAUDE.md's user-facing behavior note: pasted text
    // is not a lighter code path than a screenshot.
    if (screenshots.length > 0 || trimmed) {
      void runAnalysis({ images: screenshots, textContent: trimmed || null, contactId: selectedContact });
      router.push("/read");
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
        <h2 className="font-display text-[15px] font-extrabold">{t("live.yourReads")}</h2>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent-deep">
          {t("common.seeAll")}
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
                {c.session_count} {c.session_count === 1 ? t("live.read") : t("live.reads")}
              </span>
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const name = window.prompt(t("live.newContactPrompt"))?.trim();
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
          {t("live.newChip")}
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <GlassCard
          className={clsx("mt-4 p-3.5", isDraggingFile && "ring-2 ring-accent ring-offset-2 ring-offset-transparent")}
        >
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink3">
            {t("live.scenarioLabel")}
          </div>
          <textarea
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value);
              setMissionCategory(null);
            }}
            placeholder={t("live.scenarioPlaceholder")}
            rows={3}
            className="mt-1.5 w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink3"
          />

          {screenshots.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {screenshots.map((file, i) => (
                <span
                  key={fileKey(file)}
                  className="flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-1 pl-2.5 pr-1 text-[10px] font-bold text-accent-deep"
                >
                  {file.name.length > 16 ? `${file.name.slice(0, 16)}…` : file.name}
                  <button
                    type="button"
                    aria-label={t("live.removeScreenshot")}
                    onClick={() => removeFile(i)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[11px] leading-none text-accent-deep hover:bg-white/40"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              // display:none can fail to fire a programmatic .click() reliably in
              // some WebKit standalone-PWA contexts (installed home-screen apps) -
              // sr-only keeps it clipped to a 0-area box (via `clip`) instead of
              // display:none, which is what actually keeps it from ever painting
              // over - or intercepting clicks meant for - the buttons next to it
              // (a plain absolute+opacity-0 box has no clip, so it still occupies
              // a hit-testable area and, being positioned, paints above its
              // static-position siblings per stacking rules).
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = ""; // allow re-selecting the same file later
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={clsx(
                "whitespace-nowrap rounded-full border px-3.5 py-2 font-display text-[10.5px] font-bold",
                screenshots.length > 0 ? "border-accent text-accent-deep" : "border-hairline bg-glass text-ink2",
              )}
            >
              {screenshots.length === 0
                ? t("live.addScreenshot")
                : `${t("live.screenshotsCount", { count: screenshots.length })} · ${t("live.addMoreScreenshots")}`}
            </button>
            <button
              type="button"
              aria-label={t("live.send")}
              onClick={submit}
              disabled={screenshots.length === 0 && !scenario.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(160deg,var(--mode),var(--mode-deep))] shadow-clay transition-transform active:translate-y-0.5 disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" className="rtl:-scale-x-100">
                <path d="M3 2 L11 7 L3 12 Z" fill="#fff" />
              </svg>
            </button>
          </div>
        </GlassCard>
      </div>
      <p className={clsx("mt-3 text-center text-[11px]", attachError ? "font-bold text-accent-deep" : "text-ink3")}>
        {attachError ?? t("live.screenshotHint")}
      </p>

      <h2 className="mt-4 font-display text-[15px] font-extrabold">{t("live.orMission")}</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MISSION_KEYS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => {
              setMissionCategory(chip.category);
              setScenario(`${t(`missions.${chip.key}.title`)}: `);
            }}
            className={clsx(
              "rounded-full px-3.5 py-2 font-display text-[11px] font-bold",
              missionCategory === chip.category && "ring-2 ring-offset-1",
            )}
            style={{ background: chip.bg, color: chip.color }}
          >
            {t(`missions.${chip.key}.title`)}
          </button>
        ))}
      </div>

      <TabBar />
    </main>
  );
}
