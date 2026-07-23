"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Coachmark, type CoachmarkStep } from "@/components/Coachmark";
import { GlassCard } from "@/components/GlassCard";
import { TabBar } from "@/components/TabBar";
import { fetchContacts } from "@/lib/api";
import { useAnalysis } from "@/lib/analysis";
import { useT } from "@/lib/i18n";
import { useTutorial } from "@/lib/tutorial";
import type { ContactSummary, SuggestCategory } from "@/lib/types";
import { clsx } from "@/lib/clsx";

const LIVE_STEPS: CoachmarkStep[] = [
  { target: "live-contacts", titleKey: "tutorial.live.contactsTitle", bodyKey: "tutorial.live.contactsBody" },
  { target: "live-scenario", titleKey: "tutorial.live.scenarioTitle", bodyKey: "tutorial.live.scenarioBody" },
  { target: "live-send", titleKey: "tutorial.live.sendTitle", bodyKey: "tutorial.live.sendBody" },
];

// Kept only as the lookup table for the `?mission=` URL param (see the
// `useEffect` below) - the on-page mission chip row that used to render from
// this list has moved to Home/Playbook per the nav-model remediation (R3).
const MISSION_KEYS = [
  { key: "icebreaker", category: "icebreaker" },
  { key: "vibeShift", category: "vibe_shift" },
  { key: "exitStrategy", category: "exit_strategy" },
] as const satisfies readonly { key: string; category: SuggestCategory }[];

/** Mirrors backend/main.py's MAX_IMAGES_PER_ANALYZE default - catching this
 * client-side gives an immediate, friendly message instead of a failed
 * request after the user has already waited for the upload. */
const MAX_SCREENSHOTS = 20;

/** Dedupe key for a File so re-picking the same file twice (e.g. reopening the
 * picker and selecting it again by mistake) doesn't attach it twice. */
function fileKey(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

function LiveScenarioInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runAnalysis = useAnalysis((s) => s.run);
  const t = useT();
  const [scenario, setScenario] = useState("");
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  // Set by the ?mission= deep link on mount (see effect below), or (formerly)
  // by tapping a mission chip on this page; cleared the moment the user
  // hand-edits the scenario text afterward (see the textarea's onChange
  // below) so an edited message reverts to the default full-debate send
  // instead of silently still routing to the lightweight /say suggestions.
  const [missionCategory, setMissionCategory] = useState<SuggestCategory | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [readsExpanded, setReadsExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const welcomeSeen = useTutorial((s) => s.welcomeSeen);
  const startPage = useTutorial((s) => s.startPage);

  useEffect(() => {
    fetchContacts().then(setContacts).catch(() => setContacts([]));
  }, []);

  useEffect(() => {
    startPage("live", LIVE_STEPS.length);
  }, [welcomeSeen, startPage]);

  // R3: Home and Playbook link here via `/live?mission=<key>` instead of this
  // page hosting its own mission-picker chips. Reproduce exactly what tapping
  // the old chip used to do, once, on load.
  useEffect(() => {
    const missionParam = searchParams.get("mission");
    const chip = MISSION_KEYS.find((m) => m.key === missionParam);
    if (!chip) return;
    setMissionCategory(chip.category);
    setScenario(`${t(`missions.${chip.key}.title`)}: `);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Open profile" /* [inline-copy] no existing i18n key fits this aria-label */
          onClick={() => router.push("/profile")}
          className="interactive tap-expand flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--romantic),var(--direct))] font-display text-xs font-bold text-white"
        >
          A
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center font-display text-base font-extrabold">
          Bro Coach
        </h1>
        {/* R4: the `⋯` overflow control had no defined destination anywhere in
            the app (no report/block/mute/settings menu exists for Live) - per
            the ship rule, removed rather than shipped as a no-op. This empty
            spacer keeps the title visually centered, mirroring TopBar's
            `<div className="w-9" />` no-action spacer. */}
        <div className="h-8 w-8 flex-none" />
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h2 className="font-display text-[15px] font-extrabold">{t("live.yourReads")}</h2>
        <button
          type="button"
          onClick={() => setReadsExpanded((v) => !v)}
          className="interactive tap-expand text-[10px] font-bold uppercase tracking-[0.08em] text-accent-deep"
        >
          {/* [inline-copy] "SHOW LESS" has no existing i18n key; common.seeAll covers the other state */}
          {readsExpanded ? "SHOW LESS" : t("common.seeAll")}
        </button>
      </div>
      <div
        data-tutorial="live-contacts"
        className={clsx(
          "mt-2 flex gap-2 pb-1",
          readsExpanded
            ? "flex-wrap"
            : "overflow-x-auto [-webkit-mask-image:linear-gradient(90deg,#000_88%,transparent)]",
        )}
      >
        {contacts.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedContact(selectedContact === c.id ? null : c.id)}
            className={clsx(
              "interactive flex flex-none items-center gap-1.5 rounded-full border bg-glass py-1 pl-1 pr-3",
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
          className="interactive flex flex-none items-center rounded-full border border-dashed border-hairline bg-glass px-3.5 py-1 text-[11px] font-bold text-ink3"
        >
          {t("live.newChip")}
        </button>
      </div>

      <div
        data-tutorial="live-scenario"
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
                    className="interactive flex h-4 w-4 items-center justify-center rounded-full text-[11px] leading-none text-accent-deep hover:bg-white/40"
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
                "interactive whitespace-nowrap rounded-full border px-3.5 py-2 font-display text-[10.5px] font-bold",
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
              data-tutorial="live-send"
              onClick={submit}
              disabled={screenshots.length === 0 && !scenario.trim()}
              className="interactive flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(160deg,var(--mode),var(--mode-deep))] shadow-clay transition-transform active:translate-y-0.5 disabled:opacity-40"
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

      <Coachmark page="live" steps={LIVE_STEPS} />
      <TabBar />
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <LiveScenarioInput />
    </Suspense>
  );
}
