# Bro Coach web

Next.js frontend built from the Claude Design handoff (`Bro Coach - Unified MVP Screens`), on the Dusk v2.1 design system (`../docs/design/design.md`). Tailwind for tokens/styling, Framer Motion for the debate reveal and clay-button motion, Zustand for session + analysis state.

## Run it

```bash
# 1. backend first (mock mode needs no API keys)
cd ../backend && uvicorn main:app --reload

# 2. web
cd ../web
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000 — pick a Social Mode, then either describe a scenario (→ `/say`, three openers via `POST /suggest`) or attach a screenshot (→ `/read`, the live Arthur/Clara/Leo debate streamed over SSE from `POST /analyze`, → `/result`).

## Screens ↔ handoff ↔ backend

| Route | Handoff screen | Backend |
|---|---|---|
| `/` | 01 Dashboard (+ 02 Vibe Check-in sheet) | — (session state only) |
| `/live` | 03 Scenario Input | `GET /contacts` |
| `/say` | 04 What To Say Next | `POST /suggest` |
| `/read` | 05 Debate Reveal | `POST /analyze` (SSE) |
| `/result` | 06 Result | payload of the same SSE stream |
| `/recap` | 07 Night Out Recap | demo data — no recap API yet |
| `/playbook`, `/profile` | — | stubs so the tab bar is honest |

## Conventions

- **Tokens** live once in `src/app/globals.css` (light + dark + `data-theme` overrides); Tailwind classes reference them via `tailwind.config.ts` — never hardcode a hex in a component.
- **`--mode`** is the session's Social Mode tint, stamped on `:root` by `ModeSync`; anything that should follow the user's mode uses `var(--mode)` / the `mode` Tailwind color.
- **`src/lib/types.ts` hand-mirrors `backend/models/schemas.py`** — change them together (CLAUDE.md rule).
- The debate reveal keeps a ~1.3s minimum dwell per agent card (`REVEAL_FLOOR_MS` in `src/lib/analysis.ts`) — that pacing is a product requirement from `docs/ux_hook_blueprint.md`, not latency masking. Don't remove it because the backend got faster.
