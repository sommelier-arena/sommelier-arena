---
id: database-model
title: "Database / Persistence Model"
---

# Database / Persistence Model

This diagram documents the entities used if persistence is ever added. For the ephemeral MVP these exist only in-memory on the backend.

## Clarifications

- A **round** corresponds to one `WINE`. The `current_round` field on `SESSION` is the index of the wine currently being played.
- Each `WINE` always has exactly 4 `QUESTION` rows, one per fixed category: `color`, `country`, `grape_variety`, `vintage_year`.
- Each `QUESTION` always has exactly 4 `ANSWER_OPTION` rows (1 correct, 3 distractors). Options are stored and delivered in the order the host entered them — no per-player shuffling.
- `PARTICIPANT.score` is the running cumulative total (incremented by 100 per correct answer).
- `RESPONSE` is only created when a participant actually submits an answer. No response row = 0 points for that question (no penalty record is needed).
- `SESSION.code` is a 4-digit numeric string (e.g. `"4821"`), randomly generated and unique among active sessions at creation time.

## ER Diagram

```mermaid
erDiagram
    SESSION ||--o{ WINE : contains
    SESSION ||--o{ PARTICIPANT : has
    WINE ||--o{ QUESTION : has
    QUESTION ||--o{ ANSWER_OPTION : has
    PARTICIPANT ||--o{ RESPONSE : gives
    QUESTION ||--o{ RESPONSE : receives

    SESSION {
      string id PK
      string code "4-digit numeric, unique among active sessions"
      string title
      string state "waiting | active | paused | ended"
      int current_round "index of the wine currently in play (0-based)"
      int current_question "index within the current wine's 4 questions (0-3)"
      int max_players "fixed at 10"
      datetime created_at
    }
    WINE {
      string id PK
      string session_id FK
      string name
      int position "1-based display order"
    }
    QUESTION {
      string id PK
      string wine_id FK
      string category "color | country | grape_variety | vintage_year"
      int position "1-4, matches fixed category order"
      string prompt "e.g. What is the color of this wine?"
      int timer_remaining_ms "countdown state when paused; null if not paused"
    }
    ANSWER_OPTION {
      string id PK
      string question_id FK
      string text
      boolean correct
      int position "display order, same for all participants"
    }
    PARTICIPANT {
      string id PK
      string session_id FK
      string pseudonym "generated; unique within session"
      int score "cumulative; incremented by 100 per correct answer"
      boolean connected
    }
    RESPONSE {
      string id PK
      string participant_id FK
      string question_id FK
      string answer_option_id FK
      datetime answered_at
      boolean correct
      int points_awarded "100 if correct, 0 otherwise"
    }
```