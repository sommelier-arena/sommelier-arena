import { useEffect, useCallback, useRef } from 'react';
import type PartySocket from 'partysocket';
import { createSocket } from '../lib/socket';
import { useParticipantStore } from '../stores/participantStore';
import { loadRejoin } from '../lib/rejoin';
import type {
  QuestionPayload,
  ParticipantRevealPayload,
  RoundLeaderboardPayload,
  FinalLeaderboardPayload,
  ParticipantStateSnapshot,
} from '../types/events';

/** Participant socket hook — connects to a specific session room (4-digit code). */
export function useParticipantSocket(code: string) {
  const socketRef = useRef<PartySocket | null>(null);
  const pendingMessagesRef = useRef<object[]>([]);

  useEffect(() => {
    if (!code) return;
    const socket = createSocket(code);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      // Auto-rejoin if a credential is stored for this room
      const rejoinData = loadRejoin();
      if (rejoinData && rejoinData.code === code) {
        socket.send(JSON.stringify({
          type: 'rejoin_session',
          pseudonym: rejoinData.id,
        }));
      }

      // Flush any queued messages that were sent before the socket opened
      if (pendingMessagesRef.current.length) {
        for (const m of pendingMessagesRef.current) {
          try {
            socket.send(JSON.stringify(m));
          } catch {
            // If send fails, keep it queued (will try again on next open)
          }
        }
        pendingMessagesRef.current.length = 0;
      }
    });

    const onMessage = (event: MessageEvent<string>) => {
      let msg: { type: string; [key: string]: unknown };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      const store = useParticipantStore.getState();

      switch (msg.type) {
        case 'participant:joined': {
          const { pseudonym } = msg as unknown as { pseudonym: string };
          store.setPseudonym(pseudonym);
          // Clear any previous join error on successful join
          store.setJoinError(null);
          store.setRejoin(pseudonym, code);
          store.setPhase('lobby');
          break;
        }
        case 'error': {
          // Generic server-side errors (e.g. GAME_STARTED, SESSION_FULL)
          const err = (msg as any).message as string | undefined;
          store.setJoinError(err ?? 'An error occurred');
          break;
        }
        case 'participant:state_snapshot': {
          const snap = msg as unknown as ParticipantStateSnapshot;
          store.setPseudonym(snap.pseudonym);
          if (snap.question) {
            store.setCurrentQuestion(snap.question as QuestionPayload);
          }
          // Restore frontend phase
          const phaseMap: Record<string, Parameters<typeof store.setPhase>[0]> = {
            waiting: 'lobby',
            question_open: 'question',
            question_paused: 'question',
            question_revealed: 'revealed',
            round_leaderboard: 'roundLeaderboard',
            ended: 'finalLeaderboard',
          };
          const frontPhase = phaseMap[snap.phase];
          if (frontPhase) store.setPhase(frontPhase);
          break;
        }
        case 'game:question': {
          const payload = msg as unknown as QuestionPayload;
          store.setCurrentQuestion(payload);
          store.setTimerMs(payload.timerMs);
          store.setPhase('question');
          break;
        }
        case 'game:answer_revealed': {
          store.setRevealData(msg as unknown as ParticipantRevealPayload);
          store.setPhase('revealed');
          break;
        }
        case 'game:timer_tick':
        case 'game:timer_paused':
        case 'game:timer_resumed': {
          store.setTimerMs((msg as unknown as { remainingMs: number }).remainingMs);
          break;
        }
        case 'game:round_leaderboard': {
          store.setRankings((msg as unknown as RoundLeaderboardPayload).rankings);
          store.setPhase('roundLeaderboard');
          break;
        }
        case 'game:final_leaderboard': {
          store.setRankings((msg as unknown as FinalLeaderboardPayload).rankings);
          store.setPhase('finalLeaderboard');
          break;
        }
        case 'session:ended': {
          // Don't overwrite finalLeaderboard — if the host ended the game
          // normally the participant already received game:final_leaderboard
          // and should stay on the leaderboard screen.
          if (useParticipantStore.getState().phase !== 'finalLeaderboard') {
            store.setPhase('ended');
          }
          store.clearRejoin();
          break;
        }
        case 'server:state_snapshot': {
          // Sent by the backend on every new connection with the current room phase.
          // Only transition to 'ended' when the room is genuinely finished — this
          // handles reconnecting to an already-ended session (e.g. after server restart).
          // We intentionally do NOT set 'ended' on socket close because PartySocket
          // reconnects automatically; the close event fires on every reconnect cycle.
          const snap = msg as unknown as { phase: string };
          if (snap.phase === 'ended') {
            store.clearRejoin();
            store.setPhase('ended');
          }
          break;
        }
      }
    };

    socket.addEventListener('message', onMessage);
    // NOTE: No socket 'close' handler here. PartySocket reconnects automatically —
    // the close event fires on every temporary disconnect (network hiccup, host
    // navigation, idle timeout). Setting phase='ended' on close caused participants
    // to see "Session Ended" on every reconnect cycle and wiped their rejoin tokens.
    // The server:state_snapshot handler above covers reconnecting to a dead session.

    return () => {
      socket.removeEventListener('message', onMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [code]);

  const send = useCallback((payload: object) => {
    const socket = socketRef.current;
    if (!socket) {
      // Socket not created yet — queue the message
      pendingMessagesRef.current.push(payload);
      return;
    }
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      // If send throws (not open), queue for flush on open
      pendingMessagesRef.current.push(payload);
    }
  }, []);

  const joinSession = useCallback(() => {
    send({ type: 'join_session', code });
  }, [send, code]);

  const submitAnswer = useCallback(
    (questionId: string, optionId: string) => {
      send({ type: 'submit_answer', questionId, optionId });
    },
    [send],
  );

  return { joinSession, submitAnswer };
}
