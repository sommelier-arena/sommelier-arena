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

## In-Memory Data Model

The following shows the runtime data shapes held in memory by the `GameSession` Durable Object (one instance per session code):

```
Game Session (one per room.id / session code):
├── wines: Wine[]          — list of wines with questions and options
├── participants: Map      — keyed by pseudonym (ADJECTIVE-NOUN)
│   ├── id, socketId, pseudonym
│   ├── score, connected
│   └── answeredQuestions: Set
├── phase: SessionPhase    — waiting | question_open | question_paused | question_revealed | round_leaderboard | ended
├── currentRound           — index into wines[]
├── currentQuestion        — index into current wine's questions[]
├── timerSeconds           — configured timer duration (15–120s)
├── timerRemainingMs       — live countdown
├── hostId                 — e.g. "TANNIC-FALCON"
└── sessionTitle           — e.g. "Friday Wine Night"
```

Each `Wine` contains 5 questions (one per fixed category: `color`, `country`, `grape_variety`, `vintage_year`, `wine_name`). Each question carries 4 answer options (1 correct, 3 distractors). Clients only learn which option is correct when `game:answer_revealed` is emitted — options are sent without the `correct` flag during active play.
