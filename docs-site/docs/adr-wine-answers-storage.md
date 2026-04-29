---
id: adr-wine-answers-storage
title: "ADR: Wine Answers Storage"
sidebar_label: "ADR: Wine Answers Storage"
---

# ADR: Wine Answers Collection Storage

## Status

Accepted

## Context

Sommelier Arena is a real-time blind wine tasting quiz. The existing infrastructure uses **Cloudflare Durable Objects** (via PartyKit) to manage game sessions — each session is a stateful room with its own lifecycle, real-time WebSocket connections, and an in-memory state machine (`SessionPhase`). A **Cloudflare KV** namespace (`SOMMELIER_HOSTS`) was initially used as a lightweight host session index, but that binding has since been removed (free-plan incompatibility — see [Data Persistence](./data-persistence.md#cloudflare-kv--hosts_kv-disabled)); session history is now localStorage-only.

A new feature introduces a **shared wine answer collection**: reference data that hosts browse and select from when building tastings. The dataset spans five categories — color, region, grape variety, vintage year, and wine name — totalling roughly 200 entries. The data characteristics are fundamentally different from game session state:

| Characteristic | Game sessions | Wine answers |
|---|---|---|
| Access pattern | Per-room, real-time | Global, shared across all users |
| Read/write ratio | Balanced (constant mutations) | Heavily read, rarely written |
| Consistency need | Strong (turn-based state machine) | Eventual is acceptable |
| Lifecycle | Ephemeral (created, played, ended) | Long-lived reference data |
| Concurrency model | Single-writer per room (DO) | Many readers, very infrequent writers |

The project follows a **zero-cost philosophy**, staying within Cloudflare's free tier. Any storage decision must respect this constraint.

## Decision

Use **Cloudflare KV** via a dedicated stateless Worker (`wine-answers-worker/`) to store and serve the wine answer collection. Each category is stored as a single KV key (e.g., `answers:color`, `answers:region`) containing a JSON array of answer entries.

The Worker exposes a simple REST API for CRUD operations. All reads are stateless KV lookups with no Durable Object involvement. Writes use a read-modify-write pattern against KV.

## Alternatives Considered

### 1. Pure Cloudflare KV (chosen)

**Pros:**

- **Designed for this access pattern.** KV is purpose-built for read-heavy, write-light workloads — exactly what wine answer collections are.
- **No wake overhead.** KV reads are simple key lookups at the edge. There is no Durable Object to wake, no alarm to schedule, no WebSocket to establish.
- **Stateless Worker.** The `wine-answers-worker/` is a thin stateless layer. It scales horizontally with zero coordination, and each request is independent.
- **Free tier friendly.** KV's free tier (100,000 reads/day, 1,000 writes/day) far exceeds the expected load for ~200 reference entries read by hosts during tasting setup.
- **Simple mental model.** Reference data lives in KV; real-time game state lives in DOs. The separation maps cleanly to the data's nature.

**Cons:**

- **Eventual consistency.** KV propagation to edge locations can take up to 60 seconds. A newly added answer may not appear instantly in all regions.
- **No CAS (compare-and-swap) operations.** Concurrent writes use read-modify-write, which is not atomic. Two simultaneous writes to the same category could cause one to be lost.

### 2. Durable Object (dedicated singleton)

A single globally-addressable DO would own all wine answer data, providing strong consistency through its single-writer model.

**Pros:**

- **Strong consistency.** The DO's single-threaded execution model guarantees serialised writes — no lost updates, no race conditions.
- **Atomic operations.** Reads and writes within a single DO request are transactional against its storage.
- **Existing pattern.** The project already uses DOs via PartyKit, so the deployment infrastructure is in place.

**Cons:**

- **DO wake cost for every read.** Unlike game sessions where the DO is already awake (players are connected via WebSocket), a wine-answers DO would need to wake from cold storage for each HTTP read. This adds latency to what should be a simple lookup.
- **Architectural mismatch.** The existing DOs are per-session rooms — ephemeral, multiplayer, event-driven. A singleton reference-data DO is a fundamentally different pattern that muddies the architecture.
- **Over-provisioned consistency.** Strong consistency is critical for a game state machine where a missed transition corrupts the session. For reference data that changes a few times per month, it is unnecessary overhead.
- **Single point of coordination.** All reads worldwide would route to the single DO's location, defeating edge distribution.

### 3. Hybrid (DO writes, KV reads)

Writes go through a singleton DO for atomicity; the DO then pushes the updated state to KV for fast edge reads.

**Pros:**

- **Best of both worlds.** Strong write consistency from the DO, fast distributed reads from KV.
- **No race conditions.** The DO serialises all mutations before propagating to KV.

**Cons:**

- **Double complexity.** Two storage systems for one dataset, with synchronisation logic between them.
- **Over-engineered.** The write frequency (an admin adding a handful of entries, or a host adding a custom answer during setup) does not justify a consistency pipeline.
- **Additional failure modes.** The DO-to-KV sync introduces a window where KV is stale *and* a new failure path if the sync itself fails.

## Consequences

### Accepted trade-offs

The **KV race condition on concurrent writes** is explicitly accepted. The write scenarios are:

1. **Admin seeding/updating reference data** — a single operator, no concurrency.
2. **Host adding a custom answer during tasting setup** — low frequency, and two hosts simultaneously adding to the same category is extremely unlikely.

**Worst case:** if two writes collide, one entry is silently lost. The admin dashboard provides full visibility into the stored answers, making detection trivial and re-adding the entry a one-click operation. This is an acceptable trade-off given the write frequency.

### Architectural clarity

This decision reinforces a clean separation in the system:

- **Durable Objects** own **ephemeral, real-time, per-session state** — the game rooms where strong consistency and WebSocket presence matter.
- **Cloudflare KV** owns **long-lived, shared, read-heavy reference data** — the wine answer collections. (The host session index was originally also in KV but the binding was removed; session history is now localStorage-only.)

Each storage technology is used for what it was designed for.

### Cost

KV operations stay well within the free tier. With ~200 entries across 5 categories, even aggressive host browsing during tasting setup produces negligible read volume. Write volume is near-zero in steady state.

## Local Development

`wrangler dev --local` runs the `wine-answers-worker/` against **Miniflare**, which simulates Cloudflare KV using local file-based persistence at `.wrangler/state/`. This provides:

- **Full CRUD parity** with production — the same Worker code, the same KV API, the same request/response shapes.
- **Persistent local state** across restarts, so seeded answers survive `wrangler dev` re-launches.
- **No cloud dependency** for development — the entire stack (PartyKit dev server + Astro dev server + wine-answers Worker) runs locally without network calls to Cloudflare.

The Docker Compose stack can optionally include the Worker for E2E testing against a fully integrated local environment.
