---
id: cloudflare-setup
title: Cloudflare Dashboard Setup
sidebar_label: Cloudflare Setup
---

# Cloudflare Dashboard Setup

Step-by-step guide for setting up Sommelier Arena through the Cloudflare web UI. No Wrangler CLI needed (except for initial `partykit deploy`).

---

## 1. Create the KV namespace (precise steps)

Goal: create a Cloudflare KV namespace and bind it to the worker as `HOSTS_KV` so the backend can store cross-session host lists.

Two equivalent ways: (A) Cloudflare Dashboard (GUI) — easiest; (B) Wrangler CLI — scriptable. Choose one.

A) Dashboard (GUI) — recommended
1. Open https://dash.cloudflare.com and sign in to the Cloudflare account that will host the Pages / Workers.
2. Select the account (top-left) and click **Workers & Pages** in the left nav.
3. Click the **KV** tab near the top.
4. Click **Create namespace** (top-right).
5. For the *Name* enter: SOMMELIER_HOSTS and click **Add**.
6. The new namespace will appear in the list. Click it and copy the shown **Namespace ID** value.

B) Wrangler CLI (scriptable)
1. Install wrangler if you don't have it: `npm install -g wrangler` (or use `npx wrangler`).
2. Authenticate: `npx wrangler login` and follow the browser flow.
3. Create the namespace (returns an ID):

   npx wrangler kv:namespace create "SOMMELIER_HOSTS"

   The CLI will print the Namespace ID; copy it.

Bind the namespace to the project

1. The repository contains `partykit.json` committed in the repo. This file should include the KV binding for `HOSTS_KV` with the Namespace ID already populated.

2. Local developers who need to perform a manual deploy (rare) can edit `partykit.json` directly or use a local copy. If you do modify `partykit.json` locally, ensure you intend to commit changes back to the repo.


CI & deploy notes

- This repo uses two GitHub Actions workflows:
  - `docs-ci.yml` — docs-only workflow. Runs when files under `docs-site/**` change. It builds the Docusaurus site and uploads the `docs-site/build` artifact.
  - `app-ci.yml` — app-focused workflow. Responsible for E2E, PartyKit deploy, and Proxy Publication with Wrangler. It is triggered on pushes to `main`.


Example `app-ci.yml` deploy snippet (no template manipulation):

```yaml
- name: Deploy PartyKit
  env:
    CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
  run: |
    npm ci
    npx partykit deploy

- name: Publish proxy worker via Wrangler
  if: ${{ secrets.CF_API_TOKEN != '' }}
  env:
    CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
  run: npx wrangler publish proxy-worker/index.ts --name sommelier-arena-proxy
```

Manual local deploys (rare)

If you must deploy from a local machine, edit `partykit.json` directly in the repo root (or use a local copy) and run:

```bash
cd /path/to/SommelierArena
# edit partykit.json as needed (e.g. set HOSTS_KV id)
npx partykit deploy
```


Where `npx partykit deploy` runs (locally vs CI)

- CI (recommended): The preferred approach is to let `app-ci.yml` perform `npx partykit deploy` in GitHub Actions after tests pass. The app workflow uses `partykit.json`.
- Locally (for manual deploys): Run from the repository root where `partykit.json` lives:

```bash
cd /path/to/SommelierArena
cp partykit.json.template partykit.json
# Edit partykit.json and replace PASTE_NAMESPACE_ID_HERE with your Namespace ID
npx partykit deploy
```

Before running deploy (CI or local)

- Ensure the KV namespace exists (you created it earlier and have its Namespace ID).
- Ensure you are authenticated with Cloudflare locally (`npx wrangler login`) or have a valid `CF_API_TOKEN` stored in GitHub Secrets for CI.

Why this order matters

- The KV namespace must exist before deploy so PartyKit can bind the namespace ID to `HOSTS_KV` during deployment.
- `partykit.json` contains the binding information used by the deploy step. The CI flow injects the Namespace ID into the template at runtime so the repo never contains environment-specific files.

Verification

1. After `npx partykit deploy` succeeds (CI or local), open Cloudflare Dashboard → Workers & Pages → your Worker and confirm the binding `HOSTS_KV` appears under **Settings / Variables & Bindings**.
2. In CI logs you should see the deploy command run; inspect output for binding confirmation or errors.


Troubleshooting

- If `npx partykit deploy` errors with authentication issues, run `npx wrangler login` and retry.
- If you accidentally created the namespace in a different Cloudflare account, delete and recreate it in the intended account, then update `partykit.json` and re-deploy.

Security note

- Do not commit secrets or account tokens to git. The namespace ID is non-secret (safe to commit), but API keys or account tokens must not be committed.

---

## 2. Deploy the frontend to Cloudflare Pages

**Workers & Pages → Create application → Pages**

1. Click **Workers & Pages** → **Create application** → **Pages** tab → **Connect to Git**
2. Authorize Cloudflare to access your GitHub account if prompted
3. Select your repository → click **Begin setup**
4. Configure:
   - **Project name**: `sommelier-arena`
   - **Production branch**: `cloudflare-migration`
   - **Root directory**: `front`
   - **Framework preset**: None (Astro builds to static)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Environment variables (advanced)** → **Add variable**:
   - Variable name: `PUBLIC_PARTYKIT_HOST`
   - Value: `sommelier-arena.USERNAME.partykit.dev` (your PartyKit project URL)
6. Click **Save and Deploy**

---

## 3. Deploy the docs to Cloudflare Pages

Repeat Step 2 with different settings:

- **Project name**: `sommelier-arena-docs`
- **Root directory**: `docs-site`
- **Build command**: `npm run build`
- **Build output directory**: `build`
- No environment variables needed

---

## 4. Add a custom domain

**Cloudflare Pages → sommelier-arena → Custom domains**

1. Click your `sommelier-arena` Pages project
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter: `sommelier-arena.ducatillon.net` → click **Continue**
5. Cloudflare will add the required DNS CNAME automatically (since `ducatillon.net` is already managed on Cloudflare)
6. Wait for **Active** status (usually < 1 minute)

---

## 5. Deploy the proxy Worker — step-by-step (recommended)

This section documents a minimal, repeatable flow to publish the proxy Worker that routes `/docs/*` to the Docusaurus Pages site. Two flows are shown: Manual (wrangler) and CI (non-interactive) — CI (app-ci.yml) is recommended for production.

Prerequisites

- `CF_API_TOKEN` stored in GitHub Secrets (scoped Account token with Workers:Edit and Zones:Edit).
- `CF_HOSTS_NAMESPACE_ID` in GitHub Secrets only if you want CI to inject the KV namespace into `partykit.json` (optional; the worker itself does not need this unless it references KV).
- Cloudflare Account ID and Zone ID (for API route creation; optional if using the Dashboard GUI).
- `proxy-worker/index.ts` present in the repo (it is).

A) Manual (local) publish — using Wrangler (interactive)

1. Authenticate (interactive):

   npx wrangler login

   This opens a browser and authorizes wrangler with your Cloudflare account.

2. Publish the worker script from the repo root:

   cd /path/to/SommelierArena
   npx wrangler publish proxy-worker/index.ts --name sommelier-arena-proxy

   Expected output: success message with the worker name and script URL.

3. Create the route (Dashboard):
   - Cloudflare Dashboard → Workers & Pages → Workers → open `sommelier-arena-proxy` → Triggers → Add route:
     - Route: `sommelier-arena.ducatillon.net/docs*`
     - Zone: `ducatillon.net`
   - Save. The route is applied immediately.

4. Quick verification (browser): open https://sommelier-arena.ducatillon.net/docs and confirm the docs site loads.

B) Non-interactive (CI) publish — recommended for production

Use the `app-ci.yml` workflow to publish the worker automatically after E2E tests pass. The workflow must have `CF_API_TOKEN` in repository secrets.

Example job step (YAML snippet):

```yaml
- name: Publish proxy worker via Wrangler
  if: ${{ secrets.CF_API_TOKEN != '' }}
  env:
    CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
  run: |
    # publish the worker script non-interactively
    npx wrangler publish proxy-worker/index.ts --name sommelier-arena-proxy
```

Notes for CI:
- Wrangler reads `CF_API_TOKEN` from the environment for non-interactive auth. No `npx wrangler login` is needed in CI.
- If you need to create/update routes from CI, use the Cloudflare REST API (requires `CF_API_TOKEN` and `ZONE_ID`) or manage routes in `wrangler.toml` and let `npx wrangler publish` apply them.

C) Programmatic route creation (optional)

Use the Cloudflare REST API to add the `/docs*` route for your zone. Example (replace placeholders):

```bash
CF_API_TOKEN=...
ZONE_ID=ducatillon_net_zone_id
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"pattern":"sommelier-arena.ducatillon.net/docs*","script":"sommelier-arena-proxy"}'
```

You can also automate route creation from CI. Add `CF_ZONE_ID` (the Zone ID for `ducatillon.net`) as a GitHub secret, then add a step to `app-ci.yml` after the worker publish step:

```yaml
- name: Create /docs route (Cloudflare API)
  if: ${{ secrets.CF_API_TOKEN != '' && secrets.CF_ZONE_ID != '' }}
  env:
    CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
    ZONE_ID: ${{ secrets.CF_ZONE_ID }}
  run: |
    set -euo pipefail
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"pattern":"sommelier-arena.ducatillon.net/docs*","script":"sommelier-arena-proxy"}' \
    | jq -r '.success'
    echo "Route creation finished"
```

Notes:
- Secret names used: `CF_API_TOKEN` (already required), `CF_ZONE_ID` (new — set to the Zone ID for `ducatillon.net`).
- If you prefer to manage routes in `wrangler.toml`, `npx wrangler publish` can apply them as well (see Wrangler docs).

D) Verification steps (after publish + route)

1. Browser test: open https://sommelier-arena.ducatillon.net/docs — pages should load and assets must be served.
2. Curl test (checks HTTP 200 and content-type):

```bash
curl -I https://sommelier-arena.ducatillon.net/docs | head -n 10
# Expect: HTTP/2 200, Content-Type: text/html
```

3. Worker logs: Cloudflare Dashboard → Workers → View logs (or use `wrangler tail` with `CF_API_TOKEN` to stream logs locally).

4. CI logs: verify the `npx wrangler publish` step succeeded and API output shows the correct script name.

E) Rollback guidance

- Cloudflare does not expose a one-click "rollback" for Workers. To rollback:
  1. Identify the previous commit/tag that contained the last-known-good worker code.
  2. In CI or locally, `git checkout <good-commit>` and run `npx wrangler publish proxy-worker/index.ts --name sommelier-arena-proxy`.
  3. Alternatively, if using a CI artifact store, republish the saved artifact from the previous successful run.

F) Bindings & Secrets for the Worker

- If the proxy worker requires any KV or other bindings, declare them in `wrangler.toml` or in the Dashboard's **Variables & Bindings** for the worker. Document bindings as needed.

G) Security & minimal perms

- Use a scoped `CF_API_TOKEN` with minimal permissions: Account → Workers Scripts: Edit and Zone → Zone:Edit (or specific zone permissions). Do not use Global API keys in CI.

H) Example troubleshooting checklist

- 403 or 401 on publish → verify `CF_API_TOKEN` permissions and that the token is set in GitHub Secrets.
- 404 on route → verify route pattern (`sommelier-arena.ducatillon.net/docs*`) and that it is attached to `sommelier-arena-proxy`.
- Broken assets / CORS issues → ensure Pages site is accessible directly and worker forwards requests correctly.

---

**Workers & Pages → Create application → Worker**

There are two repeatable ways to deploy the proxy worker from the repository: (A) Cloudflare Dashboard (manual GUI) — already documented above; (B) Wrangler CLI (scriptable). The Wrangler approach is shown here so deployments can be automated from your machine or CI.

Prerequisites (for CLI)

- `wrangler` available via npx (no global install required): npx wrangler
- A Cloudflare API token (recommended) or global API key with permissions to edit Workers and Routes
- Your Cloudflare Account ID (can be found on the Cloudflare dashboard)

A) Publish the worker script with Wrangler (CLI)

1. Authenticate with Cloudflare if not already authenticated:

   npx wrangler login

   This opens a browser to authenticate and grants wrangler access to your account.

2. From the repository root, publish the worker script located at `proxy-worker/index.ts` and give it the name `sommelier-arena-proxy`:

   cd /Users/mac-FDUCAT18/Workspace/FDUCAT/SommelierArena
   npx wrangler publish proxy-worker/index.ts --name sommelier-arena-proxy

   Successful output will include the worker URL and script name.

B) Create a route for the worker (two options)

Option 1 — Dashboard (manual, reliable)
- After publishing, go to Cloudflare Dashboard → Workers & Pages → your Worker → Triggers and add a route with:
  - Route: `sommelier-arena.ducatillon.net/docs*`
  - Zone: `ducatillon.net`

Option 2 — API (scriptable)

- Use the Cloudflare REST API to create a route programmatically. You need:
  - CF_ACCOUNT_ID (your Cloudflare account id)
  - CF_API_TOKEN (a scoped API token with `Workers:Edit` and `Zone:Edit` on the target zone)

Example (replace placeholders):

```bash
# Create a route that sends /docs* to the worker
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token
ZONE_ID=ducatillon_net_zone_id   # find this on Cloudflare dashboard under the domain
WORKER_SCRIPT_NAME=sommelier-arena-proxy

curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"pattern":"sommelier-arena.ducatillon.net/docs*","script":"sommelier-arena-proxy"}'

# Verify the route was created (response.ok === true)
# Example: list routes for the zone and grep for the pattern
curl -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" | jq '.result[] | select(.pattern=="sommelier-arena.ducatillon.net/docs*")'

# If you prefer to bind routes to a Worker via wrangler TOML, you can also manage routes in wrangler.toml and use `npx wrangler publish` from the worker directory. See Wrangler docs for `routes` configuration.
---

## 6. Verify DNS records

**ducatillon.net → DNS**

1. In the Cloudflare dashboard, click `ducatillon.net` in your domain list
2. Click **DNS** → **Records**
3. You should see a CNAME record: `sommelier-arena` → `sommelier-arena.pages.dev`
4. Proxy status should be **Proxied** (orange cloud icon)

---

## 7. Set environment variables in Pages

If you need to update `PUBLIC_PARTYKIT_HOST` after initial deploy:

- How to obtain `PUBLIC_PARTYKIT_HOST` (PartyKit project URL):

  1. Run `npx partykit deploy` from the repository root. The CLI prints a deploy summary that includes the project URL. Example:

     Project 'sommelier-arena' deployed at: https://sommelier-arena.<your-account>.partykit.dev

     You can extract it programmatically in CI or locally:

     npx partykit deploy 2>&1 | grep -Eo 'https?://[^ ]+partykit.dev' | head -n1

  2. Alternatively, open the PartyKit web dashboard for your account and go to Projects → `sommelier-arena` to find the project URL in the project details.

- Once you have the URL, set `PUBLIC_PARTYKIT_HOST` in Pages settings to the hostname only (no trailing slash), e.g. `sommelier-arena.<your-account>.partykit.dev`. Then trigger a redeploy to apply the env var.

1. Pages → `sommelier-arena` → **Settings** → **Environment variables**
2. Click **Add variable** or edit the existing one
3. Save → then go to **Deployments** → click **⋯** next to the latest deploy → **Retry deployment** to apply the new variable

---

## Checklist

- [ ] KV namespace `SOMMELIER_HOSTS` created; ID in `partykit.json`
- [ ] `npx partykit deploy` completed (no errors)
- [ ] Frontend Pages project deployed (`sommelier-arena`)
- [ ] Docs Pages project deployed (`sommelier-arena-docs`)
- [ ] Custom domain `sommelier-arena.ducatillon.net` active (green)
- [ ] Proxy Worker deployed with `/docs*` route
- [ ] `PUBLIC_PARTYKIT_HOST` env var set in Pages to your partykit.dev URL
- [ ] Navigate to `https://sommelier-arena.ducatillon.net/host` — dashboard loads
- [ ] Navigate to `https://sommelier-arena.ducatillon.net/docs` — docs load
