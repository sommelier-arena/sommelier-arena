---
id: intro
title: Sommelier Arena Docs
sidebar_label: Introduction
slug: /
---

# Sommelier Arena

A real-time blind wine tasting quiz — Kahoot-style, €0/month to host, zero cold starts.

## How it works

A **host** creates a game session with one or more wines. Each wine gets five questions (color, country, grape variety, vintage year, wine name). **Participants** join via a 4-digit code on their phone, answer live as the host controls the pace, and compete on a leaderboard.

Everything runs on **Cloudflare**: the frontend is a static Astro site on Cloudflare Pages; the game backend is a PartyKit Durable Object (Cloudflare Workers); session lists are stored in Cloudflare KV.

## Core concepts

- **Session** — a single game instance, identified by a randomly generated 4-digit numeric code (e.g. `4821`).
- **Round** — one wine. Each round has exactly 5 questions played back-to-back. The leaderboard is shown after all 5 questions, before the next wine begins.
- **Question** — one of the 5 fixed-category questions for a wine: `color`, `country`, `grape_variety`, `vintage_year`, `wine_name`. The host pre-fills the correct answer and 3 distractors.

## Key rules

| Rule | Value |
|------|-------|
| Max players | 10 (lobby rejects extra joins) |
| Questions per wine | 5 (fixed categories) |
| Timer per question | Configurable 15–120 s (default 60 s) |
| Scoring | 100 pts correct · 0 pts wrong/unanswered |
| Answer changing | Allowed until host reveals — no first-tap lock |
| Mid-session joins | Not allowed once first round starts |
| Persistence | DO storage (SQLite) in production; in-memory in local dev |

## What's new in v2.0 (PartyKit)

- **Zero cost, zero cold starts** — Durable Objects wake on demand
- **Session persistence** — create Monday, resume Wednesday
- **Participant rejoin** — page refresh or URL (`/play?code=X&id=PSEUDONYM`) reconnects automatically, even from a different device
- **Host identity dashboard** — see all your past and active sessions from any device
- **Five questions per wine** — added `wine_name` category
- **Configurable timer** — 15–120 s slider at session creation
- **No-lock answers** — participants can change their answer until the host reveals
- **2 × 2 option grid** — cleaner layout on mobile

## Who are you?

| I am… | Start here |
|-------|-----------|
| A **developer** setting up locally | [Quick Start](quick-start.md) |
| A **developer** understanding the system | [Architecture](architecture.md) · [Tech Stack](tech-stack.md) |
| A **product person / user** | [Features](features.md) · [Gameplay Workflow](gameplay-workflow.md) |
| **Deploying** to Cloudflare | [Deployment Guide](deployment-guide.md) |
| An **automation agent / AI** | [For Automation](for-automation.md) |

## Quick reference

| Doc | What it covers |
|-----|----------------|
| [Quick Start](quick-start.md) | Run locally in under 2 minutes |
| [Architecture](architecture.md) | Repo layout, runtime communication, DO lifecycle |
| [Tech Stack](tech-stack.md) | Stack choices and design principles |
| [Gameplay Workflow](gameplay-workflow.md) | Phase machine, event flow, answer/scoring rules |
| [Event Reference](event-reference.md) | All WebSocket message types (client ↔ server) |
| [Host & Participant Identity](host-and-participant-identity.md) | `TANNIC-FALCON`-style IDs, session dashboard, rejoin for host and participant |
| [Data Persistence](data-persistence.md) | DO storage keys, KV schema, what survives a restart |
| [Deployment Guide](deployment-guide.md) | Cloudflare Pages + PartyKit + Wrangler deploy |
| [Configuration & Environments](configuration.md) | Env vars, local vs prod, nginx explanation, testing preview |
