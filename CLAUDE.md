# RESET AI — Master Development Directive

## Project context

RESET AI (repo name `Coach-Bro`) is a digital wingman / communication-coaching app. Users upload a screenshot of a text conversation; the engine runs multimodal vision extraction, then a 3-agent parallel "swarm debate" (Arthur, Clara, Leo), then a Synthesizer that arbitrates into one calibrated JSON coaching response. Results are stored per-contact as "Relationship Memory" (pgvector) and can be exported as shareable story cards. Full architecture: `docs/architecture.md`. UX/retention design: `docs/ux_hook_blueprint.md`.

## Engineering principles

1. **Lean stateless swarm, not a graph framework.** Do not introduce LangChain or LangGraph. Agent orchestration is plain Python `asyncio` — `asyncio.gather` for the parallel debate stage, plain Pydantic models / dicts as the handoff between stages. If you find yourself reaching for a stateful graph abstraction, stop and re-read `docs/architecture.md` §1.
2. **Provider-agnostic LLM seam.** All LLM calls go through the `LLMClient` protocol in `backend/llm_clients/base.py`. Adding or swapping a provider means writing a new class that implements that protocol — never hardcode a provider SDK call inside `swarm_orchestrator.py` or `main.py`.
3. **Cost-conscious model routing.**
   - Vision extraction + final synthesis (needs strong multimodal understanding and reliable structured JSON output): Anthropic `claude-sonnet-5` by default (env `ANTHROPIC_VISION_MODEL`), swappable to `claude-opus-4-8` for higher-stakes accuracy.
   - The three parallel debate agents (Arthur/Clara/Leo — prose analysis, not strict JSON, and need to feel fast): Groq Llama-3.3-70b or Gemini 2.0 Flash are the cheap/fast options (env `FAST_LLM_PROVIDER`). `FAST_LLM_PROVIDER=anthropic` is also supported — routes debate agents through the same Claude client as vision/synthesis, no extra key needed. Pricier per call, so it's not the default recommendation, but it's a real fallback (currently active — see `backend/.env`) when Groq/Gemini are rate-limited or not yet configured, not a hack.
4. **Mock-first development.** `MockLLMClient` (in `llm_clients/base.py`) must always be sufficient to run and test the full pipeline (`backend/scripts/run_pipeline_mock.py`) with zero API keys. New pipeline logic should be built and verified against the mock client before it's wired to a real provider.
5. **Streaming is not optional.** `POST /analyze` must always stream `DebateEvent`s over SSE as each pipeline stage completes. Never collapse this into a single blocking JSON response — the debate-reveal UX (`docs/ux_hook_blueprint.md`) depends on progressive events, and collapsing it silently breaks the product's core retention mechanic even though the API "still works."
6. **Haptics on the Attraction Gauge are required**, not a nice-to-have — see the mechanics table in `docs/ux_hook_blueprint.md`.
7. **Privacy default: don't persist raw screenshots.** Process uploaded images in memory, discard after extraction. Only extracted text and analysis results are written to the database. Don't add image storage without an explicit, separate opt-in decision.

## Content boundary (hard constraint, enforced structurally)

No negging, no PUA manipulation tactics, no contempt or bitterness in Arthur's or Leo's output, no pathologizing the other person in Clara's output. This is enforced at the Synthesizer, not just via prompt wording — the Synthesizer must refuse to promote a `best_response` that violates this, even if one of the three agents suggested it. Optimize for emotional intelligence and win-win outcomes. This constraint outranks any engagement/retention mechanic — never design a hook that works by making the user feel worse about their situation.

## Working in this repo

- Backend: Python, FastAPI, Pydantic v2, `asyncio`. See `backend/README.md` for local run instructions.
- Mobile: Expo (React Native) + TypeScript, Expo Router. See `mobile/README.md`.
- Before changing `swarm_orchestrator.py` or `models/schemas.py`, run the mock pipeline (`python backend/scripts/run_pipeline_mock.py` and `pytest backend/tests/test_orchestrator_mock.py`) to confirm the contract still holds — this requires no API keys and is the fastest correctness signal in the repo.
- `backend/models/schemas.py` is the single source of truth for the API contract. `mobile/src/types/schemas.ts` hand-mirrors it; if you change one, update the other in the same change.
