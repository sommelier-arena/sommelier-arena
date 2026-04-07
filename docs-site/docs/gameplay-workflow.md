---
id: gameplay-workflow
title: Gameplay Workflow
sidebar_label: Gameplay Workflow
---

# Gameplay Workflow

## Phase state machine

```
waiting
  │  host:start
  ▼
question_open ◄──── host:resume
  │                      ▲
  │ host:pause           │
  ▼                      │
question_paused ─────────┘
  │
  │ host:reveal (or timer alarm)
  ▼
question_revealed
  │
  │ host:next
  ▼
question_leaderboard       (after every question)
  │
  │ host:next
  ▼
question_open              (next question in same round) OR
round_leaderboard          (after last question in a round)
  │
  │ host:next
  ▼
question_open              (next round) OR
ended                      (after final round)
```

## Session creation

The host fills in `SessionForm`:

- **Title** — optional display name for the tasting (shown in session list). If left blank, the first wine's name is used.
- **Wines** — one or more wines; each wine gets **5 questions** (one per category, fixed order: `color`, `region`, `grape_variety`, `vintage_year`, `wine_name`)
- **Correct answer** — always blank; host fills in
- **Distractors** — 3 per question; pre-filled for most categories (grape_variety is empty)
- **Timer** — range slider 15–120 s (default 60 s); applies to all questions

## Session edition (edit before game starts)

While the session is in the **waiting** phase (lobby), the host can click **✏️ Edit Wines** to return to the form pre-filled. Submitting the form sends `update_session` to the backend, which replaces `ctx.wines`, saves state, and responds with `host:session_updated`. The host is returned to the lobby. Edition is blocked once the game has started (`phase !== 'waiting'`).

## Scoring

| Outcome | Points |
|---------|--------|
| Correct answer | **100** |
| Wrong answer | **0** |
| No answer (timer expires) | **0** |

Points are awarded at `host:reveal`. There is no speed bonus.

## Answer changing

Participants can change their selected option at any time until the host clicks **Reveal**. The backend overwrites the answer on each `submit_answer` message. `answeredCount` (shown to host) increments only on a participant's **first** answer per question.

## Timer behaviour

- Timer starts when the question is broadcast (not when `host:start` fires)
- Host can **Pause** and **Resume** any time during `question_open`
- Timer expiry (`alarm()`) automatically triggers reveal (same as `host:reveal`)
- `game:timer_tick` is emitted every second to all connected clients

## Round leaderboard

After the last question of each wine (5th question), the server emits `game:round_leaderboard` instead of proceeding to the next question. After the final wine's last question, it emits `game:final_leaderboard` and transitions to `ended`.

## Host disconnect / reconnect

If the host disconnects (browser close, network loss), the game enters a **1-hour grace period**. Participants remain connected and see a waiting state. If the host reconnects within the grace period, the game resumes from where it left off. If the grace period expires without the host returning, the session ends automatically and participants are notified.

## Session end

Host clicks **End Session** at any time OR the game completes all questions. On end:

1. Final rankings are written to KV (`host:{hostId}` key, `finalRankings` field of the matching session entry)
2. All clients receive `session:ended`
3. Phase transitions to `ended`
