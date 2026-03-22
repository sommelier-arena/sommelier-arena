import { useEffect, useCallback, useRef } from 'react';
import type PartySocket from 'partysocket';
import { createSocket } from '../lib/socket';
import { useParticipantStore, loadRejoinData } from '../stores/participantStore';
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

  useEffect(() => {
    if (!code) return;
    const socket = createSocket(code);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      // Auto-rejoin if rejoinToken is stored for this room
      const rejoinData = loadRejoinData();
      if (rejoinData && rejoinData.code === code) {
        socket.send(JSON.stringify({
          type: 'rejoin_session',
          rejoinToken: rejoinData.rejoinToken,
        }));
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
          const { pseudonym, rejoinToken } = msg as unknown as {
            pseudonym: string;
            rejoinToken: string;
          };
          store.setPseudonym(pseudonym);
          store.setRejoinToken(rejoinToken, code, pseudonym);
          store.setPhase('lobby');
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
      }
    };

    socket.addEventListener('message', onMessage);

    socket.addEventListener('close', () => {
      const phase = useParticipantStore.getState().phase;
      if (phase !== 'finalLeaderboard' && phase !== 'ended') {
        // Host crashed or network dropped — clear stale rejoin token so
        // the participant can join a new session on next visit.
        useParticipantStore.getState().clearRejoin();
        useParticipantStore.getState().setPhase('ended');
      }
    });

    return () => {
      socket.removeEventListener('message', onMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [code]);

  const send = useCallback((payload: object) => {
    socketRef.current?.send(JSON.stringify(payload));
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

