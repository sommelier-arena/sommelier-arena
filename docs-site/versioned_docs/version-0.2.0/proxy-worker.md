---
sidebar_position: 10
---

# Proxy Worker

The proxy worker is a Cloudflare Worker that sits in front of the production domain and routes traffic between the frontend and the documentation site.

## What it does

In production, everything runs under a single domain (e.g. `https://sommelier-arena.ducatillon.net`):

- `your-domain.com/*` → Astro frontend (Cloudflare Pages)
- `your-domain.com/docs/*` → Docusaurus documentation site (separate Cloudflare Pages project)

The proxy worker intercepts every request. If the path starts with `/docs/`, it forwards the request to the Docusaurus Pages project. Everything else goes to the Astro Pages frontend.

## Local development — proxy worker NOT needed

In local development, the docs and the app run as separate servers on different ports:

| Service | Local URL |
|---------|-----------|
| App (Mode A: Astro dev) | `http://localhost:4321` |
| App (Mode B: Docker) | `http://localhost:4321` |
| Docs (Docusaurus) | `http://localhost:3002` |

There is no proxy in local development. Navigate to `http://localhost:3002` to view the docs directly. The proxy is **production-only**.

## Environment variable

The proxy worker reads one environment variable:

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCS_ORIGIN` | `https://sommelier-arena-docs.pages.dev` | The origin of the Docusaurus Pages project |

Set this in the Cloudflare dashboard: **Workers & Pages → proxy-worker → Settings → Variables**.

## Deploy

```bash
cd proxy-worker
npx wrangler deploy
```

This deploys the worker to Cloudflare. Make sure you have `wrangler` configured with the correct Cloudflare account.

## Source

The worker source is at `proxy-worker/index.ts`. See `proxy-worker/README.md` for additional details.
