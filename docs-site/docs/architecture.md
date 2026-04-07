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
├── wine-answers-worker/          ← Cloudflare Worker: curated wine answer suggestions (KV-backed)
│   └── index.ts                  ← GET/POST/DELETE endpoints for answer collections
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
| `onClose(ws)` | Client disconnects | Mark participant offline; start 1-hour host disconnect grace period if host drops |

## Host vs participant socket flow

**Host joins** → sends `rejoin_host { hostId }` on socket open → server validates `hostId` against stored value → sends `host:state_snapshot`

**Participant joins** → sends `join_session {}` → server creates participant with a unique `ADJECTIVE-NOUN` pseudonym, broadcasts `lobby:updated` (the session code is the WebSocket room ID, not a message field)

**Participant rejoins** → localStorage `{ id, code }` detected on mount → sends `rejoin_session { pseudonym }` → server sends `participant:state_snapshot`

## Static Frontend, Dynamic Experience

Astro generates a **fully static site** — plain HTML, CSS, and JS served from a CDN. Yet Sommelier Arena delivers real-time multiplayer gameplay, live leaderboards, and instant answer reveals. There is no application server behind the pages. Three runtime protocols bridge the gap:

### WebSocket (PartyKit) — real-time game state

The PartyKit Durable Object (`back/game.ts`) holds all session state in memory and on Durable Object storage. Host and participant browsers open a `PartySocket` connection to the room (keyed by the 4-digit session code). Every game event — question broadcast, answer submission, timer expiry, leaderboard update — flows over this single WebSocket. No REST endpoints are needed for gameplay.

### React Islands (Zustand) — client-side interactivity

Astro pages (`/`, `/host`, `/play`, `/admin`) are static shells with zero JavaScript by default. Interactive components mount with `client:only="react"` and manage all UI state through two Zustand stores (`hostStore`, `participantStore`). These stores mirror the backend phase machine (`waiting → question_open → … → ended`), so the frontend is always a projection of server state received over the WebSocket.

### HTTP REST (Wine Answers Worker) — reference data

The `wine-answers-worker/` Cloudflare Worker serves curated answer collections via simple `GET`/`POST`/`DELETE` endpoints. This data is read-heavy, rarely written, and not time-sensitive — a classic fit for REST over HTTP rather than WebSocket.

### Why this works

Static hosting means **zero server cost** for serving pages and **instant page loads** from a CDN. The "server" lives at the edge — Cloudflare Durable Objects for real-time state, Workers for reference data. The static shell loads first, then runtime connections bring it to life.

```
┌──────────────────────────────────────┐
│        Static Astro Shell            │
│  (HTML/CSS/JS — served from CDN)     │
├──────────────────────────────────────┤
│  React Islands + Zustand Stores      │
│  (hydrated client-side)              │
├──────────┬──────────┬────────────────┤
│ WebSocket│  REST    │  localStorage  │
│ PartyKit │  Worker  │  (rejoin data) │
│ (game)   │  (data)  │                │
└──────────┴──────────┴────────────────┘
```

## Docker vs PartyKit dev

| | Mode A (partykit dev) | Mode B (docker) |
|--|--|--|
| Backend | `npx partykit dev` on `:1999` | `partykit` Docker container on `:1999` |
| Frontend | `npm run dev` on `:4321` | nginx on `:4321` |
| Docs | `cd docs-site && npm start` | Docker container on `:3002` |
| Wine Answers | Not running (or `npx wrangler dev` on `:1998`) | `wine-answers` Docker container on `:1998` |
