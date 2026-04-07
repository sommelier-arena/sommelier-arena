---
id: for-developers
title: For Developers
sidebar_label: For Developers
audience: developer
tags: [onboarding, dev, setup]
---

# For Developers

This page is the developer entrypoint. It links to quick start, local vs prod, testing, architecture, and deployment guides.

## Services overview

| Service | Directory | Port | Description |
|---------|-----------|------|-------------|
| PartyKit backend | `back/` | 1999 | Real-time game state (Durable Object) |
| Astro frontend | `front/` | 4321 | Static site + React islands |
| Wine Answers Worker | `wine-answers-worker/` | 1998 | Curated answer suggestions API (KV-backed) |
| Docusaurus docs | `docs-site/` | 3002 | Documentation site |
| Proxy Worker | `proxy-worker/` | — | Routes `/docs/*` to docs Pages (production only) |

Useful links:

- [Quick Start](./quick-start.md) — local development modes (fast dev, docker, docs preview)
- [Configuration & Environments](./configuration.md) — environment differences, env vars, nginx explanation, testing & preview
- [Architecture](./architecture.md) — system architecture and diagrams
- [Deployment & Deploy](./deployment-guide.md) — production deploy, Cloudflare, Wrangler
- [Tech Stack](./tech-stack.md) — technology overview

If you are automating deployments or writing CI, start with the Deployment & Deploy guide and the examples in `/.github/workflows/`.
