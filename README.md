# RESET AI

**Your digital wingman.** Upload a screenshot of a text conversation and get a calibrated, emotionally intelligent read on what's really going on — plus the actual words to text back.

Three AI personas debate your conversation in real time, then hand you one clear answer: how interested she actually is, what she's really thinking, and the best reply to send.

> **Status:** early-stage engineering scaffold. The product flow below is fully built and runnable end-to-end in a mocked mode with zero API keys — real LLM providers and a live database are the next step. See [Project status](#project-status).

---

## What it does

You drop in a screenshot. Behind the scenes:

1. **It reads the conversation.** A vision model parses the screenshot — who said what, when, and how long it took them to reply.
2. **Three personas debate it, live.**
   | Persona | Role |
   |---|---|
   | **Arthur** | The high-value frame expert — calls out neediness, over-investing, and transactional traps. Tells you when to hold your ground. |
   | **Clara** | The female psychology specialist — decodes the subtext, the push-pull, and whether she's testing you or genuinely pulling back. |
   | **Leo** | The charming one — turns all of that analysis into a warm, confident, funny reply. Never negging, never a pickup-artist line. |
3. **A synthesizer settles the debate** and hands you one clean answer:
   - An **Attraction Gauge** (1–10)
   - A plain-English read on what she's actually thinking
   - Your **best response**, plus a playful and a direct alternative
   - A one-line **coaching lesson** so you actually get better over time
4. **It remembers.** Every read gets tied to that contact, so the next screenshot of the same person comes with context — inside jokes, past dynamics, the whole history.

You can also export a watermarked, story-shaped summary card to share.

## Why it feels different

The debate isn't hidden behind a spinner — you watch Arthur, Clara, and Leo weigh in one by one, with a deliberate build-up before the final number locks in with a haptic buzz. It's designed to feel less like waiting for an API response and more like waiting for a verdict. The full behavioral design behind that is written up in [`docs/ux_hook_blueprint.md`](docs/ux_hook_blueprint.md).

## Tech stack

| Layer | Choice |
|---|---|
| Mobile app | Expo (React Native) + TypeScript, Expo Router |
| Backend | Python, FastAPI, streamed over Server-Sent Events |
| Agent orchestration | Plain `asyncio` — no LangChain/LangGraph, deliberately lean |
| Vision + final synthesis | Claude (Anthropic) |
| Debate agents (Arthur/Clara/Leo) | Groq or Gemini Flash — fast and cheap, run in parallel |
| Relationship memory | Supabase (Postgres) + `pgvector` |

Full architecture, diagrams, and data model: [`docs/architecture.md`](docs/architecture.md).

## Project structure

```
backend/    FastAPI service — vision extraction, the swarm orchestrator, the SSE API, pgvector memory
mobile/     Expo app — upload, live debate reveal, results, contact history, story-card export
docs/       Architecture and behavioral/UX design docs
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

This repo currently ships a **complete, verified scaffold**:

- ✅ The full pipeline (extraction → parallel debate → synthesis → memory) runs end-to-end against mock AI responses, with tests proving the three personas genuinely run concurrently
- ✅ The FastAPI backend streams live debate events over SSE
- ✅ The mobile app is a working Expo project (typechecked, dependencies resolved) covering the whole user flow
- ⏳ Real LLM provider calls (Anthropic/Groq/Gemini) and a live Supabase database are wired with working code but need real API keys to activate — see `.env.example` in `backend/`
- ⏳ Not yet deployed to an app store or a hosted backend

For engineering ground rules and decisions behind this scaffold (why no LangChain, the content/safety boundary, model routing), see [`CLAUDE.md`](CLAUDE.md).

## A note on tone

This app is built to make people *better* at communicating — not sneakier. Every response is checked against a hard rule: no negging, no manipulation tactics, no contempt. If a suggestion doesn't hold up to "would a genuinely good, self-respecting person say this," it gets rewritten before it ever reaches you.
