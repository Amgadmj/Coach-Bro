# Deploying Bro Coach

Target setup: **backend on Render** (Docker, SSE-friendly, deploys straight from GitHub — no CLI needed) and **web on Vercel**. Both are click-through dashboard flows; total time ~20 minutes once API keys are valid.

## 0. Prerequisites

- Valid LLM keys (verify locally first — see [Verifying real providers](#verifying-real-providers)):
  - `ANTHROPIC_API_KEY` — starts with `sk-ant-`, from https://console.anthropic.com/settings/keys
  - `GEMINI_API_KEY` — starts with `AIza`, from https://aistudio.google.com/apikey (or `GROQ_API_KEY` from https://console.groq.com/keys with `FAST_LLM_PROVIDER=groq`)
- The GitHub repo pushed and up to date.

## 1. Backend → Render

1. https://dashboard.render.com → **New → Blueprint** → connect `Amgadmj/Coach-Bro`.
2. Render reads [`render.yaml`](../render.yaml) and shows the `bro-coach-api` service. It will prompt for the two secrets (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`); paste them there — they never touch git.
3. Deploy. When it's live you get `https://bro-coach-api.onrender.com` (or similar). `GET /health` should return `{"status":"ok"}`.

Notes:
- The blueprint uses the **starter plan with a 1 GB disk** so SQLite relationship memory survives restarts. Free plan: remove the `disk:` block and `MEMORY_DB_PATH` from `render.yaml` first (memory resets on redeploys), or set `SUPABASE_DB_URL` and run the two migrations in `backend/supabase/migrations/` against a Supabase project.
- Rate limits ship on: 20 analyses + 60 suggestions per IP per hour (`*_RATE_LIMIT_PER_HOUR` env vars).

## 2. Web → Vercel

1. https://vercel.com/new → import `Amgadmj/Coach-Bro` → set **Root Directory = `web`** (Next.js auto-detected).
2. Add env var `NEXT_PUBLIC_API_BASE_URL = https://<your-render-url>`.
3. Deploy → you get `https://<project>.vercel.app`.

## 3. Close the loop

1. Back in Render, set `ALLOWED_ORIGINS = https://<project>.vercel.app` (comma-separate to add a custom domain later). Save → auto-redeploys.
2. Open the Vercel URL on your phone, run a real screenshot through it.

## Verifying real providers

Before (and after) deploying, from `backend/` with keys in `.env` and `LLM_MODE=real`:

```bash
python scripts/generate_test_screenshot.py   # writes scripts/fixtures/test_chat.png
python scripts/run_pipeline_real.py          # full live pipeline, per-stage timings
```

The harness names the exact stage that fails (vision / debate / synthesis / persona), so a bad key or model name is pinpointed immediately.

## Not covered yet (next phases)

- **Auth / per-user memory** — right now all users of a deployment share one memory store. Fine for a private beta behind an unshared URL; must land before a public launch.
- Custom domain, analytics, error tracking (Sentry), and the app-store path (PWA → Capacitor/Expo).
