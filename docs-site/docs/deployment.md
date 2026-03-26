---
id: deployment
title: Prod Deployment
sidebar_label: Prod Deployment
---

# Prod Deployment

The production stack runs entirely on Cloudflare's free tier.

## Services

| Service | Platform | Deploy command |
|---------|----------|---------------|
| Frontend | Cloudflare Pages (`front/`) | Git push → auto-deploy |
| Backend | PartyKit (Cloudflare Workers) | `npx partykit deploy` |
| Docs | Cloudflare Pages (`docs-site/`) | Git push → auto-deploy |
| Proxy Worker | Cloudflare Workers | Deploy via Wrangler (see below) |

## Step 1 — PartyKit deploy (Backend)

```bash
# From repo root
npx partykit deploy
```

This deploys `back/game.ts` as a Durable Object class to `sommelier-arena.francoiducat.partykit.dev` using the `partykit.json` file.

> **First time**: `npx partykit login` to authenticate with your Cloudflare account.

## Step 2 — Create Cloudflare KV namespace

In the Cloudflare dashboard:
1. Workers & Pages → KV → **Create namespace**
2. Name: `SOMMELIER_HOSTS`
3. Copy the namespace ID
4. Update `partykit.json`:
   ```json
   { "binding": "HOSTS_KV", "id": "YOUR_KV_NAMESPACE_ID" }
   ```
5. Re-deploy PartyKit
```bash
# From repo root
npx partykit deploy
```

## Step 3 — Frontend on Cloudflare Pages

1. Workers & Pages → **Create application** → Pages → Connect to Git
2. Select repository, branch: `main`
3. Build settings:
   - Root directory: `front`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Environment variables:
   - `PUBLIC_PARTYKIT_HOST` = `sommelier-arena.francoiducat.partykit.dev`
5. Deploy

## Step 4 — Docs on Cloudflare Pages

Same as Step 3 but:
- Root directory: `docs-site`
- Build command: `npm run build`
- Output directory: `build`
- Project name: `sommelier-arena-docs`

## Step 5 — Custom domain

In Cloudflare Pages → front/docs project → **Custom domains** → Add domain → `sommelier-arena.ducatillon.net`

## Step 6 — Proxy Worker for /docs route

1. **Create Worker**

Wrangler required.

Recommended (wrangler.toml + deploy):

Create a simple `wrangler.toml` at the repo root:

```toml
name = "sommelier-arena-proxy"
main = "proxy-worker/index.ts"
compatibility_date = "2026-03-24"
```

Then publish from the repo root:

```bash
npx wrangler whoami   # verify auth
# Example deploy with DOCS_ORIGIN set (replace URL with your pages.dev domain):
npx wrangler deploy --var DOCS_ORIGIN=https://sommelier-arena-docs.pages.dev
```

Notes:
- Wrangler will compile TypeScript and bundle dependencies.

After the worker exists:

2. Create the route (Dashboard):
   - Cloudflare Dashboard → Workers → open `sommelier-arena-proxy` → Triggers → Add route:
     - Route: `sommelier-arena.ducatillon.net/docs*`
     - Zone: `ducatillon.net`
   - Save. The route is applied immediately.

3. Verify or add the `DOCS_ORIGIN` environment variable (Dashboard)
   - Cloudflare Dashboard → Workers → select `sommelier-arena-proxy` → Settings → Variables & Bindings → Add:
     - Name: `DOCS_ORIGIN`
     - Value: `https://sommelier-arena-docs.pages.dev`
   - Save.

Verification
- Open https://sommelier-arena.ducatillon.net/docs and confirm the docs site loads.
