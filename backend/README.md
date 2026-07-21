# RESET AI backend

FastAPI service implementing the vision-extraction → parallel swarm-debate → synthesis → memory-write pipeline. See `../docs/architecture.md` for the full design and `../CLAUDE.md` for engineering ground rules.

## Setup

```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env   # defaults to LLM_MODE=mock, no keys required
```

## Run the mock pipeline (no API keys, no Supabase)

```bash
python scripts/run_pipeline_mock.py
pytest
```

`pytest` proves the debate agents actually run concurrently (elapsed time tracks the slowest single agent, not the sum of all three) - the fastest correctness signal in this repo after changing `swarm_orchestrator.py` or `models/schemas.py`.

## Run the API server

```bash
uvicorn main:app --reload
```

With `LLM_MODE=mock` (the default), `POST /analyze` streams a full mocked debate over SSE with no credentials needed:

```bash
curl -N -F "image=@fixture.png" http://localhost:8000/analyze
```

Set `LLM_MODE=real` and fill in `ANTHROPIC_API_KEY` / `GROQ_API_KEY` (or `GEMINI_API_KEY`) in `.env` to hit real providers. Set `SUPABASE_DB_URL` to enable Relationship Memory persistence; without it, `NoOpMemoryStore` is used automatically and nothing is persisted.

## Layout

- `main.py` — FastAPI routes (`POST /analyze` SSE, `GET /contacts`, `GET /contacts/{id}/history`, `GET /health`).
- `swarm_orchestrator.py` — the pipeline itself.
- `agents/prompts.py` — Arthur/Clara/Leo/Synthesizer system prompts.
- `models/schemas.py` — Pydantic models; the API contract source of truth.
- `llm_clients/` — provider-agnostic `LLMClient` interface, `MockLLMClient`, and real Anthropic/Groq/Gemini implementations.
- `memory/` — Relationship Memory (pgvector) read/write, with a safe no-op fallback.
- `supabase/migrations/0001_init.sql` — schema (not applied by this scaffold).
- `scripts/run_pipeline_mock.py`, `tests/` — mock-mode verification.
