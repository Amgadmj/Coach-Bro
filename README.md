# RESET AI

**Your digital wingman.** Drop in a screenshot of a text conversation. Three AI personas debate it in real time — then hand you one clear answer: how interested she actually is, what she's really thinking, and the exact words to text back.

No spinner. You watch the debate happen.

---

## The swarm

Every screenshot gets read by three personas in parallel, then arbitrated into one answer:

| | Persona | Job |
|---|---|---|
| ♟️ | **Arthur** | High-value frame expert. Calls out neediness, over-investing, and transactional traps. Tells you when to hold your ground. |
| 🔍 | **Clara** | Female psychology specialist. Decodes the subtext — the push-pull, the compliance test, whether she's testing you or genuinely pulling back. |
| 😏 | **Leo** | The charming one. Turns the analysis into a warm, confident, funny reply. Never negging, never a pickup-artist line. |

A **synthesizer** settles the debate and hands you back:

- An **Attraction Gauge** (1–10)
- A plain-English read on what she's actually thinking
- Your **best response**, plus a playful and a direct alternative
- A one-line **coaching lesson**, so you actually get better over time

Every read gets tied to that contact — the next screenshot of the same person comes with history, inside jokes, and past dynamics already loaded. You can export a watermarked, story-shaped card to share the read.

## Why it feels different

The debate isn't hidden behind a loading state — Arthur, Clara, and Leo weigh in one by one, with a deliberate build-up before the final number locks in with a haptic buzz. It's built to feel like waiting for a verdict, not an API response. The behavioral design behind that is written up in [`docs/ux_hook_blueprint.md`](docs/ux_hook_blueprint.md).

## Design, in progress

Two full visual directions are being explored side by side before either becomes real code — open them straight in a browser, no build step:

| | Direction | Vibe |
|---|---|---|
| [`ui-spec-v1.html`](docs/design/ui-spec-v1.html) | **Airbnb-inspired** | Calm, minimal, hospitality-brand confidence. Hairline borders, restrained red accent. |
| [`ui-spec-v2.html`](docs/design/ui-spec-v2.html) | **Dusk** | Warm frosted-glass and gradient light, blob "Social Mode" mascots, a rounded display face. All 9 screens — dashboard, live debate, saved contacts, sharing, recap, ranking. |

A git-diffable summary of the current direction (tokens, screens, component list, motion spec) lives in [`docs/design/design.md`](docs/design/design.md); the source screenshots that shaped v2 are in [`docs/design/reference-images/`](docs/design/reference-images/).

Neither has been turned into real frontend code yet — that starts once one direction is confirmed.

## Tech stack

What's actually built and running today:

| Layer | Choice |
|---|---|
| Mobile app | Expo (React Native) + TypeScript, Expo Router |
| Backend | Python, FastAPI, streamed over Server-Sent Events |
| Agent orchestration | Plain `asyncio` — no LangChain/LangGraph, deliberately lean |
| Vision + final synthesis | Claude (Anthropic) |
| Debate agents (Arthur/Clara/Leo) | Groq or Gemini Flash — fast and cheap, run in parallel |
| Relationship memory | Supabase (Postgres) + `pgvector` |

Full architecture, diagrams, and data model: [`docs/architecture.md`](docs/architecture.md). (The v2 design direction targets a future Next.js + Tailwind + Framer Motion rebuild — see its [handoff notes](docs/design/design.md#handoff) — but that's downstream of picking a direction, not built yet.)

## Project structure

```
backend/    FastAPI service — vision extraction, the swarm orchestrator, the SSE API, pgvector memory
mobile/     Expo app — upload, live debate reveal, results, contact history, story-card export
docs/       Architecture, behavioral/UX design docs, and the two UI design specs
```

## Getting started

Everything below runs fully mocked — no API keys, no database, no cloud account required.

**1. Run the backend**

```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

**2. Run the mobile app**

```bash
cd mobile
npm install
cp .env.example .env   # point EXPO_PUBLIC_API_BASE_URL at the backend above
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for a simulator. Upload any screenshot and watch the debate play out.

Want to skip the app and just see the pipeline run in your terminal?

```bash
cd backend
python scripts/run_pipeline_mock.py
```

More detail in [`backend/README.md`](backend/README.md) and [`mobile/README.md`](mobile/README.md).

## Project status

- ✅ The full pipeline (extraction → parallel debate → synthesis → memory) runs end-to-end against mock AI responses, with tests proving the three personas genuinely run concurrently
- ✅ The FastAPI backend streams live debate events over SSE
- ✅ The mobile app is a working Expo project (typechecked, dependencies resolved) covering the whole user flow
- ✅ Two complete UI design directions written up for review — see [Design, in progress](#design-in-progress)
- ⏳ Real LLM provider calls (Anthropic/Groq/Gemini) and a live Supabase database are wired with working code but need real API keys to activate — see `.env.example` in `backend/`
- ⏳ A design direction hasn't been picked yet — no Next.js/production frontend code exists
- ⏳ Not yet deployed to an app store or a hosted backend

For engineering ground rules and decisions behind this scaffold (why no LangChain, the content/safety boundary, model routing), see [`CLAUDE.md`](CLAUDE.md).

## A note on tone

This app is built to make people *better* at communicating — not sneakier. Every response is checked against a hard rule: no negging, no manipulation tactics, no contempt. If a suggestion doesn't hold up to "would a genuinely good, self-respecting person say this," it gets rewritten before it ever reaches you.
