---
id: overview
title: "Overview"
---

# Overview

Sommelier Arena is a lightweight real-time quiz app for blind wine tasting with friends. A host configures a test (a list of wines) and players join with a 4-digit code. The session is played in real-time: for each wine the host reveals one question at a time, participants answer, and the host reveals the correct answer before moving on.

## Core concepts

- **Session**: a single game instance, identified by a randomly generated 4-digit numeric code (e.g. `4821`). Ephemeral — lives in memory only.
- **Round**: one wine. Each round consists of exactly 4 questions played back-to-back. The leaderboard is shown after all 4 questions in a round are completed, before the next wine begins.
- **Question**: one of the 4 fixed-category questions for a wine (color, country, grape variety, vintage year). The host pre-fills the correct answer and 3 distractors for each.

## Key constraints for MVP

- Max simultaneous players: 10 (strict limit; lobby rejects extra joins)
- No mid-session joins — once the host starts, the lobby is closed
- Sessions are ephemeral (in-memory / client-side state only); no server-side persistence, no export/import
- Hosts have no persistent accounts; the host session is tied to the browser tab that created it
- Exactly 4 questions per wine; categories are fixed (color, country, grape variety, vintage year)
- Timer per question: 60 seconds, fixed (immutable for MVP); resumes from where it was paused on Resume — it does not restart
- Scoring: fixed 100 points per correct answer; 0 points if unanswered or wrong; host cannot change point values
- Answer lock: first tap locks in a participant's answer — it cannot be changed