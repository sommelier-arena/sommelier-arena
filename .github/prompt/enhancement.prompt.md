# Sommelier Arena — Full Implementation Brief for Copilot Plan Mode

## What it is

A real-time blind wine tasting quiz app. A host creates a session with wines and questions, participants join via a 4-digit code, and the host controls the pace of the game (reveal answers, advance questions, pause/resume timer). Multiple independent hosts are supported simultaneously — each host and their sessions are fully isolated.

## Current codebase (keep on a separate branch — do not delete)

- Frontend: Astro + React + Zustand + Tailwind (`front/`)
- Backend: NestJS + Socket.IO, in-memory (`back/`)
- Docs: Docusaurus (`docs-site/`)
- Tests: 40+ passing Jest unit + integration tests
- Local dev: `docker-compose up` works today on the current branch

## Target infrastructure — everything on Cloudflare, €0/month

| Service | Platform | URL |
|---|---|---|
| Frontend (Astro app) | Cloudflare Pages | `sommelier-arena.ducatillon.net` |
| Backend (PartyKit DO) | Cloudflare Workers via PartyKit | `sommelier-arena.USERNAME.partykit.dev` |
| Docs (Docusaurus) | Cloudflare Pages (separate deployment) | `sommelier-arena.ducatillon.net/docs` via Worker proxy |
| Session list per host | Cloudflare KV (`SOMMELIER_HOSTS` namespace) | — |
| DNS + TLS | Cloudflare (`ducatillon.net` already managed here) | — |
| Database | None — Durable Object built-in SQLite storage | — |

## Repository structure (new branch)

```
/
├── party/
│   └── game.ts                   ← entire backend (one Durable Object class)
├── front/                        ← Astro + React frontend
│   ├── src/
│   │   ├── lib/socket.ts         ← swap socket.io-client → partysocket
│   │   ├── types/events.ts       ← updated types
│   │   ├── stores/
│   │   │   ├── hostStore.ts      ← add hostId, sessions list
│   │   │   └── participantStore.ts ← add rejoinToken, localStorage logic
│   │   ├── hooks/
│   │   │   ├── useHostSocket.ts        ← adapt to partysocket API
│   │   │   └── useParticipantSocket.ts ← adapt + auto-rejoin logic
│   │   └── components/
│   │       ├── host/
│   │       │   ├── SessionForm.tsx       ← timer slider, 5 questions, autocomplete
│   │       │   ├── HostDashboard.tsx     ← NEW: my sessions list
│   │       │   └── SessionCreated.tsx    ← NEW: host ID display + share link
│   │       └── participant/
│   │           ├── ParticipantApp.tsx    ← rejoin flow
│   │           └── QuestionView.tsx      ← no lock, change-answer UX
├── docs-site/                    ← Docusaurus (unchanged content)
│   └── docusaurus.config.ts      ← update baseUrl to '/docs'
├── proxy-worker/
│   └── index.ts                  ← Cloudflare Worker: routes /docs/* to docs Pages
├── partykit.json                 ← PartyKit config + KV binding
├── package.json                  ← root deps: partysocket, partykit
└── docker-compose.yml            ← kept for local full-stack dev (see below)
```

## Local development — three modes

Docker is not removed — it remains useful for full local integration testing. PartyKit adds a faster no-Docker option for daily development.

### Mode A — Fast daily dev (no Docker, recommended for active development)

```bash
# Terminal 1 — PartyKit backend (hot-reload)
npx partykit dev
# Runs on http://localhost:1999
# Simulates Durable Objects locally, full feature parity

# Terminal 2 — Astro frontend (hot-reload)
cd front && npm run dev
# Runs on http://localhost:4321
# Uses PUBLIC_PARTYKIT_HOST=localhost:1999 from front/.env.local

# Terminal 3 — Docusaurus docs (optional)
cd docs-site && npm start
# Runs on http://localhost:3002
```

No Docker required. PartyKit dev server emulates Durable Objects and KV locally.

### Mode B — Full integration test (Docker, mirrors production shape)

```bash
# Requires Docker Desktop
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| PartyKit backend | http://localhost:1999 |
| Docs | http://localhost:3002 |

The `docker-compose.yml` is updated to replace the NestJS `back` service with a PartyKit dev container. No Postgres service needed — KV and DO storage are emulated by PartyKit locally.

### Mode C — Docs only

```bash
cd docs-site && npm start
```

## Environment variables

```bash
# front/.env.local  (local dev — never committed)
PUBLIC_PARTYKIT_HOST=localhost:1999

# front/.env.production  (or set in Cloudflare Pages dashboard)
PUBLIC_PARTYKIT_HOST=sommelier-arena.YOUR-CF-USERNAME.partykit.dev

# partykit.json handles all backend env — no .env needed for party/
```

No `DATABASE_URL`. No `RENDER_API_KEY`. No external services.

---

## What changes vs current MVP

### Backend — full rewrite (`party/game.ts`)

- **Drop:** NestJS, Socket.IO server, all decorators, dependency injection, Dockerfile for backend, Prisma
- **Add:** Single TypeScript class implementing `Party.Server` — one instance per game session
- **Persistence:** `this.room.storage` replaces Supabase + Prisma entirely
- **Session index:** Cloudflare KV replaces any session-list DB table
- **Deploy:** `npx partykit deploy` — no server management, no cold starts

### Frontend — targeted changes only

- **Transport swap:** `socket.io-client` → `partysocket`
- **Send:** `socket.send(JSON.stringify({ type: 'event', ...data }))` instead of `socket.emit()`
- **Receive:** `socket.addEventListener('message', e => { const {type,...} = JSON.parse(e.data) })` instead of `socket.on()`
- **All React components, Zustand store structure, Tailwind styling** — unchanged except where noted

### Docs site — minimal change

- Update `docusaurus.config.ts`: set `baseUrl: '/docs'` and `url: 'https://sommelier-arena.ducatillon.net'`
- Deploy as a **separate** Cloudflare Pages project
- A small Cloudflare Worker (`proxy-worker/index.ts`) routes `sommelier-arena.ducatillon.net/docs/*` to the docs Pages deployment

### docker-compose.yml — updated not removed

- Replace `back` service (NestJS) with `partykit` service running `npx partykit dev`
- Remove `postgres` service — no longer needed
- Keep `front` and `docs` services unchanged
- Use plain `docker-compose up` to run the full-stack mode

---

## New features vs current MVP

### 1. Five questions per wine (was 4)

Categories in fixed order: `color`, `country`, `grape_variety`, `vintage_year`, `wine_name`

### 2. Autocomplete defaults in SessionForm

Correct answer field always blank — host must explicitly mark it. Distractor fields pre-filled with sensible defaults, fully overridable.

| Category | Default distractor options |
|---|---|
| Color | Rouge, Blanc, Rosé, Orange |
| Country / Region | Bordeaux (France), Burgundy (France), Loire Valley (France), Tuscany (Italy) |
| Vintage Year | 2015, 2016, 2017, 2018 |
| Wine Name | Château Margaux, Domaine de la Romanée-Conti, Château Lafite Rothschild, Château Latour |
| Grape Variety | No defaults — host fills in manually |

### 3.  answer order

Fisher-Yates shuffle applied to options before each broadcast. Correct answer is never always position A. Identified server-side by ID, not position.

### 4. Answer changing allowed until Reveal

No first-tap lock. Participant can change selection freely until host clicks Reveal or timer expires. Backend overwrites previous answer on each `submit_answer`. Host answered-count increments only on first answer per participant, not on changes.

### 5. Configurable timer per session

Host sets duration once at session creation via a range slider (15–120s, default 60s). Applies to all questions in that session. Stored in DO storage.

### 6. Session persistence — host sets up days in advance

Full session state (wines, questions, timer config, phase) persists in DO storage indefinitely. No automatic expiry. Host can create Monday, close browser, reopen Wednesday — session is intact.

### 7. Participant rejoin on page refresh

- On join: server issues UUID `rejoinToken`, returned to frontend
- Frontend stores in `localStorage`: `{ rejoinToken, code, pseudonym }`
- On page load: if token in localStorage, auto-emit `rejoin_session { rejoinToken }`
- Backend re-attaches socket to existing participant, rebroadcasts current game state
- On session end: localStorage entry cleared

### 8. Host identity — human-readable ID (Adjective+Wine format)

- Format: `TANNIC-FALCON`, `SILKY-BARREL`, `OAKY-CELLAR` — same word lists as participant pseudonym generator, reuses existing logic
- Generated once on first visit, stored in `localStorage` as `hostId`
- Also used as the KV key for this host's session list: `host:TANNIC-FALCON`
- Displayed prominently in the UI after first session creation
- Multiple hosts fully isolated — different KV keys, different DO instances, zero interference

### 9. Host sessions dashboard (`/host` landing page)

Shown before creating a new session. Two sections sourced from KV + DO:

**Active sessions** (state = `waiting` or `active`):
- Title, creation date, 4-digit code, participant count
- `[Open]` button → reconnects host using `hostToken` from localStorage

**Ended sessions** (state = `ended`):
- Title, date, participant count
- `[Results]` button → loads final leaderboard from DO storage

### 10. Share-link flow (no email service needed)

After session creation, display:

```
Session created! Code: 4821

Your host link — save this to return later on any device:
https://sommelier-arena.ducatillon.net/host?id=TANNIC-FALCON

[Copy link]  [Share via WhatsApp]  [Share via iMessage]
```

URL encodes the host ID. On load, app reads `?id=` param, restores host identity from KV, shows sessions dashboard. Works on any device. No email infrastructure needed.

---

## Host identity + session storage architecture

```
Cloudflare KV  (namespace: SOMMELIER_HOSTS)
───────────────────────────────────────────
key:   'host:TANNIC-FALCON'
value: [
  {
    code: '4821',
    title: 'Wine Night',
    createdAt: '2025-06-02T19:00:00Z',
    status: 'waiting',
    participantCount: 0
  },
  {
    code: '3317',
    title: 'Birthday Tasting',
    createdAt: '2025-03-15T20:00:00Z',
    status: 'ended',
    participantCount: 8,
    finalRankings: [
      { pseudonym: 'TannicFalcon', score: 400 },
      { pseudonym: 'FruityBarrel', score: 300 }
    ]
  }
]

Durable Object storage  (one DO instance per session, room ID = 4-digit code)
──────────────────────────────────────────────────────────────────────────────
'state'                          → { wines, phase, timerSeconds, currentRound, currentQuestion }
'hostToken'                      → 'ht-uuid-...'   (validates host reconnect)
'hostId'                         → 'TANNIC-FALCON' (back-reference to KV)
'participant:{rejoinToken}'      → { id, pseudonym, score, connected }
'response:{participantId}:{questionId}' → { optionId, correct, points }
```

---

## RAM vs disk in the Durable Object

| Data | RAM | Disk | Written to disk when |
|---|---|---|---|
| Wines & questions | ✅ | ✅ | Session creation |
| Session phase | ✅ | ✅ | Every phase change |
| Timer config (seconds) | ✅ | ✅ | Session creation |
| Timer countdown (ms) | ✅ | ❌ | Never — cosmetic only |
| Timer alarm (authoritative expiry) | ❌ | ✅ | Question start |
| Participants + rejoin tokens | ✅ | ✅ | On join |
| Scores | ✅ | ✅ | On every Reveal |
| In-flight answers (before Reveal) | ✅ | ❌ | Never until Reveal |
| Final answers | ✅ | ✅ | On Reveal |
| Current round/question index | ✅ | ✅ | On every advance |
| WebSocket connections | ✅ | ❌ | Cannot persist sockets |

---

## Game phases (logic unchanged, new implementation)

```
waiting → question_open ⇄ question_paused
                ↓  host: Reveal
        question_revealed
                ↓  host: Next
        round_leaderboard     ← after last question of a wine
                ↓  host: Next
        question_open         ← next wine, or...
        ended                 ← after last wine → final leaderboard
```

- Host controls: Start, Pause, Resume, Reveal Answer, Next, End
- Participant controls: Join (4-digit code), Submit answer, Change answer (until Reveal)

**Unchanged constraints:**
- Max 10 participants per session
- No new joins after game starts
- Disconnected participants frozen on leaderboard
- Participant rejoin via token works at any phase (lobby or mid-game)
- 100 points correct, 0 wrong or unanswered
- Host sees answered count only (not what each participant answered)
- All participants see options in same shuffled order

---

## Timer — two-layer implementation

```typescript
// RAM: drives the visual countdown broadcast every second
this.activeTimer = setInterval(() => {
  this.timerRemainingMs -= 1000;
  this.room.broadcast(JSON.stringify({
    type: 'game:timer_tick',
    remainingMs: this.timerRemainingMs
  }));
}, 1000);

// DISK: authoritative expiry — survives DO eviction and re-wake
await this.room.storage.setAlarm(Date.now() + (this.timerSeconds * 1000));

// Called by Cloudflare when alarm fires (even after eviction)
async alarm() {
  await this.handleTimerExpiry();
}
```

---

## PartyKit Durable Object skeleton (`party/game.ts`)

```typescript
import type * as Party from 'partykit/server';

export default class GameSession implements Party.Server {
  // in-memory state (restored from disk in onStart)
  wines: Wine[] = [];
  participants = new Map<string, Participant>();
  phase: SessionPhase = 'waiting';
  currentRound = 0;
  currentQuestion = 0;
  timerSeconds = 60;
  timerRemainingMs = 60000;
  hostConnectionId: string | null = null;
  activeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(readonly room: Party.Room) {}

  // Restore persisted state when DO wakes from storage
  async onStart() {
    const state = await this.room.storage.get<SavedState>('state');
    if (state) {
      this.wines = state.wines;
      this.phase = state.phase;
      this.timerSeconds = state.timerSeconds;
      this.currentRound = state.currentRound;
      this.currentQuestion = state.currentQuestion;
    }
  }

  onConnect(conn: Party.Connection) {
    // send current phase/state snapshot to newly connected socket
  }

  async onMessage(message: string, sender: Party.Connection) {
    const event = JSON.parse(message);
    switch (event.type) {
      case 'create_session':   // host: create, persist to storage + KV
      case 'rejoin_host':      // host: validate hostToken, restore control
      case 'join_session':     // participant: validate code, assign pseudonym
      case 'rejoin_session':   // participant: validate rejoinToken, restore slot
      case 'host:start':       // start game, close lobby
      case 'host:pause':       // freeze timer
      case 'host:resume':      // resume timer from remaining ms
      case 'host:reveal':      // lock answers, score, persist, broadcast
      case 'host:next':        // advance question or round
      case 'host:end':         // end session, persist final state to KV
      case 'submit_answer':    // record/overwrite answer in RAM
    }
  }

  async alarm() {
    await this.handleTimerExpiry();
  }

  // Helpers
  broadcast(type: string, data: object, exclude?: string[]) {
    this.room.broadcast(JSON.stringify({ type, ...data }), exclude);
  }

  sendTo(connId: string, type: string, data: object) {
    this.room.getConnection(connId)?.send(JSON.stringify({ type, ...data }));
  }

  async saveState() {
    await this.room.storage.put('state', {
      wines: this.wines,
      phase: this.phase,
      timerSeconds: this.timerSeconds,
      currentRound: this.currentRound,
      currentQuestion: this.currentQuestion,
    });
  }
}
```

---

## Proxy Worker for `/docs` path (`proxy-worker/index.ts`)

```typescript
// Routes sommelier-arena.ducatillon.net/docs/*
// to the separate Docusaurus Cloudflare Pages deployment
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/docs')) {
      const docsUrl = new URL(request.url);
      docsUrl.hostname = 'sommelier-arena-docs.pages.dev'; // docs Pages deployment
      return fetch(new Request(docsUrl.toString(), request));
    }
    // All other paths: pass through to the main Pages deployment
    return fetch(request);
  }
}
```

This Worker is deployed to `sommelier-arena.ducatillon.net` and handles the path routing transparently.

---

## Docusaurus config change (`docs-site/docusaurus.config.ts`)

```typescript
// Only two lines change:
url: 'https://sommelier-arena.ducatillon.net',
baseUrl: '/docs/',
```

Everything else in the docs site is unchanged.

---

## Frontend socket swap

```typescript
// BEFORE (socket.io-client — remove this)
import { io } from 'socket.io-client';
const socket = io(BACKEND_URL, { autoConnect: false });
socket.emit('submit_answer', { questionId, optionId });
socket.on('game:question', (payload) => { /* ... */ });

// AFTER (partysocket — use this)
import PartySocket from 'partysocket';
const socket = new PartySocket({
  host: import.meta.env.PUBLIC_PARTYKIT_HOST,
  room: sessionCode,  // the 4-digit code IS the DO room ID
});
socket.send(JSON.stringify({ type: 'submit_answer', questionId, optionId }));
socket.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);
  if (event.type === 'game:question') { /* ... */ }
});
```

---

## Updated `docker-compose.yml` (backend service replaced)

```yaml
services:
  partykit:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
    command: sh -c "npm install && npx partykit dev --port 1999"
    ports:
      - '1999:1999'
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:1999/"]
      interval: 5s
      timeout: 3s
      retries: 10

  front:
    build:
      context: ./front
      args:
        PUBLIC_PARTYKIT_HOST: "localhost:1999"
    ports:
      - '3000:3000'
    depends_on:
      partykit:
        condition: service_healthy

  docs:
    build:
      context: ./docs-site
    ports:
      - '3002:80'
```

No `postgres` service. No `back` (NestJS) service.

---

## Cloudflare setup checklist (one-time)

**KV namespace:**
- Cloudflare dashboard → Workers & Pages → KV → Create namespace: `SOMMELIER_HOSTS`
- Copy the namespace ID into `partykit.json`

**`partykit.json`:**

```json
{
  "name": "sommelier-arena",
  "parties": { "game": "party/game.ts" },
  "kv": [{ "binding": "HOSTS_KV", "id": "YOUR_KV_NAMESPACE_ID" }]
}
```

**DNS records on `ducatillon.net`:**

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `sommelier-arena` | Cloudflare Pages auto-configured | ✅ ON |

No `api.` subdomain needed — PartyKit has its own domain.

**Two Cloudflare Pages projects:**
- `sommelier-arena` → root `front/` directory → `npm run build` → `dist/` → custom domain `sommelier-arena.ducatillon.net`
- `sommelier-arena-docs` → `docs-site/` directory → `npm run build` → `build/` → no custom domain (accessed via proxy Worker)

**Proxy Worker:**
- Deploy `proxy-worker/index.ts` as a Worker
- Add route: `sommelier-arena.ducatillon.net/docs*` → this Worker

---

## Deployment commands

```bash
# Deploy backend (PartyKit)
npx partykit deploy

# Deploy proxy worker
npx wrangler deploy proxy-worker/index.ts --name sommelier-arena-proxy

# Frontend + docs deploy automatically on git push to main via Cloudflare Pages CI
```

---

## Game day workflow

**Day before:**
1. Open https://sommelier-arena.ducatillon.net
2. App generates host ID `TANNIC-FALCON`, stores in `localStorage`
3. Host fills in wines, sets timer, clicks Create Session
4. App shows: `Code: 4821` + share link → host sends to self via WhatsApp
5. Browser closed — session in DO storage indefinitely

**Game day:**
1. Host opens WhatsApp link → app reads `?id=TANNIC-FALCON`
2. Sessions dashboard shows session → `[Open]`
3. Host reconnects, shares code `4821` verbally
4. Participants open app on phones, join with code
5. Host clicks Start → game runs entirely in memory from this point

---

## Contributing / docs site

The Docusaurus site at `sommelier-arena.ducatillon.net/docs` is open for contributions. Standard GitHub flow — fork, branch, PR. Cloudflare Pages auto-deploys on merge to `main`. No special setup needed for contributors beyond `cd docs-site && npm start` for local preview.