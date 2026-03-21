---
id: quick-start
title: Quick Start
sidebar_position: 1
---

# Quick Start

Choose **Option A** (Docker, simplest) or **Option B** (local dev, fastest iteration).

## Prerequisites

- Node.js ≥ 20 (Option B only)
- Docker Desktop ≥ 24 with Compose v2 (Option A only)
- Git

---

## Option A — Docker (recommended for demos)

```bash
git clone <repo-url>
cd SommelierArena
docker-compose up --build
```

| Service | URL |
|---------|-----|
| **Host / Participant app** | http://localhost:3000 |
| **Backend API + WebSocket** | http://localhost:3001 |
| **Documentation site** | http://localhost:3002 |

Stop everything:
```bash
docker-compose down
```

> **Troubleshooting — "localhost refused to connect" on `/host` or `/play`**
>
> If you see the browser navigate to `http://localhost/host/` (port 80) with a "refused to connect" error, your browser has cached an old HTTP 301 redirect from a previous version of the app. The Docker stack now also listens on port 80, so this cached redirect will automatically resolve correctly — just make sure the stack is running with `docker-compose up -d`.

---

## Option B — Local development

Open **three terminals** from the repo root.

### Terminal 1 — Backend
```bash
cd back
npm install
npm run start:dev   # hot-reload on :3001
```

### Terminal 2 — Frontend
```bash
cd front
npm install
npm run dev         # hot-reload on :4321 (Astro 4 default)
```

### Terminal 3 — Docs (optional)
```bash
cd docs-site
npm install
npm start           # Docusaurus on :3002
```

---

## Running tests

### Unit tests
```bash
cd back
npm test
```

Expected output: **40 passed** across `game.service`, `timer.service`, and `pseudonym.service`.

### Integration tests
```bash
cd back
npm run test:e2e 2>/dev/null || npm test -- --testPathPattern=integration
```

The integration suite spins up a real NestJS + Socket.IO server on a random port and runs 9 scenarios covering the full game lifecycle.

---

## E2E tests (Playwright)

The E2E suite runs against the live Docker stack and covers all critical user journeys: home navigation, session creation, participant join (happy/boundary/negative paths), full game flow, and pause/resume.

**Pre-requisite:** the Docker stack must be running (`docker-compose up -d`).

```bash
cd e2e
npm install
npx playwright install chromium
npx playwright test
```

View the HTML report after a run:
```bash
npx playwright show-report
```

Run a single spec for faster iteration:
```bash
npx playwright test tests/full-game.spec.ts
```

---

## Beta-test walkthrough (two browser windows)

1. Open **Window 1** → `http://localhost:3000` — click **Host a Session**
2. Fill in wine names and questions, then click **Create Session** — note the 4-digit code
3. Open **Window 2** → `http://localhost:3000` — click **Join** and enter the code
4. Back in Window 1 click **Start Game**
5. Window 2 shows the first question; tap an answer
6. Window 1 shows answer count updating in real time — click **Reveal**
7. Both windows show correct answer + points earned
8. Repeat **Next → Reveal** for each question
9. After the last question the round leaderboard appears, then the final leaderboard

### Pause/resume
During a question the host can click **Pause** — participants see a countdown freeze — and **Resume** to continue from exactly where it stopped.

