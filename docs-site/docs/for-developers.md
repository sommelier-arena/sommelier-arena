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
- [Deployment Guide](./deployment-guide.md) — production deploy, Cloudflare, Wrangler
- [Tech Stack](./tech-stack.md) — technology overview

If you are automating deployments or writing CI, start with the [Deployment Guide](./deployment-guide.md) and the examples in `/.github/workflows/`.

## Running tests

```bash
# Frontend unit tests (Vitest + RTL)
cd front && npm test

# E2E tests — requires Docker stack running first
docker-compose up --build -d
cd e2e && npm test -- --project=chromium
```

E2E test tags: `@smoke` (critical path), `@full` (complete game flow), `@mobile` (iOS layout). Run a specific tag:

```bash
cd e2e && npx playwright test --grep @smoke
```

## Automation / AI entry points

Machine-readable conventions for agents working in this codebase:

- Canonical event shapes: [`event-reference.md`](./event-reference.md) — all WebSocket message types with full TypeScript payload shapes
- Environment config: [`configuration.md`](./configuration.md) — all env vars, all environments, one table
- Deployment steps: [`deployment-guide.md`](./deployment-guide.md) — CLI-first, ordered sequence
- State machine: [`gameplay-workflow.md`](./gameplay-workflow.md) — full phase diagram
- Frontmatter conventions: each doc uses `audience`, `tags`, `id`
