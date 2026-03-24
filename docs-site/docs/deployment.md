---
id: deployment
title: Deployment
sidebar_label: Deployment
---

# Deployment

The production stack runs entirely on Cloudflare's free tier. No servers to manage.

## Services

| Service | Platform | Deploy command |
|---------|----------|---------------|
| Frontend | Cloudflare Pages (`front/`) | Git push → auto-deploy |
| Backend | PartyKit (Cloudflare Workers) | `npx partykit deploy` |
| Docs | Cloudflare Pages (`docs-site/`) | Git push → auto-deploy |
| Proxy Worker | Cloudflare Workers | Deploy via Wrangler (see below) |

## Step 1 — PartyKit deploy

```bash
# From repo root
npx partykit deploy
```

This deploys `back/game.ts` as a Durable Object class to `sommelier-arena.USERNAME.partykit.dev`.

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

## Step 3 — Frontend on Cloudflare Pages

1. Workers & Pages → **Create application** → Pages → Connect to Git
2. Select repository, branch: `cloudflare-migration`
3. Build settings:
   - Root directory: `front`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Environment variables:
   - `PUBLIC_PARTYKIT_HOST` = `sommelier-arena.USERNAME.partykit.dev`
5. Deploy

## Step 4 — Docs on Cloudflare Pages

Same as Step 3 but:
- Root directory: `docs-site`
- Build command: `npm run build`
- Output directory: `build`
- Project name: `sommelier-arena-docs`

## Step 5 — Custom domain

In Cloudflare Pages → your front project → **Custom domains** → Add domain → `sommelier-arena.ducatillon.net`

## Step 6 — Proxy Worker for /docs route

1. Workers & Pages → **Create Worker**

Wrangler (required for TypeScript / reproducible builds)

- The Cloudflare Dashboard editor cannot build or publish TypeScript worker projects. To publish the repo's TypeScript worker (`proxy-worker/index.ts`) use Wrangler.

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
- If you insist on using the Dashboard editor, compile/bundle the worker to plain JS locally and paste the compiled JS into the Dashboard editor (not recommended).

After the worker exists:

3. Create the route (Dashboard):
   - Cloudflare Dashboard → Workers & Pages → Workers → open `sommelier-arena-proxy` → Triggers → Add route:
     - Route: `sommelier-arena.ducatillon.net/docs*`
     - Zone: `ducatillon.net`
   - Save. The route is applied immediately.

4. Set the `DOCS_ORIGIN` environment variable (one-time):
   - Dashboard → Workers → select `sommelier-arena-proxy` → Settings → Variables & Bindings → Add:
     - Name: `DOCS_ORIGIN`
     - Value: `https://sommelier-arena-docs.pages.dev`
   - Save.

Verification
- Open https://sommelier-arena.ducatillon.net/docs and confirm the docs site loads.

Notes and CI recommendation:
- `DOCS_ORIGIN` must match the Pages project you deployed in Step 4. The Pages default domain is `https://<project-name>.pages.dev` once created and deployed.
- Recommended: do not hard-code `DOCS_ORIGIN` in `proxy-worker/index.ts`. Instead capture the Pages URL in CI after docs deploy and publish the worker with `DOCS_ORIGIN` injected (or set as a worker environment variable). This makes deployments reproducible and avoids manual edits.
- Manual quick fix: deploy the docs Pages project, copy the pages.dev URL, then publish the worker and set `DOCS_ORIGIN` via the Dashboard (Worker settings → Variables & Bindings) or by editing `proxy-worker/index.ts` then running `npx wrangler deploy`.


The proxy worker also routes `/docs/*` to the Docusaurus Pages project, keeping everything under one domain. See [Proxy Worker](proxy-worker) for full details.

> See [Cloudflare Setup](cloudflare-setup) for a step-by-step dashboard walkthrough with UI labels.

## Rollback

Cloudflare Pages keeps deployment history. Roll back via dashboard → Deployments → select older deployment → **Rollback to this deployment**.

For PartyKit, there is no built-in rollback — redeploy the previous git commit.
