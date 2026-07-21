# RESET AI mobile

Expo Router + TypeScript client. See `../docs/ux_hook_blueprint.md` for why the screens are structured this way (Trigger → Action → Variable Reward → Investment).

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # point EXPO_PUBLIC_API_BASE_URL at your running backend
npx expo start
```

Run the backend first (`../backend`, `uvicorn main:app --reload`, `LLM_MODE=mock` needs no keys). On a physical device via Expo Go, `EXPO_PUBLIC_API_BASE_URL` must be your machine's LAN IP, not `localhost`.

## Flow

`app/index.tsx` (upload) → `app/debate-reveal.tsx` (streams the SSE debate via `src/state/analysisStore.ts`) → `app/result.tsx` → optional `app/story-card.tsx` (share) or `app/contacts.tsx` (Relationship Memory).

## Layout

- `src/api/client.ts`, `src/api/sseStream.ts` — backend API + SSE parsing.
- `src/state/analysisStore.ts` — Zustand store driving the debate-reveal UI off streamed events.
- `src/components/` — `ImagePickerDropzone`, `DebateAvatarStack` + `SkeletonLoader`, `AttractionGauge`, `StoryCardExport`.
- `src/types/schemas.ts` — hand-mirrors `backend/models/schemas.py`; keep both in sync.

## Known gaps in this scaffold

- Streaming `fetch` bodies require Expo SDK 51+/RN 0.74+ (pinned in `package.json`); if streaming doesn't work on a given device/runtime, swap `src/api/sseStream.ts`'s reader for `react-native-sse` behind the same async-generator signature.
- No real auth; no offline handling; no SSE reconnect logic - see the open items in `../CLAUDE.md` and the plan this scaffold was built from.
