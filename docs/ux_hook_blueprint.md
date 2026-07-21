# Behavioral UX Blueprint — The Hook Model

RESET AI's retention design is built directly on Nir Eyal's Hook Model (Trigger → Action → Variable Reward → Investment), with the loop closing back into a growth mechanism. Every screen listed below exists to serve one stage of the loop — if a proposed feature doesn't map to a stage, it doesn't belong in the MVP.

## Trigger

- **Internal trigger (primary):** anxiety, uncertainty, or excitement immediately after receiving an ambiguous or high-stakes text from a romantic interest — "did that mean what I think it meant?" This is the emotional state the app is built to resolve, not create.
- **External trigger (future, out of scope for this scaffold):** a push notification nudging the user back in ("Still thinking about how to reply to Sarah?"). The scaffold's `contacts` table and `last_interaction_at` column exist so this can be added later without a data model change.

## Action

The lowest-friction possible action: **open the app → the screenshot dropzone is the entire Home screen.** No login wall, no onboarding carousel, no "select a category" step between opening the app and uploading.

- `app/index.tsx` opens `expo-image-picker` directly from a single tap on `ImagePickerDropzone` — no intermediate confirmation screen.
- Optional `contact_id` selection (attach this screenshot to an existing Relationship Memory) is a secondary, skippable affordance, never a blocker to the primary action.

## Variable Reward — "the slot machine"

This is the core retention mechanic, and the reason the backend streams `DebateEvent`s over SSE instead of returning one blocking JSON response (see `architecture.md` §4).

- `app/debate-reveal.tsx` renders `DebateAvatarStack`: as each `agent_started`/`agent_done` event arrives, that persona's avatar animates in and their `SkeletonLoader` resolves into their actual take. The reward is variable because `dynamic_analysis` and each agent's read genuinely differ every session — there is nothing scripted to get bored of.
- **Deliberate pacing floor:** even if the backend responds within milliseconds (likely once cached/fast models are wired in), the UI enforces a minimum ~1.2–1.8s dwell per agent card before revealing the next one. Collapsing this to "instant" would flatten the anticipation curve into a boring loading state — the pause is doing real behavioral work, not covering latency.
- The final beat is the **Attraction Gauge** locking on the Result screen (`AttractionGauge` component), paired with a haptic (`expo-haptics` `notificationAsync(Success)`) at the exact moment the number settles. This is the single most "slot-machine" moment in the app and should feel weightier than the per-agent reveals — a distinct haptic pattern, not a repeat of the per-card ones.

## Investment

- **Relationship Memory accumulation:** every analyzed screenshot for a contact deposits into that contact's history (`contacts.py` list screen). Copy pattern is explicitly loss-aversion framed: *"You have 4 reads on Sarah — the next one gets sharper."* The more history a contact has, the more the app "knows" that dynamic, which makes switching to a competitor app feel like starting over from zero.
- **Saved/rated responses:** letting the user mark which suggested response they actually sent and how it landed is a second, lighter investment loop (flagged for a fast-follow, not this scaffold, but the `analysis_results` table shape doesn't need to change to support it).
- **Story-card export:** `app/story-card.tsx` + `StoryCardExport` renders a watermarked, Tinder/IG-story-shaped card summarizing the read (not the raw private conversation) for sharing. This closes the loop as a **growth mechanism**: the watermark is the acquisition surface, and the act of curating a shareable card is itself a light investment action.

## Mechanics reference table

| Moment | Mechanic | Implementation |
|---|---|---|
| App open | Zero-friction action | `expo-image-picker` opens on first tap, no intermediate screen |
| Each agent card reveal | Light haptic tick | `expo-haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| Attraction Gauge lock | Heavy/success haptic | `expo-haptics.notificationAsync(NotificationFeedbackType.Success)` |
| Debate reveal pacing | Variable reward pacing floor | ~1.2–1.8s minimum dwell per agent card in `debate-reveal.tsx`, independent of actual API latency |
| Contacts list | Loss-aversion copy | "You have N reads on {name}" pattern in `contacts.tsx` |
| Result screen | Growth loop | Watermarked story-card export via `story-card.tsx` |

## Guardrail

The Hook Model is being used to build a habit around *getting good advice*, not around manufacturing anxiety to re-trigger the loop. Per `CLAUDE.md`, the content boundary (no negging, no PUA manipulation tactics, no contempt or bitterness) is non-negotiable and takes priority over any engagement mechanic above — a growth loop that works by making users feel worse about their dating life is out of scope, full stop.
