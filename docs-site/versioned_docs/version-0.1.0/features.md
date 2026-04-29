---
id: features
title: "Features (MVP)"
---

# Features (MVP)

## Host: test creation

- Host creates a session and adds wines (rounds). Each wine has a name and exactly 4 questions — one per fixed category: **color**, **country**, **grape variety**, **vintage year**.
- For each question the host fills in the correct answer and 3 distractor options (4 choices total).
- No minimum wine count is enforced, but a session with zero wines cannot be started.
- The session is assigned a randomly generated 4-digit numeric code (e.g. `4821`) at creation time. Collisions are resolved by regenerating until a unique code is found.

## Host dashboard

Controls available to the host during a session:

| Control | Behaviour |
|---|---|
| **Start** | Opens the session; participants can join via code. Lobby is closed once host starts the first round. |
| **Pause** | Freezes the question timer and prevents participants from submitting answers. |
| **Resume** | Unfreezes the timer from exactly where it was paused (remaining seconds are preserved). |
| **Reveal Answer** | Closes answering for the current question (if timer has not yet expired), highlights the correct option for all participants, and shows per-question score deltas. Host must trigger this manually — it does not fire automatically. |
| **Next** | Advances to the next question in the current round, or — after the final question's answer is revealed — shows the round leaderboard and then moves to the next wine. Disabled until the current question's answer has been revealed. |
| **End** | Terminates the session immediately from any state. All participants are pushed to the final leaderboard screen. |

The host sees a live list of which participants have answered (without revealing their choices) so they know when everyone is done.

## Lobby

- Participants join by entering the 4-digit code and are assigned a generated pseudonym (random adjective–wine-noun pair, e.g. `TannicFalcon`).
- Pseudonyms are unique within a session; the app regenerates on collision.
- No custom names — generated pseudonyms only.
- The lobby rejects joins once 10 players are connected or once the first round has started, whichever comes first.

## Real-time play (per question)

1. Host hits **Next** (or **Start** for the first question) → question + 4 answer options are broadcast to all participants simultaneously.
2. Answer options are displayed in the same fixed order for every participant (no per-player shuffling).
3. Participants tap an option → **first tap locks the answer**, no changes allowed.
4. The 60-second timer counts down. When it reaches 0, answering closes automatically (equivalent to the host triggering Reveal Answer, but the host can also trigger it earlier).
5. Host hits **Reveal Answer** → correct option is highlighted for everyone; participants who answered correctly see +100 pts.
6. Host hits **Next** → moves to the next question, or to the round leaderboard if all 4 questions are done.

## Timer

- Fixed at 60 seconds per question.
- **Pause** freezes the countdown; **Resume** continues from the frozen value.
- Participants who have not answered when the timer expires receive 0 points for that question. No penalty beyond 0.
- Late submissions (in-flight at the exact moment the timer hits 0) are accepted if they arrive at the server before the server-side close event is processed.

## Scoring & leaderboard

- 100 points for a correct answer, 0 for wrong or unanswered — host cannot modify these values.
- A **per-question score delta** is shown to participants immediately after answer reveal.
- A **round leaderboard** (all participants ranked by cumulative score) is shown after all 4 questions of a wine are completed, before the next round begins. The host advances past it with **Next**.
- A **final leaderboard** is shown to all participants when the host hits **End**. It persists on-screen until the participant closes the tab.

## Connection & session lifecycle

- Participants who disconnect cannot rejoin — their pseudonym and score are retained in the leaderboard but they receive no further questions.
- If the host closes the browser tab, the session ends immediately and cannot be resumed. Participants are shown a "session ended" message.
- No accounts, no login — minimal friction for quick local games.

## Persistence

- Ephemeral only: Zustand/localStorage client-side state. No server-side persistence.
- No session export or import for MVP.