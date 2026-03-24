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

1. Open the repo root and edit the file `partykit.json` (path: /Users/mac-FDUCAT18/Workspace/FDUCAT/SommelierArena/partykit.json).
2. Locate the `bindings` array (or the section where KV bindings are declared) and add or replace an entry so it looks like this (exact JSON fragment):

```json
{
  "binding": "HOSTS_KV",
  "id": "PASTE_NAMESPACE_ID_HERE"
}
```

3. Save the file.

Important: where to run `npx partykit deploy`

- Run this from the repository root (the directory that contains `partykit.json`). Example:

  cd /Users/mac-FDUCAT18/Workspace/FDUCAT/SommelierArena
  npx partykit deploy

- Before running `npx partykit deploy` make sure you are authenticated with Cloudflare (run `npx wrangler login` if you haven't already) and that the account has permission to publish Workers/Pages.

Why this order matters

- The KV namespace must exist before deploy so the deployment tool can create a binding with the correct namespace ID.
- PartyKit/partykit.json contains the binding configuration that the deploy step uses to associate `HOSTS_KV` with your namespace.

Verification

1. After `npx partykit deploy` succeeds, open Cloudflare Dashboard → Workers & Pages → your Worker and confirm the binding `HOSTS_KV` appears under **Settings / Variables & Bindings** (or similar). It should list the Namespace ID you pasted.
2. In the repo you can also inspect the built worker metadata (if printed by the deploy command) to confirm bindings.

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

## 5. Deploy the proxy Worker

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
