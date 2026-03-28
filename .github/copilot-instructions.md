# Sommelier Arena — Copilot Instructions

Sommelier Arena is a real-time blind wine tasting quiz game (Kahoot-style). A host creates a session and sets up wines with questions; participants join with a 4-digit code, answer questions live, and compete on a leaderboard.

## Monorepo layout

| Directory | Role | Port |
|-----------|------|------|
| `back/` | PartyKit backend (Cloudflare Durable Object) — all game state | 1999 |
| `front/` | Astro (static) + React islands + Zustand stores | 4321 |
| `docs-site/` | Docusaurus documentation site | 3002 |
| `e2e/` | Playwright E2E tests (run against Docker stack) | — |

## Commands

### Backend (`back/`)
```bash
npx partykit dev --port 1999   # local dev server (run from repo root)
npx partykit deploy            # deploy to Cloudflare (run from repo root)
```
No separate test command — the backend has no unit tests; integration coverage is via e2e.

### Frontend (`front/`)
```bash
npm run dev              # Astro dev server on port 4321
npm run build            # static build
npm run preview          # serve the static build locally
npm test                 # run Vitest unit tests
```

### Full stack (Docker — required for E2E)
```bash
docker-compose build && docker-compose up -d    # from repo root (uses docker-compose v2 CLI)
docker-compose down
```

> **Note**: on this machine `docker compose` (space) is not available — use `docker-compose` (hyphen).

### E2E (`e2e/`)
```bash
# Requires Docker stack running first
npm test                                          # all tests, Chromium
npx playwright test tests/home.spec.ts            # single file
npx playwright test --project=chromium            # single browser
npm run test:ui                                   # interactive UI mode
```

## Architecture

### Backend
All game state lives in a **PartyKit Durable Object** (`back/game.ts` — thin dispatcher). The DO wakes from eviction via `onStart()` and restores state from Durable Object storage. Business logic is split across focused modules (SRP):

- `back/handlers/session.ts` — `create_session`, `rejoin_host`, `join_session`, `rejoin_session`
- `back/handlers/game-flow.ts` — all host control handlers + `submit_answer`
- `back/handlers/timer.ts` — `startTimer`, `handleTimerExpiry`
- `back/question.ts` — `buildQuestionPayload`, `broadcastQuestion`, broadcast helpers
- `back/persistence.ts` — `saveState`, `upsertKvSession`, `endGame`
- `back/game-context.ts` — `GameContext` interface
- `back/scoring.ts` — pure scoring functions
- `back/utils.ts` — `generateIdentity()`, `shuffle()`
- `back/constants.ts` — word lists (25×25 = 625 identities), category prompts

State machine (`SessionPhase`):
```
waiting → question_open ↔ question_paused → question_revealed → round_leaderboard → (next round or ended)
```

Key limits: 4-digit numeric session codes, max 10 participants, timer 15–120 s (default 60 s), 100 pts for correct / 0 for wrong, answers can be changed until host reveals.

### Frontend
Astro pages (`/`, `/host`, `/play`) are static shells. All interactivity runs in React components hydrated with `client:only="react"`. Two Zustand stores — `hostStore` and `participantStore` — own all client-side state and mirror the backend phase machine:

- Host phases: `dashboard → setup → lobby → question → revealed → roundLeaderboard → finalLeaderboard`
- Participant phases: `join → lobby → question → revealed → roundLeaderboard → finalLeaderboard → ended`

Socket hooks (`useHostSocket`, `useParticipantSocket`) wire socket events to store actions. Each creates a `PartySocket` via `front/src/lib/socket.ts` connected to the session room (4-digit code). URL sync is handled by `useHostUrlSync` / `useParticipantUrlSync` in `front/src/hooks/useUrlSync.ts`. Rejoin credentials are stored in localStorage via `front/src/lib/rejoin.ts`.

### Networking
- **Docker**: nginx at port 4321 (and port 80) proxies `/party/` WebSocket traffic to `back:1999`. Port 80 is also bound for backward-compat.
- **Local dev**: set `PUBLIC_PARTYKIT_HOST=localhost:1999` in `front/.env`; run partykit dev and `npm run dev` independently.

### Shared types
`front/src/types/events.ts` mirrors the payload shapes used in `back/handlers/`. Keep both in sync when changing event shapes.

## Playwright MCP

`.vscode/mcp.json` configures the `@playwright/mcp` server. With the Docker stack running (`docker-compose up -d`), Copilot can use Playwright tools to navigate `http://localhost:4321`, interact with the host/participant UI, and observe real PartyKit WebSocket behaviour without a separate test run.

## Key conventions

- **Separation of concerns**: `back/game.ts` = thin dispatcher; `back/handlers/` = all rules; `back/persistence.ts` = storage. Never put business logic in the dispatcher.
- **Option positions**: answer options are shuffled at session creation; clients learn the correct `optionId` only on `game:answer_revealed`.
- **Identity format**: both hosts and participants use `ADJECTIVE-NOUN` uppercase (e.g. `TANNIC-FALCON`). Generated by `generateIdentity(usedIds)` in `back/utils.ts`. 25×25 vocabulary = 625 combinations.
- **Participant identity**: keyed by **pseudonym** (the `ADJECTIVE-NOUN` string) in `ctx.participants: Map<string, Participant>`. No UUID rejoinTokens.
- **Rejoin flow**: host stores `{ id: hostId, code }` in localStorage; participant stores `{ id: pseudonym, code }`. Same shape, managed by `front/src/lib/rejoin.ts`. URL pattern: `?code=X&id=IDENTITY` for both `/host` and `/play`.
- **Session DTO shape**: `create_session` expects `{ wines: [{ name, questions: [{ category, correctAnswer, distractors: [string, string, string] }] }] }`. Valid `category` values: `color`, `country`, `grape_variety`, `vintage_year`, `wine_name` (5 categories).
- **Frontend component naming**: host-side components are prefixed `Host*` (e.g. `HostApp`, `HostLobby`, `HostQuestion`); participant-side use `Participant*` or descriptive names; shared UI lives in `components/common/`.
- **E2E test tags**: tests are tagged `@smoke`, `@full`, or `@mobile`. Firefox/WebKit run `@smoke|@full`; mobile browsers run `@smoke|@mobile`; mobile-firefox runs `@smoke` only. Tag new tests appropriately.
- **E2E workers**: Playwright is configured with `workers: 1` (sequential) because tests share real PartyKit Durable Object state. Do not enable parallelism.
- **No linter is configured** for this project — there is no `eslint` or `prettier` script to run.

