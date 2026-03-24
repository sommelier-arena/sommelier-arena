# Testing & Preview (Local)

This page documents the recommended local workflow for building and previewing the Docusaurus site as it will be deployed under /docs (Cloudflare Pages parity).

Recommended workflow (Option A - parity with production)

1. Build the site with a /docs baseUrl (already wired in this repo's `build:local`):

   cd docs-site
   npm run build:local

   This creates optimized static files in `docs-site/build/` whose asset paths are absolute and start with `/docs/`.

2. Preview the built site mounted at `/docs`:

   npm run serve:docs

   This runs `node scripts/serve-at-docs.js` and serves the build at `http://localhost:3002/docs` so asset paths resolve correctly and the search plugin works.

Notes & Alternatives

- If you prefer to preview at root (`/`) instead, build with `DOCS_BASE_URL=/` and use `npm run serve` (or `docusaurus serve`) to preview at `http://localhost:3002/`.
- Do NOT open `docs-site/build/index.html` directly with file:// when the build used `/docs` — it will show the Docusaurus "Your site did not load properly" banner because asset paths are absolute.

Quick verification

- After running `npm run serve:docs`, open: http://localhost:3002/docs
- Confirm the search box appears and `docs-site/build/search-index-*` files exist.

Troubleshooting

- If `npm run build:local` finishes but `http://localhost:3002/docs` refuses connection, ensure no other process is bound to port 3002 and then run `npm run serve:docs` (the serve script will start a small exact-path server).
- Logs for the local serve are written to `/tmp/serve-docs.log` by the helper script when started via the background convenience command used by the automation here.

Commit history

- This helper `serve:docs` script was added to `docs-site/package.json` and the `docs-site/scripts/serve-at-docs.js` helper was added to make previewing `/docs` effortless and reproducible locally.
