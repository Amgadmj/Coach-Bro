# RESET AI — Design Spec (v2.1, Dusk direction)

Markdown companion to [`ui-spec-v2.html`](ui-spec-v2.html) — same content, git-diffable. The HTML file is the visual reference (open it to actually see the screens); this file is what to read/grep/link to from code and PRs. Kept alongside [`ui-spec-v1.html`](ui-spec-v1.html) (the earlier Airbnb-inspired direction) for comparison, not as its replacement.

## Thesis

**Confidence has a golden hour.** A warmer, glass-and-gradient take on RESET AI, built around the five minutes before you walk in — not just the debate over what to text. Where v1 borrowed hospitality-brand calm, v2 borrows the warmth of a friend hyping you up in the bathroom mirror before you walk back out.

This pass covers the full product surface: the original night-out dashboard screens, plus the screenshot-analysis flow (Arthur/Clara/Leo debate, result, saved contacts, story sharing) carried over from v1 and reskinned into the dusk system.

## Principles

| # | Principle | What it means |
|---|---|---|
| 01 · Tone | **Warm before smart** | Frosted glass, gradient light, and a rounded display face read as encouragement first. The analysis is still rigorous underneath — it just doesn't lead. |
| 02 · Color | **One mode, everywhere** | Whichever Social Mode you're in — Hype, Chill, Romantic, Direct — tints the meter, the buttons, and the active cards for that whole session. The app visibly matches your energy. |
| 03 · Advice | **Momentum you can check off** | Live coaching reads as a short list of physical next actions — Approach, Open, Build Rapport, Exit warm — not paragraphs to read mid-conversation. |
| 04 · Memory | **The night remembers you** | Recap and Ranking turn one night out into a running story with friends, not a one-off score you forget by morning. |

## Foundations

### Color

A dusk palette — golden-hour warmth cooling into night — instead of v1's daylight neutrals. Backgrounds are warm cream, never pastel blue; every interactive surface is frosted glass over a soft gradient, never flat.

**Base**

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--ground` | `#FBF3EC` | `#1C1420` | warm cream, not white |
| `--ground-2` | `#F6E8DF` | `#241B29` | layered card surface |
| `--ink` | `#2A1E26` | `#F5ECE8` | plum-biased, not pure black |
| `--ink-2` | `#6E5C68` | `#C4B3BE` | secondary text |
| `--accent` | `#E24E71` | `#FF6E8E` | brand · confidence |

**Social Mode colors** — tints the *whole session*, wherever the user's chosen mode shows up (meter, buttons, active cards):

| Mode | Light | Dark | Feel |
|---|---|---|---|
| Hype | `#DE8A1E` | `#E8A544` | big energy, loud room |
| Chill | `#1F8C7F` | `#46C4B3` | low-key, coffee shop |
| Romantic | `#E24E71` | `#FF6E8E` | slow down, one-on-one |
| Direct | `#5B4B9C` | `#9284D9` | no games, say the thing |

**Agent identity colors** — a *separate* system, scoped only to the debate and result screens, so a card is never ambiguous about "your mode" vs. "who's talking":

| Agent | Light | Dark | Role |
|---|---|---|---|
| Arthur | `#3B6EA5` | `#7CA8DE` | High-value frame expert |
| Clara | `#9C4F8F` | `#D98BCB` | Female psychology specialist |
| Leo | `#D6592F` | `#EB8355` | Flirty confident boy |

### Type

Display face is the `ui-rounded` CSS generic (renders as SF Pro Rounded on Apple platforms) — production ships **Aeonik**, licensed and self-hosted at build time. Body copy stays on the plain system stack (`-apple-system, Segoe UI, Helvetica Neue`) for maximum legibility at small sizes.

| Style | Size / weight | Example |
|---|---|---|
| Display | 30 / 800 | "Ready for tonight?" |
| Title | 22 / 800 | "Downtown Lounge" |
| Head | 17 / 700 | "Confidence Meter" |
| Body | 15 / 400 (system stack) | "Three good openers for this room." |
| Caption | 13 (system stack) | "11:42 PM · Downtown Lounge" |
| Label | 11 / 700, uppercase | "SOCIAL MODE" |

### Shape & glass

- **Card radius:** 20–28px, never sharp.
- **Pill radius:** 999px — buttons, tabs, chips, tab bar.
- **Glass recipe:** `rgba(255,255,255,.6)` + `blur(14–18px)` + `1px rgba(255,255,255,.7)` border.
- **Shadow:** warm-tinted, never pure grey — shadow color borrows the accent.
- **Elevation:** floating cards overlap the hero banner by 24–40px.

### Social Mode mascots

Reinterprets the reference's mood-blob device: instead of an emotional state, each blob broadcasts the tone the app's suggestions are pitched at. Soft, irregular blob shape (CSS `border-radius` trick, not an image) with two white "eye" dots, one gradient per mode (see table above).

## Flow

**Night-out loop:**

`Dashboard` (greeting + Playbook feed) → *once per night* → `Vibe Check-in` (pick a Social Mode) → `Live Scenario` (Confidence Meter + step timeline) → `Recap` (what actually happened) → `Ranking` (this week, with friends — reachable anytime).

**Screenshot loop** (side room, reachable from any screen):

`Upload a screenshot` → `Debate reveal` (Arthur, Clara & Leo, live) → `Result` (attraction read + best reply) → `Saved Contacts` (relationship memory, per person) → *optional* `Story share` (watermarked card).

## Screens

9 hi-fi screens total — 5 from the night-out loop, 4 carried over from v1's screenshot-analysis loop.

| Screen | Component file | Summary |
|---|---|---|
| **Wingman Dashboard** | `Home.tsx` | Greeting header, current-mode card, horizontally-filterable Playbook feed (pills: All / Bar / Coffee shop / Gym), glass tab bar (Home / Playbook / Live / Profile). |
| **Vibe Check-in** | `VibeSelector.tsx` | Once-per-outing modal over a dimmed dashboard. Four blob mode options + Confirm. Selecting a mode tints the rest of the session's UI. |
| **Live Scenario** | `ScenarioView.tsx` | Venue hero banner, gradient Confidence Meter, checkable step timeline ("Step 2 of 3") for live in-person advice. |
| **Debate reveal** | `DebateAgentCard.tsx` | Arthur, Clara & Leo analyze a screenshot in parallel — each card animates in as its take lands (done / analyzing-with-skeleton / waiting states). |
| **Result** | `ResultCard.tsx` | Attraction Gauge (same `GradientMeter` component as Confidence, relabeled), subtext read, best response, playful/direct alternatives. |
| **Saved Contacts** | `ContactRow.tsx` | Relationship memory list, one row per person, loss-aversion copy on anyone with 2+ reads ("4 reads · next one gets sharper"). |
| **Story share** | `ShareCard.tsx` | Watermarked, story-shaped export card + single share action. Summary only, never the raw conversation. |
| **Night Out Recap** | `RecapStat.tsx` | Venue/date caption, dominant Social Mode with %, 2×2 stat grid (approaches, numbers, best convo length, peak confidence). |
| **Wingman Ranking** | `RankingPodium.tsx` | Week/Month/All-time tabs, top-three podium (trophy on #1), scrollable list below. |

## Interaction & haptics

Motion is warmer and bouncier than v1's restrained hospitality easing — springs, not linear fades. Every rule respects `prefers-reduced-motion`.

| Moment | Motion | Haptic |
|---|---|---|
| Dashboard load | Mode card and Playbook cards stagger in, 60ms apart, spring (damping 18) | — |
| Blob mode select | Tapped blob scales 1 → 1.12 → 1 with a squash-stretch wobble | Light impact |
| Confidence/Attraction Meter fill | Track fills with a spring, 900ms; number counts up in step | Light impact per +10, success on full |
| Step check-off | Dot morphs circle → check with a 200ms scale pop; next step's ring pulses once | Medium impact |
| Playbook horizontal scroll | Snap-to-card, momentum-based, no forced animation | — |
| Recap open | Stat numbers count up from 0 over 700ms, staggered 80ms per tile | — |
| Podium reveal | Bars rise from 0 height, 3rd → 2nd → 1st, 120ms stagger | Success on 1st place landing |

## Handoff

Component vocabulary only — **no implementation yet**. This direction needs confirmation before any Next.js/Tailwind/Framer Motion code is written.

| Component | Screens | Notes |
|---|---|---|
| `VibeSelector` | Vibe Check-in, Dashboard header chip | The four-blob mode picker |
| `PlaybookCard` | Dashboard | Gradient-thumbnail scenario card, filterable by venue-type pill |
| `GradientMeter` | Live Scenario, Result | Same component, two labels (Confidence / Attraction) |
| `StepTimeline` | Live Scenario | Done / now / next, each step a single checkable action |
| `DebateAgentCard` | Debate reveal | Avatar, name, status, shimmer skeleton or landed analysis text |
| `ResultCard` | Result | Wraps a `GradientMeter` + subtext read + best response + alt chips |
| `ContactRow` | Saved Contacts | Avatar, name, read-count caption (loss-averse at 2+) |
| `ShareCard` | Story share | Watermarked export card + share action |
| `RecapStat` | Recap | Glass stat tile with count-up numeral, 2×2 grid |
| `RankingPodium` | Ranking | Top-three podium with gradient bars + plain list below |

**Target stack:** Next.js + Tailwind CSS + Framer Motion, replacing the Expo/React Native app going forward.

**Backend status:**
- Debate reveal, Result, Saved Contacts, and Story share already have a real API — the existing FastAPI swarm backend (`backend/`, unchanged). These four should wire to it directly.
- Playbook, Confidence Meter, Recap, and Ranking have no backend yet — implementation starts against a typed mock `api.ts`.

Final feature-to-nav mapping (e.g. exactly where the screenshot-upload entry point lives relative to the Live tab) is still an open decision — this is a design pass, not a product-scope decision.
