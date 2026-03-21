---
id: tech-stack
title: "Tech Stack & Principles"
---

# Tech Stack & Principles

## Stack

- **Frontend**: Astro + React components; lightweight UI with Zustand for local state.
- **Backend**: NestJS with a Socket.IO gateway for real-time messaging.
- **Realtime**: Socket.IO (WebSocket with HTTP long-polling fallback).
- **Persistence**: Ephemeral only — client-side Zustand/localStorage. No server-side persistence, no session export/import for MVP.
- **DB**: No database required for MVP. If persistence is added post-MVP, Postgres is the preferred choice.

## Principles

- Keep MVP simple — no auth, no database, no infrastructure beyond the two services.
- Separation of concerns: frontend owns UI state (Zustand); backend owns session/game state and broadcasts via Socket.IO.
- Business rules (scoring, timer, question flow) live in the backend and are not duplicated on the client.
- Testability: business rules decoupled from transport layer.
- Single Responsibility Principle
- 80% coverage for Unit tests. test arbo mirrors the code app.