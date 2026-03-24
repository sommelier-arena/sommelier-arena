---
id: intro
title: Sommelier Arena Docs
sidebar_label: Introduction
slug: /
---

# Sommelier Arena

A real-time blind wine tasting quiz — Kahoot-style, €0/month to host, zero cold starts.

## How it works

A **host** creates a game session with one or more wines. Each wine gets five questions (color, country, grape variety, vintage year, wine name). Participants join via a 4-digit code on their phone, answer live as the host controls the pace, and compete on a leaderboard.

Everything runs on **Cloudflare**: the frontend is a static Astro site on Cloudflare Pages; the game backend is a PartyKit Durable Object (Cloudflare Workers); session lists are stored in Cloudflare KV.

## Quick links

| Doc | What it covers |
|-----|----------------|
| [Quick Start](quick-start) | Run locally in under 2 minutes |
| [Architecture](architecture) | Repo layout, runtime communication, DO lifecycle |
| [Tech Stack](tech-stack) | Stack choices and design principles |
| [Gameplay Workflow](gameplay-workflow) | Phase machine, event flow, answer/scoring rules |
| [Event Reference](event-reference) | All WebSocket message types (client ↔ server) |
| [Host Identity](host-identity) | `TANNIC-FALCON`-style IDs, session dashboard, rejoin |
| [Data Persistence](data-persistence) | DO storage keys, KV schema, what survives a restart |
| [Deployment](deployment) | Cloudflare Pages + PartyKit deploy guide |
| [Cloudflare Setup](cloudflare-setup) | Step-by-step Cloudflare dashboard walkthrough |
| [Contributing & Env](env) | Dev workflow, branch strategy, PR checklist, and environment setup |

## What's new in v2.0 (PartyKit)

- **Zero cost, zero cold starts** — Durable Objects wake on demand
- **Session persistence** — create Monday, resume Wednesday
- **Participant rejoin** — page refresh during a game reconnects automatically
- **Host identity dashboard** — see all your past and active sessions from any device
- **Five questions per wine** — added `wine_name` category
- **Configurable timer** — 15–120 s slider at session creation
- **No-lock answers** — participants can change their answer until the host reveals
- **2 × 2 option grid** — cleaner layout on mobile

- [Quick Start](quick-start) — local dev setup

## Status

MVP spec finalised. All conflicts resolved, all gaps filled.
