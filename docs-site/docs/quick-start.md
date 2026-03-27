---
id: quick-start
title: Quick Start
sidebar_label: Quick Start
---

# Quick Start

Three development modes depending on what you're testing.

## Prerequisites

- Node.js 20+
- `git clone` the repo and `cd SommelierArena`

## Mode A — Fast daily dev (recommended)

Best for feature work. No Docker needed.

```bash
# Terminal 1 — PartyKit backend (port 1999)
npx partykit dev
```

:::tip No Cloudflare account needed for local dev
`npx partykit dev` runs a **local in-memory simulator** — it emulates Cloudflare Durable Objects entirely on your machine with no internet connection required. Note: Cloudflare KV (`HOSTS_KV`) is not available locally; session history comes from browser localStorage only. See [Configuration & Environments](./configuration.md) for the full comparison.
:::

```bash
# Terminal 2 — Astro frontend (port 4321)
cd front
cp .env.example .env.local # PUBLIC_PARTYKIT_HOST=localhost:1999
npm run dev
```

Open [http://localhost:4321/host](http://localhost:4321/host) (host) and [http://localhost:4321/play](http://localhost:4321/play) (participant).

## Mode B — Full integration (Docker)

Best for E2E tests and nginx/proxy validation.

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend (nginx) | [http://localhost:4321](http://localhost:4321) |
| PartyKit backend | [http://localhost:1999](http://localhost:1999) |
| Docs (Docusaurus) | [http://localhost:3002](http://localhost:3002) |

### Why nginx?

In Mode B, the `front` container runs **nginx** instead of the Astro dev server. nginx is necessary because:

1. **Astro builds to static files** — `npm run build` produces plain HTML/JS/CSS; there's no Node.js server at request time, so something must serve them.
2. **SPA routing** — nginx's `try_files $uri $uri/index.html /index.html` ensures `/host` and `/play` return `index.html` without a 404.
3. **Same-origin WebSocket proxy** — nginx forwards `/parties/*` requests to the PartyKit backend container on port 1999, keeping browser–backend traffic on a single origin (no CORS).

`absolute_redirect off` in `front/nginx.conf` ensures nginx uses relative `Location` headers, so the host port (4321) is never stripped from redirects.

**For daily development, you don't need nginx at all** — Mode A uses Astro's built-in dev server on port 4321, which handles routing and WebSocket proxy natively via `PUBLIC_PARTYKIT_HOST`.

**Alternative:** [Caddy](https://caddyserver.com/) provides equivalent functionality with a simpler config syntax. See [Configuration & Environments](./configuration.md) for the full nginx walkthrough and Caddy comparison.

### Docker cheat sheet

```bash
# Start the full stack
docker-compose up --build -d

# Stop the full stack
docker-compose down

# Rebuild a single service
docker-compose up --build -d front

# View logs
docker-compose logs -f
```

> ⚠️ **Important:** Use `docker-compose down` to stop the running stack. If you started the stack with additional flags or in a different context, ensure you stop the correct compose project instance.

## Mode C — Docs only

```bash
cd docs-site
npm run start:local
# → http://localhost:3002
```

### Docs site — local search & preview

This project uses a local, file-based search plugin for Docusaurus to provide a search box in the docs navbar.

Quick start (dev):

1. Install dependencies:

   ```bash
   cd docs-site
   npm ci
   ```

2. Start the dev server (live reload):

   ```bash
   npm run start:local
   ```

3. Open [http://localhost:3002](http://localhost:3002) and use the search box in the navbar.

Preview built site (parity with production)

This repository standardizes on building the docs for deployment under `/docs` (Cloudflare Pages). To preview the site exactly as production will serve it:

```bash
# Build with DOCS_BASE_URL=/docs
cd docs-site
npm run build:local

# Serve the built site mounted at /docs
npm run serve:docs
# → http://localhost:3002/docs
```

If you prefer to preview the site at root (`/`), build with `DOCS_BASE_URL=/` and use `npm run serve` to open [http://localhost:3002/](http://localhost:3002/).

Notes

- The plugin dependency (@cmfcmf/docusaurus-search-local) is declared in package.json and will be installed by `npm ci`.
- The site configuration in docusaurus.config.ts will load the plugin if installed. If you build the docs inside Docker or CI, `npm ci` in the Dockerfile will ensure the plugin is available at build time.
- If `npm ci` fails in your environment, inspect the npm logs and ensure a network/proxy is configured correctly.
- See the [Configuration & Environments](./configuration.md) page for env var details, nginx explanation, and storage layer breakdown.

## Run tests

```bash
# Frontend unit tests (Vitest + RTL)
cd front && npm test

# E2E tests (requires Mode B Docker stack running)
cd e2e && npm test -- --project=chromium
```

## Environment variables

| Variable | Where | Value |
|----------|-------|-------|
| `PUBLIC_PARTYKIT_HOST` | `front/.env.local` | `localhost:1999` (local) |
| `PUBLIC_PARTYKIT_HOST` | Cloudflare Pages dashboard | `sommelier-arena.USERNAME.partykit.dev` (prod) |

See `front/.env.example` for a template.

> **Note:** Sessions persist in your browser's localStorage. Use the 🗑 button on the Host Dashboard to clean up old sessions.
