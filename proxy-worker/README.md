# Proxy Worker

A lightweight Cloudflare Worker that routes `/docs/*` to the Docusaurus Pages project and passes all other traffic through to the main Cloudflare Pages frontend.

## When is this worker needed?

**Production only.** You do **not** need this worker for local development.

| Mode | Docs URL | Worker needed? |
|------|----------|---------------|
| Mode A — local dev (`npx partykit dev` + `npm run dev`) | `http://localhost:3002` (run `cd docs-site && npm start`) | ❌ No |
| Mode B — Docker (`docker-compose up`) | `http://localhost:3002` (separate container) | ❌ No |
| Production — Cloudflare Pages | `https://sommelier-arena.ducatillon.net/docs/` | ✅ Yes |

In local development the docs site runs as its own server on port 3002. The proxy worker is only needed in production to serve both the frontend and the docs under the same domain.

## What the worker does

```
Browser request: GET /docs/quick-start
    ↓
Proxy Worker (running at sommelier-arena.ducatillon.net)
    ↓
Fetches: https://sommelier-arena-docs.pages.dev/docs/quick-start
    ↓
Returns the docs page, rewriting any absolute URLs back to the main domain
```

For all other paths (`/`, `/host`, `/play`, etc.) the worker passes the request through to Cloudflare Pages (the Astro frontend).

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DOCS_ORIGIN` | Origin URL of the Docusaurus Pages project (no trailing slash) | `https://sommelier-arena-docs.pages.dev` |

The default in `wrangler.toml` points to the production docs deployment. Override this in the Cloudflare dashboard if you deploy the docs project under a different name.

## Deployment

### One-time setup (Cloudflare dashboard)

1. Go to **Workers & Pages → Create → Worker**
2. Name it `sommelier-arena-proxy`
3. Deploy (initial blank worker is fine, you'll overwrite it with wrangler)
4. Go to the worker's **Settings → Variables**
5. Add `DOCS_ORIGIN` = `https://YOUR-DOCS-PROJECT.pages.dev` (only if different from the default)
6. Go to **Workers & Pages → sommelier-arena (Pages project) → Custom domains**
   - Make sure `sommelier-arena.ducatillon.net` is set up
7. Go to **Workers & Pages → sommelier-arena-proxy → Triggers → Add route**
   - Route: `sommelier-arena.ducatillon.net/docs*`
   - Zone: `ducatillon.net`

### Deploy via CLI

```bash
cd proxy-worker
npx wrangler deploy
```

This deploys `index.ts` using the config in `wrangler.toml`. Run this whenever you change the worker logic.

### Updating DOCS_ORIGIN after deployment

If you rename the Docusaurus Pages project:

1. Cloudflare dashboard → Workers & Pages → `sommelier-arena-proxy` → Settings → Variables
2. Edit `DOCS_ORIGIN` to the new origin URL
3. Save and redeploy (or re-run `npx wrangler deploy`)
