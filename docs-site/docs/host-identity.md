---
id: host-identity
title: Host Identity
sidebar_label: Host Identity
---

# Host Identity

## The `hostId` format

Every host gets a permanent **Adjective+Wine** identifier on first visit — e.g. `TANNIC-FALCON`, `SILKY-BARREL`, `FRUITY-MERLOT`. It is:

- Generated once in the browser via `hostStore.ts`
- Stored in `localStorage` under key `sommelierArena:hostId`
- Preserved across page refreshes on the same device
- Restorable on a different device via the share URL `?id=TANNIC-FALCON`

The vocabulary uses 20 wine-adjacent adjectives × 20 wine-related nouns = **400 unique combinations**.

## How identity is used

| Purpose | Mechanism |
|---------|-----------|
| Host reconnect | `rejoin_host { hostId }` on socket open; server validates against DO storage |
| KV session index | KV key: `host:TANNIC-FALCON` → JSON list of sessions |
| Share link | `https://sommelier-arena.ducatillon.net/host?id=TANNIC-FALCON` |
| Recover on new device | Open share link → `?id=` param sets `hostId` in store + localStorage |

## Session dashboard

When the host opens `/host`, the `HostDashboard` component shows:

- **Active sessions** — status `waiting` or `active`; shows Open button to re-enter the session
- **Past sessions** — status `ended`; shows Results button to view the final leaderboard

This list is populated by `sessions:list` from the server, which reads the KV key for the current `hostId`.

## Participant rejoin

When a participant joins, the server issues rejoin credentials which the frontend stores in localStorage under the key `sommelierArena:rejoin`. These credentials allow the client to re-authenticate automatically if the user reloads the page or briefly loses connection.

On page load, if `sommelierArena:rejoin` exists, the client (`useParticipantSocket`) auto-sends a `rejoin_session` event when the socket opens. The server replies with a `participant:state_snapshot` so the participant is restored to the correct phase and state.

When the session ends (`session:ended`), the frontend clears the `sommelierArena:rejoin` key.
