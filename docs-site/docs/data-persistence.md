---
id: data-persistence
title: Data Persistence
sidebar_label: Data Persistence
---

# Data Persistence

## Durable Object storage

The `GameSession` Durable Object persists all state to built-in SQLite-backed storage. State survives DO eviction (Cloudflare may evict idle DOs after ~30 s of inactivity but restores from storage on next request).

### DO storage keys

| Key | Type | Value |
|-----|------|-------|
| `'state'` | `SavedState` | Full session snapshot (phase, wines, questions, currentIndices, timerMs) |
| `'hostId'` | `string` | `TANNIC-FALCON` — used to authenticate `rejoin_host` |
| `'participant:{pseudonym}'` | object | `{ id, pseudonym, score, connected, answeredQuestions: string[] }` — keyed by the participant's ADJECTIVE-NOUN pseudonym |
| `'response:{participantId}:{questionId}'` | object | `{ optionId, correct, points }` |

### What `SavedState` contains

```ts
interface SavedState {
  phase: SessionPhase;
  title: string;
  wines: Wine[];              // full wine + question data
  currentRoundIndex: number;
  currentQuestionIndex: number;
  timerSeconds: number;       // configured at creation
  remainingMs: number;        // live timer state
  createdAt: string;
}
```

## Cloudflare KV

KV is used for the **host sessions index** — a list of all sessions created by a given `hostId`.

### KV namespace

Name: `SOMMELIER_HOSTS`  
Binding in `partykit.json`: `HOSTS_KV`

### KV key format

```
host:TANNIC-FALCON
```

### KV value format

```json
[
  {
    "code": "4829",
    "title": "Wine Night 1",
    "createdAt": "2025-01-20T19:00:00.000Z",
    "status": "ended",
    "participantCount": 8,
    "finalRankings": [
      { "pseudonym": "Alice", "score": 500, "rank": 1 }
    ]
  }
]
```

The `finalRankings` field is written when the session ends (`host:end`).

## Inspecting KV data

### ⚠️ Local dev vs production — critical distinction

`wrangler dev --local` stores KV data in `.wrangler/state/` on your machine.
It does **not** write to the real Cloudflare KV namespaces.
This means:
- Anything you seed via `npm run dev` (local worker) is **only visible locally**.
- `wrangler kv key list --namespace-id=...` always queries **production** KV.
- If production KV appears empty, you need to seed it explicitly — see [Seeding production](#seeding-production) below.

### Inspect local dev KV (data from `npm run dev`)

> **Must run from `wine-answers-worker/`** — `wrangler.toml` must be present in the current directory for `--binding` or `--local` to work. Running from the repo root will fail with "No KV Namespaces configured".

```bash
cd wine-answers-worker

# List all category keys stored locally
npx wrangler kv key list --binding=WINE_ANSWERS_KV --local

# Get a specific category's answers locally
npx wrangler kv key get "color" --binding=WINE_ANSWERS_KV --local
npx wrangler kv key get "grape_variety" --binding=WINE_ANSWERS_KV --local
```

> The `HOSTS_KV` binding (for SOMMELIER\_HOSTS) is managed by PartyKit and is not available via `wrangler dev`. It is production-only.

### Inspect production KV

`wrangler kv key list --namespace-id=...` always queries production. Requires `npx wrangler login`.

#### SOMMELIER\_HOSTS — host session index

Namespace ID: `98082bb612964007aac177820469dddc`

```bash
# List all keys (one per hostId that has created a session)
npx wrangler kv key list --namespace-id=98082bb612964007aac177820469dddc

# Get sessions for a specific host
npx wrangler kv key get "host:TANNIC-FALCON" \
  --namespace-id=98082bb612964007aac177820469dddc

# Delete a host's session history (cleanup)
npx wrangler kv key delete "host:TANNIC-FALCON" \
  --namespace-id=98082bb612964007aac177820469dddc
```

#### WINE\_ANSWERS\_KV — curated answer lists

Namespace ID: `c6e83a314d254ca5801f0fa90a19c746`

```bash
# List all category keys
npx wrangler kv key list --namespace-id=c6e83a314d254ca5801f0fa90a19c746

# Get answers for a specific category
npx wrangler kv key get "color" --namespace-id=c6e83a314d254ca5801f0fa90a19c746
npx wrangler kv key get "grape_variety" --namespace-id=c6e83a314d254ca5801f0fa90a19c746

# Overwrite a category's answer list manually (JSON array of strings)
npx wrangler kv key put "region" '["Bordeaux","Bourgogne","Alsace","Loire"]' \
  --namespace-id=c6e83a314d254ca5801f0fa90a19c746
```

### Seeding production

The seed script sends data through the Worker HTTP API (not directly to KV), so the `ADMIN_SECRET` Cloudflare secret must be set first:

```bash
# One-time setup: store the secret in Cloudflare (never put it in wrangler.toml)
cd wine-answers-worker
npx wrangler secret put ADMIN_SECRET

# Then seed production (from wine-answers-worker/)
WINE_ANSWERS_URL=https://sommelier-arena-wine-answers.<your-subdomain>.workers.dev \
ADMIN_SECRET=<your-secret> \
npm run seed:prod
```

Or seed locally (writes to `.wrangler/state/`, visible only in local dev):

```bash
cd wine-answers-worker
npm run seed        # seeds http://localhost:1998 with secret "changeme"
```

## What survives

| Event | DO storage | KV |
|-------|-----------|-----|
| DO eviction (idle) | ✅ restored on next connection | ✅ unchanged |
| Page refresh (host) | ✅ `rejoin_host` restores full state | ✅ unchanged |
| Page refresh (participant) | ✅ `rejoin_session { pseudonym }` restores state | — |
| Server restart (local dev) | ❌ in-memory lost; storage persists | ✅ unchanged |
| `partykit dev` restart | ❌ local storage cleared | — |

> **Note**: In `npx partykit dev` mode, DO storage is in-memory only. Production Cloudflare Workers use real SQLite-backed DO storage.

## localStorage (browser)

| Key | Value | Cleared when |
|-----|-------|-------------|
| `sommelierArena:hostId` | `TANNIC-FALCON` | Never (user clears browser data) |
| `sommelierArena:rejoin` | `{ id, code }` — participant's pseudonym and session code | `session:ended` received |

## Cloudflare KV (`WINE_ANSWERS_KV`)

The Wine Answers Worker uses a separate KV namespace for curated answer data.

### KV namespace

Name: `WINE_ANSWERS_KV`  
Binding in `wine-answers-worker/wrangler.toml`: `WINE_ANSWERS_KV`

### KV key format

```
color
region
grape_variety
vintage_year
wine_name
```

Each key is a question category name.

### KV value format

```json
["Bordeaux", "Burgundy", "Champagne", "Napa Valley", "Rioja"]
```

A JSON array of curated answer strings for that category.

## In-Memory Data Model

The following shows the runtime data shapes held in memory by the `GameSession` Durable Object (one instance per session code):

```
Game Session (one per room.id / session code):
├── wines: Wine[]          — list of wines with questions and options
├── participants: Map      — keyed by pseudonym (ADJECTIVE-NOUN)
│   ├── id, socketId, pseudonym
│   ├── score, connected
│   └── answeredQuestions: Set
├── phase: SessionPhase    — waiting | question_open | question_paused | question_revealed | question_leaderboard | round_leaderboard | ended
├── currentRound           — index into wines[]
├── currentQuestion        — index into current wine's questions[]
├── timerSeconds           — configured timer duration (15–120s)
├── timerRemainingMs       — live countdown
├── hostId                 — e.g. "TANNIC-FALCON"
└── sessionTitle           — e.g. "Friday Wine Night"
```

Each `Wine` contains 5 questions (one per fixed category: `color`, `region`, `grape_variety`, `vintage_year`, `wine_name`). Each question carries 4 answer options (1 correct, 3 distractors). Clients only learn which option is correct when `game:answer_revealed` is emitted — options are sent without the `correct` flag during active play.
