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

`front/.env.local` (or `.env.local.example`) sets:

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
# back (PartyKit) → localhost:1999  (internal only, not exposed to the browser directly)
# docs (Docusaurus) → localhost:3002
```

In this mode, the Astro static site is built into nginx. At build time, the env var is baked in:

```
PUBLIC_PARTYKIT_HOST=localhost:4321   ← set via Docker build arg
```

The browser connects to `ws://localhost:4321/parties/main/{code}`. nginx then **proxies** that to `http://back:1999/parties/main/{code}` (inside the Docker network — `back` is the service name).

```
Browser  ──ws://localhost:4321/parties/main/1234──►  nginx (front:4321)
                                                          │
                                              proxy_pass  ▼
                                         PartyKit (back:1999) [Docker internal]
```

**Why go via nginx instead of directly to 1999?**
- The Astro build is **static** — `PUBLIC_PARTYKIT_HOST` is baked at build time, not runtime. There is no way to change it after the image is built.
- Using the same origin (`localhost:4321`) avoids cross-origin WebSocket upgrades.
- In production the exact same pattern applies (your domain instead of `localhost:4321`).

**Use `localhost:4321` (proxied) for:**
- Beta testing the full stack in Docker
- Simulating the production network topology

You can still access PartyKit directly at `localhost:1999` for low-level debugging (e.g. testing a WebSocket message with `wscat`), but the running app always uses the proxied URL.

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
| Mode B — Docker | `localhost:4321` | nginx (`front` container) |
| Production | `sommelier-arena.USERNAME.partykit.dev` | Cloudflare (native) |

The PartyKit WebSocket path is always `/parties/main/{sessionCode}` — `main` matches the `"main"` entry point in `partykit.json`, and `{sessionCode}` is the 4-digit room ID.

---

## Port reference

| Environment | Frontend URL | PartyKit/WebSocket |
|-------------|-------------|-------------------|
| Mode A (local dev) | `http://localhost:4321` | `localhost:1999` |
| Mode B (Docker) | `http://localhost:4321` | internal (nginx proxies `/parties/*` to `back:1999`) |
| Production | `https://your-domain.com` | `<project>.partykit.dev` |

---

## Environment variables

| Variable | Where to set | Value |
|----------|-------------|-------|
| `PUBLIC_PARTYKIT_HOST` | `front/.env.local` (Mode A) | `localhost:1999` |
| `PUBLIC_PARTYKIT_HOST` | `docker-compose.yml` build arg (Mode B) | `localhost:4321` |
| `PUBLIC_PARTYKIT_HOST` | Cloudflare Pages dashboard (Production) | `<project>.partykit.dev` |

> **Mode B note:** In Docker, nginx proxies WebSocket connections from `localhost:4321/parties/*` to the PartyKit container on port 1999. The frontend sees a single origin (`localhost:4321`) for both HTTP and WebSocket — no cross-origin issues.

> **localhost:1999 vs localhost:4321 in dev:** When running Mode A (local dev with `npx partykit dev`), PartyKit listens on port **1999** directly. Your browser connects to `ws://localhost:1999/parties/main/{code}`. In Mode B (Docker), PartyKit is internal-only; nginx at port **4321** accepts WebSocket upgrades at `/parties/*` and proxies them to the PartyKit container. The app code is identical in both modes — only `PUBLIC_PARTYKIT_HOST` changes.
