---
id: tech-stack
title: "Tech Stack & Principles"
sidebar_label: Tech Stack
---

# Tech Stack

## Production stack (v2.0 PartyKit)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | **Astro 5** (static) + **React 19** islands | Zero JS by default; interactivity only where needed |
| Styling | **Tailwind CSS v4** | Utility-first; no design system dependency |
| UI Components | **@headlessui/react** | Accessible, unstyled primitives (combobox, dialog, etc.) |
| State | **Zustand** | One store each for host and participant |
| WebSockets | **PartySocket** (`partysocket`) | Drop-in wrapper with auto-reconnect |
| Backend | **PartyKit** (Cloudflare Workers + Durable Objects) | One DO instance per game session |
| Persistence | **Durable Object storage** (SQLite-backed) | Game state survives DO eviction |
| Session index | **Cloudflare KV** (`SOMMELIER_HOSTS` namespace) | Maps `host:{id}` → list of session codes |
| Wine answers | **Cloudflare KV** (`WINE_ANSWERS_KV` namespace) | Category → JSON array of curated answer strings |
| Wine Answers Worker | **Cloudflare Worker** (`wine-answers-worker/`) | REST API for curated answer suggestions (port 1998 locally) |
| DNS + TLS | **Cloudflare** (`ducatillon.net`) | Managed; zero cert renewal |
| Docs proxy | **Cloudflare Worker** (`proxy-worker/index.ts`) | Routes `/docs/*` to Docusaurus Pages project |

## Design principles

1. **No server to maintain** — Durable Objects are managed infrastructure; no VMs, no Docker in production.
2. **€0/month** — Cloudflare free tier covers all traffic for a casual dinner-party app.
3. **Islands architecture** — Astro renders everything at build time; React hydrated only for the game UI.
4. **State machine discipline** — All business logic in the `back/` module (split across `game.ts`, `utils.ts`, `constants.ts`, `scoring.ts`, `timer.ts`). The frontend projects server state.

:::warning Deploy after backend changes
Any edit to files under `back/` must be deployed to Cloudflare:
```bash
npx partykit deploy   # from repo root
```
The `proxy-worker` does **not** need redeployment for backend-only changes.
:::
5. **Single source of truth** — Session state is DO built-in storage. No database, no ORM.

## Backend

`back/` — PartyKit Durable Object game logic (`back/game.ts`). This is the real-time game server.

## Why PartyKit over plain Durable Objects?

| Concern | Plain DO | PartyKit |
|---------|----------|----------|
| WebSocket fan-out | Manual `this.state.getWebSockets()` | `this.room.broadcast()` |
| Local dev | `wrangler dev` (requires auth) | `npx partykit dev` (no auth) |
| Deploy | `wrangler deploy` | `npx partykit deploy` |
| Free tier | Yes | Yes |
