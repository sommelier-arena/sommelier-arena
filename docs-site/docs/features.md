---
id: features
title: Features
sidebar_label: Features
---

# Features

## Host

- Host creates a session and adds wines (rounds). Each wine has a name and exactly 5 questions — one per fixed category: **color**, **country**, **grape variety**, **vintage year**, **wine name**.
- For each question the host fills in the correct answer and 3 distractor options (4 choices total).
- No minimum wine count is enforced, but a session with zero wines cannot be started.
- The session is assigned a randomly generated 4-digit numeric code (e.g. `4821`) at creation time. Collisions are resolved by regenerating until a unique code is found.

## Participant

- Participants join from any browser by navigating to the `/play` page and entering the 4-digit session code.
- Each participant is assigned a **generated pseudonym** (`ADJECTIVE-NOUN` pair in uppercase, e.g. `TANNIC-FALCON`). No custom names — generated pseudonyms only.
- Pseudonyms are unique within a session; the app regenerates on collision.
- The lobby rejects joins once **10 players** are connected or once the first round has started, whichever comes first.
- During a question, participants see all 4 answer options simultaneously and tap to select. They can **change their answer any time** until the host clicks Reveal Answer — there is no first-tap lock.
- After each answer reveal, participants see an immediate **score delta** (+100 or 0) on screen.
- After each wine, participants see a **round leaderboard** ranking all players by cumulative score.
- When the host ends the session, participants are shown the **final leaderboard**, which persists until they close the tab.
- Participants can **rejoin** from the same browser automatically (credential stored in localStorage). From a different device, open the URL in the address bar after joining (`/play?code=X&id=YOUR-PSEUDONYM`); without `?id=` a fresh pseudonym is assigned.

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

## Real-time play (per question)

1. Host hits **Next** (or **Start** for the first question) → question + 4 answer options are broadcast to all participants simultaneously.
2. Answer options are displayed in the same fixed order for every participant (no per-player shuffling).
3. Participants tap an option to select it. They can **change their answer any time** until the host clicks **Reveal Answer** — there is no first-tap lock.
4. A configurable timer (15–120 s, default 60 s) counts down. When it reaches 0, answering closes automatically (equivalent to the host triggering Reveal Answer, but the host can also trigger it earlier).
5. Host hits **Reveal Answer** → correct option is highlighted for everyone; participants who answered correctly see +100 pts.
6. Host hits **Next** → moves to the next question, or to the round leaderboard if all 5 questions are done.

## Timer

- Configurable per session: 15–120 seconds (slider at session creation; default 60 s).
- **Pause** freezes the countdown; **Resume** continues from exactly where it was paused.
- Participants who have not answered when the timer expires receive 0 points for that question. No penalty beyond 0.
- Timer expiry fires an alarm on the server (`room.setAlarm`) — the reveal happens server-side even if the host's browser is closed.
- Late submissions (in-flight at the exact moment the timer fires) are accepted if they arrive before the server processes the alarm.

## Scoring & leaderboard

- 100 points for a correct answer, 0 for wrong or unanswered — host cannot modify these values.
- A **per-question score delta** is shown to participants immediately after answer reveal.
- A **round leaderboard** (all participants ranked by cumulative score) is shown after all 5 questions of a wine are completed, before the next round begins. The host advances past it with **Next**.
- A **final leaderboard** is shown to all participants when the host hits **End**. It persists on-screen until the participant closes the tab.

## Connection & session lifecycle

- Participants can **rejoin** from the same browser automatically (credential stored in localStorage). From a different device, open the URL in the address bar after joining (`/play?code=X&id=YOUR-PSEUDONYM`); without `?id=` a fresh pseudonym is assigned.
- If the host closes the browser tab, the session ends immediately and cannot be resumed. Participants are shown a "session ended" message.
- No accounts, no login — minimal friction for quick local games.

## Persistence

- **Production**: game state is stored in Durable Object storage (SQLite-backed). Sessions survive DO eviction — the host can close the browser and resume later.
- **Local dev** (`npx partykit dev`): storage is in-memory only. Restarting the dev server clears all sessions.
- No session export or import.

## User Stories

### Host

- I want to create a wine test by adding wines, so that each wine becomes a round with 5 questions (color, country, grape variety, vintage year, wine name) that I fill in with a correct answer and 3 distractors.
- I want a generated 4-digit code for my session so participants can join easily without accounts.
- I want a Host Dashboard so I can control the pace of the game:
  - **Start** opens the lobby; starting the first round closes it.
  - **Pause / Resume** freezes and restores the question timer (remaining time is preserved on resume).
  - **Reveal Answer** manually closes the current question and highlights the correct option for all participants.
  - **Next** advances to the next question, or — after the last question of a wine — shows the round leaderboard and then moves to the next wine.
  - **End** terminates the session and pushes everyone to the final leaderboard.
- I want to see which participants have submitted an answer (not what they answered) so I know when everyone is done and I can reveal early.

### Participant

- I want to join a session by entering a 4-digit code so I can participate without creating an account.
- I want to be assigned a generated pseudonym automatically so I don't have to think of a name.
- I want to answer multiple-choice questions within a configurable timer window (15–120 s, default 60 s), and be able to change my answer any time until the host reveals it.
- I want to see the correct answer highlighted after the host reveals it, along with my points for that question.
- I want to see the leaderboard after all questions of each wine are completed, so I can track my standing throughout the game.
- I want to see a final leaderboard when the host ends the session, which stays on screen until I close the tab.

### Edge cases & constraints

- No new players can join after the session starts (first round begins) or once 10 players are connected.
- Pseudonyms are unique within a session and generated by the app — no custom names.
- Rejoin: same browser auto-rejoins via localStorage credential; different device via `?code=X&id=YOUR-PSEUDONYM` URL.
- If the host closes the browser, the session ends and participants see a "session ended" message — it cannot be resumed.
- Participants who don't answer before the timer expires receive 0 points for that question; no other penalty.

## Session title

Hosts can optionally name their tasting session when creating it. The title is displayed in the session list on the Host Dashboard.

- The title field is optional. If left blank, the first wine's name is used as the session title.
- Titles are stored in Durable Object state and displayed in the Host Dashboard session list.

## Session edition (edit wines before game starts)

As long as the session is in the **waiting** phase (lobby — not yet started), the host can return to the form to edit the wines:

- In the lobby screen, click **✏️ Edit Wines** to open the session form in edit mode.
- The form shows **Edit Blind Tasting** as heading and **Update Tasting** as the submit button.
- Submitting the form sends an `update_session` event to the backend, which replaces the wines list and saves the updated state.
- The host is returned to the lobby after the update.
- Edition is **blocked once the game has started** — the backend rejects `update_session` events when `phase !== 'waiting'`.
