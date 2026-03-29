---
id: networking
title: Networking — localhost:1999 vs the proxy URL
sidebar_label: Networking URLs
---

# Networking URLs

Sommelier Arena exposes two WebSocket-capable endpoints depending on how you run the stack. Understanding the difference is useful when debugging or setting up a new environment.

## The two URLs

| URL | What it is |
|-----|-----------|
| `ws://localhost:1999/parties/main/{code}` | **Direct** PartyKit dev server |
| `ws://localhost:4321/parties/main/{code}` | **Proxied** — browser → nginx → PartyKit |

Both reach the same Durable Object and the same game logic. The difference is purely in the network path.

---

## Mode A — Local development (no Docker)

```
npx partykit dev --port 1999        # PartyKit listens on 1999
cd front && npm run dev             # Astro dev server on 4321
```

`front/.env.local` (copied from `front/.env.example`) sets:

```
PUBLIC_PARTYKIT_HOST=localhost:1999
```

The browser connects **directly** to `ws://localhost:1999/parties/main/{code}`. No proxy is involved. The Astro dev server and PartyKit are two separate processes on two separate ports.

**Use `localhost:1999` for:**
- Rapid frontend iteration with Vite HMR
- Debugging PartyKit logs directly in your terminal

---

## Mode B — Docker (`docker-compose up`)

```
docker-compose up --build -d
# front (nginx) → localhost:4321
# back (PartyKit) → localhost:1999  (exposed directly to the browser)
# docs (Docusaurus) → localhost:3002
```

In this mode, the Astro static site is built into nginx. At build time, the env var is baked in:

```
PUBLIC_PARTYKIT_HOST=localhost:1999   ← set via Docker build arg
```

The browser connects **directly** to `ws://localhost:1999/parties/main/{code}` — the same URL as Mode A. nginx serves only static HTML/JS/CSS files and handles SPA routing; it does not proxy WebSocket traffic.

```
Browser  ──ws://localhost:1999/parties/main/1234──►  PartyKit (back:1999) [exposed on host port 1999]
```

**Use Mode B for:**
- Beta testing the full stack in Docker
- Running E2E tests against the production-like build

---

## Production — Cloudflare

In production the PartyKit server is deployed to Cloudflare Workers via `npx partykit deploy`. The game URL becomes:

```
wss://sommelier-arena.USERNAME.partykit.dev/parties/main/{code}
```

The Cloudflare Pages frontend is built with:

```
PUBLIC_PARTYKIT_HOST=sommelier-arena.USERNAME.partykit.dev
```

The browser connects directly to the PartyKit Workers URL — **no nginx proxy** is needed because Cloudflare handles TLS, routing, and WebSocket upgrades natively.

```
Browser  ──wss://sommelier-arena.USERNAME.partykit.dev/parties/main/1234──►  Cloudflare Workers (PartyKit DO)
```

---

## Summary

| Mode | `PUBLIC_PARTYKIT_HOST` | Who proxies? |
|------|-----------------------|--------------|
| Mode A — local dev | `localhost:1999` | None — direct |
| Mode B — Docker | `localhost:1999` | None — direct (back exposed on host port 1999) |
| Production | `sommelier-arena.USERNAME.partykit.dev` | Cloudflare (native) |

The PartyKit WebSocket path is always `/parties/main/{sessionCode}` — `main` matches the `"main"` entry point in `partykit.json`, and `{sessionCode}` is the 4-digit room ID.

---

## Port reference

| Environment | Frontend URL | PartyKit/WebSocket |
|-------------|-------------|-------------------|
| Mode A (local dev) | `http://localhost:4321` | `localhost:1999` (direct) |
| Mode B (Docker) | `http://localhost:4321` | `localhost:1999` (direct — back exposed on host port 1999) |
| Production | `https://your-domain.com` | `<project>.partykit.dev` |

---

## Environment variables

| Variable | Where to set | Value |
|----------|-------------|-------|
| `PUBLIC_PARTYKIT_HOST` | `front/.env.local` (Mode A) | `localhost:1999` |
| `PUBLIC_PARTYKIT_HOST` | `docker-compose.yml` build arg (Mode B) | `localhost:1999` |
| `PUBLIC_PARTYKIT_HOST` | Cloudflare Pages dashboard (Production) | `<project>.partykit.dev` |

> **Mode B note:** In Docker, the browser connects directly to `localhost:1999` for WebSocket traffic (the `back` container is exposed on host port 1999). nginx in the `front` container only serves static files and handles SPA routing — no WebSocket proxy needed.

> **Mode A and Mode B use the same `PUBLIC_PARTYKIT_HOST`:** Both modes set `PUBLIC_PARTYKIT_HOST=localhost:1999`. The browser always connects to `ws://localhost:1999/parties/main/{code}` directly. The app code is identical in both modes.
