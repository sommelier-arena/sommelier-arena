---
id: for-product
title: For Product, Users & Partners
sidebar_label: For Product & Users
audience: product
tags: [overview, user-guide, partners]
---

# For Product, Users & Partners

## End users

Sommelier Arena is a browser-based blind wine tasting game. No app to install, no account to create.

**To participate in a session:**
1. Open the app on your phone at `https://sommelier-arena.ducatillon.net/play`
2. Enter the 4-digit code the host gives you — you'll get a generated wine-themed pseudonym
3. Answer each question before the timer runs out; you can change your answer any time until the host reveals it
4. See the leaderboard after each wine and at the end

**To host a session:**
1. Open `https://sommelier-arena.ducatillon.net/host`
2. Create a test by entering wine names and their questions (color, country, grape variety, vintage year, wine name) with one correct answer and 3 distractors each
3. Share the 4-digit code with participants; hit **Start** to begin the game
4. Use **Pause / Resume / Reveal / Next / End** to control the pace

## Product overview

Key links:

- [Features](./features.md) — full feature specification with host controls and question flow
- [Gameplay Workflow](./gameplay-workflow.md) — session state machine and scoring rules
- [Features & User Stories](./features.md) — host and participant stories, edge cases
- [Overview & Rules](/) — key constraints and what's new

## For partners & investors

**Hosting model:** Sommelier Arena runs on Cloudflare's free tier — no servers to manage, no cold starts, €0/month for a casual dinner-party app.

| Concern | Answer |
|---------|--------|
| Hosting cost | Free (Cloudflare Workers + Pages free tier) |
| Max concurrent players | 10 per session |
| Availability | 99.9%+ (Cloudflare global edge) |
| Data storage | Per-session in Cloudflare Durable Objects (SQLite); no external DB |
| Custom domain | Yes — `sommelier-arena.ducatillon.net` on Cloudflare |
| Integration points | WebSocket event API (see [Event Reference](./event-reference.md)) |

For technical details see [Tech Stack](./tech-stack.md) and [Deployment Guide](./deployment-guide.md).
