---
id: architecture
title: Architecture
sidebar_label: Architecture
---

# Architecture

## Repository layout

```
/
├── back/                         ← PartyKit backend (Durable Object)
│   ├── game.ts                   ← thin dispatcher — routes messages to handlers
│   ├── game-context.ts           ← GameContext interface
│   ├── types.ts                  ← exported types & interfaces
│   ├── constants.ts              ← word lists (25×25), category prompts
│   ├── utils.ts                  ← pure utilities: generateIdentity(), shuffle()
│   ├── scoring.ts                ← pure scoring functions
│   ├── question.ts               ← buildQuestionPayload, broadcast helpers
│   ├── persistence.ts            ← saveState, upsertKvSession, endGame
│   └── handlers/
│       ├── session.ts            ← create_session, rejoin_host, join_session, rejoin_session
│       ├── game-flow.ts          ← host control handlers + submit_answer
│       └── timer.ts              ← startTimer, handleTimerExpiry
├── front/                        ← Astro + React frontend
│   └── src/
│       ├── lib/
│       │   ├── socket.ts         ← PartySocket factory (createSocket(room))
│       │   └── rejoin.ts         ← shared localStorage credential helpers
│       ├── types/events.ts       ← shared event payload types
│       ├── stores/
│       │   ├── hostStore.ts
│       │   └── participantStore.ts
│       ├── hooks/
│       │   ├── useHostSocket.ts
│       │   ├── useParticipantSocket.ts
│       │   └── useUrlSync.ts     ← URL ↔ store sync for host & participant
│       └── components/
│           ├── host/
│           └── participant/
├── docs-site/                    ← Docusaurus docs
├── proxy-worker/
│   └── index.ts                  ← Cloudflare Worker: routes /docs/* to docs Pages
├── partykit.json                 ← PartyKit config + KV binding
├── package.json                  ← root: partykit + partysocket
└── docker-compose.yml            ← Mode B: full-stack with PartyKit in Docker
```

> ⚠️ **After any backend change** (files under `back/`), run `npx partykit deploy` (from repo root) or `cd back && npm run deploy` to push to Cloudflare. The `proxy-worker` does not need redeployment for backend-only changes.

## Runtime communication

```
Browser (Host)          Browser (Participant)
      │                         │
      │  PartySocket ws         │  PartySocket ws
      ▼                         ▼
  ┌────────────────────────────────────────┐
  │   PartyKit Durable Object              │
  │   room = 4-digit session code          │
  │                                        │
  │   this.room.storage  ← game state      │
  │   this.room.broadcast ← fan-out msgs   │
  └──────────────────┬─────────────────────┘
                     │  KV write
                     ▼
           Cloudflare KV
           SOMMELIER_HOSTS
           key: host:{TANNIC-FALCON}
```

## Durable Object lifecycle

| Hook | Called when | What we do |
|------|-------------|-----------|
| `onStart()` | DO wakes from eviction | Restore `SavedState` from storage |
| `onConnect(ws)` | Client opens WebSocket | Register connection (host or participant) |
| `onMessage(ws, msg)` | Message arrives | Parse `{ type }`, dispatch to handler |
| `alarm()` | Timer alarm fires | Auto-reveal current question |
| `onClose(ws)` | Client disconnects | Mark participant offline; detect host drop |

## Host vs participant socket flow

**Host joins** → sends `rejoin_host { hostId }` on socket open → server validates `hostId` against stored value → sends `host:state_snapshot`

**Participant joins** → sends `join_session {}` → server creates participant with a unique `ADJECTIVE-NOUN` pseudonym, broadcasts `lobby:updated` (the session code is the WebSocket room ID, not a message field)

**Participant rejoins** → localStorage `{ id, code }` detected on mount → sends `rejoin_session { pseudonym }` → server sends `participant:state_snapshot`

## Docker vs PartyKit dev

| | Mode A (partykit dev) | Mode B (docker) |
|--|--|--|
| Backend | `npx partykit dev` on `:1999` | `partykit` Docker container on `:1999` |
| Frontend | `npm run dev` on `:4321` | nginx on `:4321` |
| Docs | `cd docs-site && npm start` | Docker container on `:3002` |
