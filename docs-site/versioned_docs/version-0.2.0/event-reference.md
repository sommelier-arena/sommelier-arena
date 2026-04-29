---
id: event-reference
title: Event Reference
sidebar_label: Event Reference
---

# Event Reference

All WebSocket messages are JSON objects with a `type` field. The transport is PartySocket (native WebSocket under the hood).

## Client → Server

### `create_session`

Sent by host to create a new session.

```ts
{
  type: 'create_session';
  title?: string;           // optional; falls back to first wine name
  hostId: string;           // e.g. 'TANNIC-FALCON'
  timerSeconds: number;     // 15–120
  wines: Array<{
    name: string;
    questions: Array<{
      category: 'color' | 'country' | 'grape_variety' | 'vintage_year' | 'wine_name';
      correctAnswer: string;
      distractors: [string, string, string];
    }>;
  }>;
}
```

### `update_session`

Sent by host to update wines while the session is in the `waiting` phase (before game starts). Rejected with an error if `phase !== 'waiting'`.

```ts
{
  type: 'update_session';
  title?: string;           // optional; falls back to first wine name
  hostId: string;
  timerSeconds: number;
  wines: Array<{
    name: string;
    questions: Array<{
      category: 'color' | 'country' | 'grape_variety' | 'vintage_year' | 'wine_name';
      correctAnswer: string;
      distractors: [string, string, string];
    }>;
  }>;
}
```

### `join_session`

Sent by participant to join a waiting session.

```ts
{ type: 'join_session'; code: string }
```

### `rejoin_host`

Sent by host on socket open to re-authenticate (after page refresh or reconnect).

```ts
{ type: 'rejoin_host'; hostId: string }
```

### `rejoin_session`

Sent by participant on socket open when a rejoin credential (`id`, `code`) is in localStorage.

```ts
{ type: 'rejoin_session'; pseudonym: string }
```

> **Cross-device rejoin**: open `https://sommelier-arena.ducatillon.net/play?code=X&id=YOUR-PSEUDONYM` on the new device. The `?id=` param restores the credential before the socket opens.

### `host:start` / `host:pause` / `host:resume` / `host:reveal` / `host:next` / `host:end`

Host control events — no additional payload.

```ts
{ type: 'host:start' }
{ type: 'host:pause' }
{ type: 'host:resume' }
{ type: 'host:reveal' }
{ type: 'host:next' }
{ type: 'host:end' }
```

### `submit_answer`

Sent by participant to select or change an answer.

```ts
{ type: 'submit_answer'; questionId: string; optionId: string }
```

---

## Server → Client

### `session:created`

Sent to host after successful `create_session`.

```ts
{ type: 'session:created'; code: string; hostId: string }
```

### `host:session_updated`

Sent to host after a successful `update_session`.

```ts
{
  type: 'host:session_updated';
  wines: Wine[];           // updated wines list
  timerSeconds: number;
  sessionTitle: string;
}
```

### `participant:joined`

Sent to the joining participant.

```ts
{ type: 'participant:joined'; pseudonym: string }
```

### `lobby:updated`

Broadcast to all connected clients when a participant joins or leaves the lobby.

```ts
{ type: 'lobby:updated'; participants: string[] }
```

### `host:state_snapshot`

Sent to host on `rejoin_host` (full current state).

```ts
{
  type: 'host:state_snapshot';
  code: string;
  hostId: string;
  phase: SessionPhase;
  participants: string[];
  question: QuestionPayload | null;
  rankings: RankingEntry[];
}
```

### `participant:state_snapshot`

Sent to participant on `rejoin_session`.

```ts
{
  type: 'participant:state_snapshot';
  pseudonym: string;
  phase: SessionPhase;
  question: QuestionPayload | null;
}
```

### `sessions:list`

Sent to host listing their past and active sessions (sourced from KV).

```ts
{
  type: 'sessions:list';
  sessions: Array<{
    code: string;
    title: string;
    createdAt: string;
    status: 'waiting' | 'active' | 'ended';
    participantCount: number;
    finalRankings?: RankingEntry[];
  }>;
}
```

### `game:question`

Broadcast when a new question starts.

```ts
{
  type: 'game:question';
  questionId: string;
  prompt: string;
  category: QuestionCategory;
  options: Array<{ id: string; text: string }>;   // shuffled; no 'correct' flag
  roundIndex: number;
  questionIndex: number;
  totalQuestions: number;
  totalRounds: number;
  timerMs: number;
}
```

### `game:timer_tick`

Emitted every second during `question_open` and `question_paused`.

```ts
{ type: 'game:timer_tick'; remainingMs: number }
```

### `game:timer_paused` / `game:timer_resumed`

```ts
{ type: 'game:timer_paused'; remainingMs: number }
{ type: 'game:timer_resumed'; remainingMs: number }
```

### `game:participant_answered` (host only)

```ts
{ type: 'game:participant_answered'; answeredCount: number; totalCount: number }
```

### `game:answer_revealed`

Sent to host:

```ts
{
  type: 'game:answer_revealed';
  correctOptionId: string;
  results: Array<{ pseudonym: string; points: number; totalScore: number }>;
}
```

Sent to each participant:

```ts
{
  type: 'game:answer_revealed';
  correctOptionId: string;
  myPoints: number;
  myTotalScore: number;
}
```

### `game:round_leaderboard`

```ts
{
  type: 'game:round_leaderboard';
  rankings: RankingEntry[];
  roundIndex: number;
  totalRounds: number;
}
```

### `game:final_leaderboard`

```ts
{ type: 'game:final_leaderboard'; rankings: RankingEntry[] }
```

### `session:ended`

```ts
{ type: 'session:ended' }
```

### `error`

```ts
{ type: 'error'; message: string; code: string }
```

| `code` | When |
|--------|------|
| `SESSION_NOT_FOUND` | `join_session` sent to a room with no wines (session doesn't exist) |
| `GAME_STARTED` | `join_session` sent after the game has already begun; or `update_session` sent after game has started |
| `SESSION_FULL` | `join_session` when 10 participants already connected |
| `INVALID_PSEUDONYM` | `rejoin_session` with an unknown pseudonym |
| `INVALID_HOST_ID` | `rejoin_host` with a mismatched host ID |
| `SESSION_EXISTS` | `create_session` when a session already exists in this room |
| `NO_WINES` | `create_session` or `update_session` sent with an empty wines array |

---

## Connection / Lifecycle Events

### `server:state_snapshot`

Sent by the backend to **every client** immediately after they connect or reconnect. Contains the current session phase so clients can restore their UI state.

**Direction:** Server → Client  
**Payload:**
```json
{
  "phase": "waiting | question_open | question_paused | question_revealed | round_leaderboard | ended",
  "code": "1234"
}
```

> Participants use this event to detect when a session has ended while they were disconnected. If `phase === "ended"`, the client transitions to the ended state and clears the rejoin credential from localStorage.

---

### `sessions:list`

Sent to the **host** in response to connecting with a host ID. Contains all sessions stored under that host ID.

**Direction:** Server → Host  
**Payload:**
```json
[
  {
    "code": "1234",
    "title": "My Wine Night",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "status": "waiting | ended",
    "participantCount": 3
  }
]
```

---

### `host:state_snapshot`

Sent to a **host** on reconnect to restore their session state.

**Direction:** Server → Host  
**Payload:** Same shape as the full host game state (participants, current question, phase, etc.)

---

### `participant:state_snapshot`

Sent to a **participant** on reconnect to restore their game state.

**Direction:** Server → Participant  
**Payload:** Same shape as the full participant game state (phase, current question, selected option, etc.)

---

## Types

```ts
type QuestionCategory = 'color' | 'country' | 'grape_variety' | 'vintage_year' | 'wine_name';
type SessionPhase = 'waiting' | 'question_open' | 'question_paused' | 'question_revealed' | 'round_leaderboard' | 'ended';

interface RankingEntry {
  pseudonym: string;
  score: number;
  rank: number;
}
```
