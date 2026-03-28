---
id: configuration
title: Configuration & Environments
sidebar_label: Configuration & Environments
audience: developer
tags: [config, env, deployment, local, docker, nginx]
---

# Configuration & Environments

This page is the single reference for how Sommelier Arena is configured across the three environments you will encounter:

| | **Mode A — Local dev** | **Mode B — Docker** | **Production** |
|---|---|---|---|
| **Frontend** | Astro dev server `http://localhost:4321` | nginx container `http://localhost:4321` | Cloudflare Pages (CDN) |
| **PartyKit backend** | `npx partykit dev` `ws://localhost:1999` | PartyKit container (internal, nginx proxied) | Cloudflare Workers + Durable Objects |
| **Documentation** | Docusaurus dev `http://localhost:3002` | Docusaurus container `http://localhost:3002` | Cloudflare Pages (separate project) |
| **DO storage** (`room.storage`) | ⚠️ In-memory | ⚠️ In-memory | ✅ SQLite per DO |
| **Cloudflare KV** (`HOSTS_KV`) | ❌ Not available | ❌ Not available | ✅ Real KV namespace |
| **Browser localStorage** | ✅ Works | ✅ Works | ✅ Works |

---

## Environment variables

### Frontend (`front/`)

Copy `front/.env.example` → `front/.env.local` for local development:

```bash
cd front && cp .env.example .env.local
```

| Variable | Mode A (local) | Mode B (Docker) | Production |
|---|---|---|---|
| `PUBLIC_PARTYKIT_HOST` | `localhost:1999` (direct to `partykit dev`) | `localhost:4321` (baked at Docker build time; nginx proxies `/parties/*` to back:1999) | `sommelier-arena.<username>.partykit.dev` |
| `PUBLIC_DOCS_URL` | *(optional)* `http://localhost:3002/docs` | *(optional)* `http://localhost:3002/docs` | `https://your-domain/docs` |

> **Docker note:** In Mode B, `PUBLIC_PARTYKIT_HOST` is a Docker build arg baked into the Astro static build — do **not** rely on `.env.local` for Docker builds. Pass it via `docker-compose.yml` or `docker build --build-arg`.

### Backend (`back/`)

The backend is a PartyKit Durable Object (`back/game.ts`). It has **no `.env` file**. Configuration comes from:
- `partykit.json` — KV namespace bindings, DO class names
- `wrangler secret put` or CI secrets — production secrets

### Docs site (`docs-site/`)

Copy `docs-site/.env.example` → `docs-site/.env`:

```bash
cd docs-site && cp .env.example .env
```

| Variable | Local | Docker | Production |
|---|---|---|---|
| `DOCS_BASE_URL` | `/` (root) | `/docs` (baked at build time) | `/docs` (Cloudflare Pages base path) |

---

## Master config comparison

All layers in one view:

| Layer | Setting | Mode A (local) | Mode B (Docker) | Production |
|---|---|---|---|---|
| **Frontend** | `PUBLIC_PARTYKIT_HOST` | `front/.env.local` → `localhost:1999` | Docker build arg → `localhost:4321` | Cloudflare Pages env → `<project>.partykit.dev` |
| **Frontend** | Serving | Astro dev server `:4321` | nginx container (mapped `4321:3000`) | Cloudflare Pages CDN |
| **Backend** | PartyKit | `npx partykit dev --port 1999` | PartyKit container (internal `:1999`) | Cloudflare Workers (Durable Objects) |
| **Backend** | DO storage | In-memory (resets on restart) | In-memory | SQLite (persistent across DO evictions) |
| **Backend** | `HOSTS_KV` | Not available | Not available | Cloudflare KV namespace (bound in `partykit.json`) |
| **Docs** | Serving | Docusaurus dev `:3002` | nginx container (mapped `3002:80`) | Cloudflare Pages (`/docs`) |
| **Docs** | `DOCS_BASE_URL` | `/` | `/docs` | `/docs` |
| **Proxy Worker** | `DOCS_ORIGIN` | N/A | N/A | Injected via Wrangler `--var` or Worker env |
| **Deployment** | Command | `npx partykit dev` | `docker-compose up --build` | `git push` (Pages) + `npx partykit deploy` + `npx wrangler deploy` |

---

## nginx.conf explained

The Docker `front` container uses **nginx** as a static file server. Here's what `front/nginx.conf` does and why:

### What it does

```nginx
# 1. Listen on container port 3000 (Docker maps host port 4321 → container 3000)
listen 3000;

# 2. Use relative Location headers so port mapping doesn't strip the host port
absolute_redirect off;

# 3. Proxy WebSocket + HTTP to the PartyKit backend container
location /parties/ {
    proxy_pass http://back:1999/parties/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# 4. SPA routing: serve index.html for any unknown path (/host, /play, ...)
location / {
    try_files $uri $uri/index.html /index.html;
}
```

**Why nginx:**
- Astro builds to **pure static files** (`output: static` in `astro.config.mjs`) — no Node.js server runs at request time. nginx serves these HTML/JS/CSS files.
- The browser must access static files **and** WebSocket on the **same origin** to avoid CORS issues. nginx handles both in one container.
- `absolute_redirect off` prevents port-stripping bugs: without it, nginx's 301 redirects use the internal port (3000), causing browsers to cache broken redirects to `http://localhost/host` instead of `http://localhost:4321/host`.
- `try_files $uri $uri/index.html /index.html` is the standard SPA pattern: nginx checks for the exact file, then `path/index.html`, then falls back to `index.html` — no redirect triggered for `/host` or `/play`.

### Why we need it for E2E tests

The Playwright E2E tests run against the Docker stack (Mode B). Without nginx:
1. There's no server to serve the Astro static build
2. WebSocket connections from the browser to `/parties/*` have no route to the `back` container

### Alternatives to nginx

| Alternative | Trade-offs |
|---|---|
| **Caddy** | Simpler config syntax, auto-HTTPS; same capabilities. Swap `nginx:alpine` for `caddy:alpine` and replace `nginx.conf` with a `Caddyfile`. |
| **Mode A (no Docker)** | `npm run dev` in `front/` uses Astro's built-in dev server on `:4321`. SPA routing and WebSocket proxy work natively. No nginx needed. This is the **recommended** approach for daily development. |
| **Apache httpd** | Heavier; works but nginx:alpine is smaller. |
| **Node.js + http-proxy-middleware** | More complex Docker setup; not production-like. |

> For local development (**Mode A**), you never need nginx. nginx is only required for the production-like Docker build used in E2E tests (**Mode B**).

---

## Storage layers

### 1. Browser `localStorage` — always available

| Key | Contents | Used by |
|---|---|---|
| `sommelier-arena-host-{hostId}` | `SessionListEntry[]` — host's session history | Host Dashboard |
| `sommelier-arena-rejoin` | `{ id, code }` — participant rejoin credential (pseudonym + session code) | Participant rejoin |

Works identically in all environments. Managed by `front/src/lib/sessionStorage.ts`.

> ⚠️ **Local dev note**: Because KV is not available locally, the Host Dashboard session list comes **only** from localStorage. Use the 🗑 button to clean up stale sessions.

### 2. Durable Object storage (`room.storage`) — in-memory locally

| Key | Contents |
|---|---|
| `'state'` | Full `SavedState` snapshot (restored after DO eviction) |
| `'hostId'` | Host re-authentication token |
| `'participant:{pseudonym}'` | Participant state (score, answers) — keyed by their ADJECTIVE-NOUN pseudonym |
| `'response:{participantId}:{questionId}'` | Answer record for accurate scoring |

- **Local / Docker**: In-memory. Restarting `partykit dev` or `docker-compose down` clears all sessions.
- **Production**: SQLite-backed. `onStart()` in `back/game.ts` reads saved state when the DO wakes from cold storage.

### 3. Cloudflare KV (`HOSTS_KV`) — production only

Cross-session host index. Key: `host:{hostId}` → `SessionListEntry[]`.

Not available in Mode A or Mode B. The backend wraps all KV writes in `try/catch` and silently skips them locally — the app continues working via localStorage.

---

## How a static site runs multiplayer

Astro builds to HTML + JS + CSS. No server runs at request time. Yet the app is live-multiplayer. How?

1. **Astro static build** → pure files deployed to Cloudflare Pages CDN globally.
2. **PartySocket bundled in JS** → compiled into the JS bundle at build time.
3. **Browser opens WebSocket** to `ws://your-domain.com/parties/main/{sessionCode}` (or `ws://localhost:4321/parties/main/{code}` in Mode B via nginx proxy).
4. **All game state flows over WebSocket** — no REST API. Events: `host:start`, `participant:submit_answer`, `game:question`, `game:timer_tick`, `game:answer_revealed`, etc.
5. **React islands handle reactivity** — Zustand stores (`hostStore`, `participantStore`) hold client-side state, updated by socket hooks.

```
Browser                           Cloudflare (production)
  │                                       │
  │  GET https://your-domain.com/host     │
  │──────────────────────────────────────>│  Pages CDN → static HTML + JS
  │<──────────────────────────────────────│
  │                                       │
  │  WS wss://your-domain.com/parties/main/1234
  │──────────────────────────────────────>│  Workers → Durable Object (game.ts)
  │<══════════════════════════════════════│  real-time game events (JSON)
```

---

## Testing & Preview (docs site)

### Docusaurus local preview matching production

Production serves docs at `/docs` (via the Proxy Worker). To preview with the same path locally:

```bash
cd docs-site
npm run build:local   # builds with DOCS_BASE_URL=/docs
npm run serve:docs    # serves at http://localhost:3002/docs
```

> Do **not** open `build/index.html` directly with `file://` when the build used `/docs` — asset paths are absolute and the browser won't find them.

### Preview at root (simpler)

```bash
cd docs-site
npm run build         # builds with DOCS_BASE_URL=/
npx docusaurus serve  # serves at http://localhost:3000/
```

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `http://localhost:3002/docs` refuses connection | Serve script not running | Run `npm run serve:docs` |
| "Your site did not load properly" banner | Opened `build/index.html` with `file://` | Use `npm run serve:docs` instead |
| Session history missing after restart | Expected in dev — DO storage is ephemeral | Use localStorage; no fix needed |
| Participant can't rejoin after `partykit dev` restart | Rejoin tokens in DO storage (in-memory) | Expected; restart the session |
| Session list only shows in one browser | KV not available locally | Expected; localStorage is per-browser |
