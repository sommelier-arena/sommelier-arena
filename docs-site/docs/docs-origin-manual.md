---
id: docs-origin-manual
title: Docs Pages origin (DOCS_ORIGIN)
sidebar_label: Docs origin setup
---

This short page documents the recommended (manual) approach for setting up the proxy worker's DOCS_ORIGIN value. This is intentionally low-friction: DOCS_ORIGIN is usually a one-shot value (the pages.dev domain created when you first deploy the docs).

Recommended approach — Manual one-shot (lowest complexity)

1. Deploy the Docusaurus docs to Cloudflare Pages (see Deployment doc):
   - Workers & Pages → Create application → Pages → Connect to Git
   - Project name: `sommelier-arena-docs`
   - Root directory: `docs-site`
   - Build command: `npm run build`
   - Output directory: `build`
   - Save and deploy.

2. Copy the Pages URL (pages.dev):
   - After deployment, open the Pages project Overview or Settings → Domains.
   - Copy the default domain, e.g. `https://sommelier-arena-docs.pages.dev`.

3. Set DOCS_ORIGIN in the Worker (one-time):
   Option A (Dashboard):
   - Cloudflare Dashboard → Workers & Pages → Workers → select `sommelier-arena-proxy` → Settings → Variables & Bindings → Add variable:
     - Name: `DOCS_ORIGIN`
     - Value: the pages.dev URL you copied (include protocol)
   - Save. No git changes required.

   Option B (publish with wrangler once):
   - Create a temporary local copy of `proxy-worker/index.ts` and replace the placeholder `DOCS_ORIGIN_PLACEHOLDER` with the Pages URL.
   - Run: `npx wrangler publish temp/proxy-worker/index.ts --name sommelier-arena-proxy`
   - This publishes the worker with the correct DOCS_ORIGIN baked in. Do not commit the temporary file.

Verification
- Open https://sommelier-arena.ducatillon.net/docs and confirm the docs site loads.
- Inspect the worker in Dashboard: Settings → Variables & Bindings should show DOCS_ORIGIN.

Rationale
- DOCS_ORIGIN is rarely changed. A manual one-shot avoids added CI complexity and keeps the deploy footprint minimal.

If you later want an automated or on-demand CI job to update DOCS_ORIGIN, we can add a workflow_dispatch job. For now, the manual approach is preferred.
