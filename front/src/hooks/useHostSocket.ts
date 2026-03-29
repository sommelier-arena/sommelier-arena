import { useEffect, useCallback, useRef } from 'react';
import type PartySocket from 'partysocket';
import { createSocket } from '../lib/socket';
import { useHostStore } from '../stores/hostStore';
import { saveSession, mergeSession } from '../lib/sessionStorage';
import type {
  CreateSessionPayload,
  LobbyUpdatedPayload,
  QuestionPayload,
  HostRevealPayload,
  RoundLeaderboardPayload,
  FinalLeaderboardPayload,
  ParticipantAnsweredPayload,
  HostStateSnapshot,
  SessionsListPayload,
} from '../types/events';

/** Host socket hook — connects to a specific session room (4-digit code). */
export function useHostSocket(code: string) {
  const socketRef = useRef<PartySocket | null>(null);
  const pendingTitleRef = useRef<string>('');

  useEffect(() => {
    if (!code) return;
    const socket = createSocket(code);
    socketRef.current = socket;

    const { hostId } = useHostStore.getState();

    // Auto-rejoin if host already owns this session
    socket.addEventListener('open', () => {
      if (hostId) {
        socket.send(JSON.stringify({ type: 'rejoin_host', hostId }));
      }
    });

    const onMessage = (event: MessageEvent<string>) => {
      let msg: { type: string; [key: string]: unknown };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      const store = useHostStore.getState();

      switch (msg.type) {
        case 'session:created': {
          const { code: sessionCode, hostId: returnedHostId } = msg as unknown as {
            code: string;
            hostId: string;
          };
          store.setCode(sessionCode);
          if (returnedHostId) store.setHostId(returnedHostId);
          store.setPhase('lobby');
          // Persist to localStorage so the dashboard can show this session
          // even when KV is not configured (local dev).
          saveSession(returnedHostId ?? store.hostId, {
            code: sessionCode,
            title: pendingTitleRef.current || sessionCode,
            createdAt: new Date().toISOString(),
            status: 'waiting',
            participantCount: 0,
          });
          break;
        }
        case 'host:state_snapshot': {
          const snap = msg as unknown as HostStateSnapshot;
          store.setCode(snap.code);
          if (snap.hostId) store.setHostId(snap.hostId);
          store.setParticipants(snap.participants);
          if (snap.question) {
            store.setCurrentQuestion(snap.question as QuestionPayload);
          }
          store.setRankings(snap.rankings);
          // Restore totalRounds from wines list in the snapshot
          if (snap.wines?.length) {
            store.setTotalRounds(snap.wines.length);
          }
          // Restore phase
          const phaseMap: Record<string, ReturnType<typeof store.setPhase> extends void ? Parameters<typeof store.setPhase>[0] : never> = {
            waiting: 'lobby',
            question_open: 'question',
            question_paused: 'question',
            question_revealed: 'revealed',
            round_leaderboard: 'roundLeaderboard',
            ended: 'finalLeaderboard',
          };
          const frontPhase = phaseMap[snap.phase as string] as Parameters<typeof store.setPhase>[0];
          if (frontPhase) store.setPhase(frontPhase);
          break;
        }
        case 'sessions:list': {
          const { sessions } = msg as unknown as SessionsListPayload;
          store.setSessions(sessions);
          break;
        }
        case 'lobby:updated': {
          const { participants } = msg as unknown as LobbyUpdatedPayload;
          store.setParticipants(participants);
          // Keep sessions list participantCount in sync so the dashboard always shows
          // the correct count regardless of which event it reads from.
          if (store.code) {
            mergeSession(store.hostId, store.code, { participantCount: participants.length });
            store.setSessions(
              store.sessions.map((s) =>
                s.code === store.code ? { ...s, participantCount: participants.length } : s,
              ),
            );
          }
          break;
        }
        case 'host:session_updated': {
          const { wines, timerSeconds, sessionTitle } = msg as unknown as {
            wines: unknown[];
            timerSeconds: number;
            sessionTitle: string;
          };
          store.setTotalRounds(wines.length);
          // Update localStorage title if it changed
          if (store.code && sessionTitle) {
            mergeSession(store.hostId, store.code, { status: 'waiting' });
          }
          store.setPhase('lobby');
          break;
        }
        case 'game:question': {
          const payload = msg as unknown as QuestionPayload;
          store.setCurrentQuestion(payload);
          store.setTimerMs(payload.timerMs);
          store.setIsPaused(false);
          store.setPhase('question');
          break;
        }
        case 'game:participant_answered': {
          const { answeredCount, totalCount } = msg as unknown as ParticipantAnsweredPayload;
          store.setAnsweredStats(answeredCount, totalCount);
          break;
        }
        case 'game:answer_revealed': {
          store.setRevealData(msg as unknown as HostRevealPayload);
          store.setPhase('revealed');
          break;
        }
        case 'game:timer_tick': {
          store.setTimerMs((msg as unknown as { remainingMs: number }).remainingMs);
          break;
        }
        case 'game:timer_paused': {
          store.setTimerMs((msg as unknown as { remainingMs: number }).remainingMs);
          store.setIsPaused(true);
          break;
        }
        case 'game:timer_resumed': {
          store.setTimerMs((msg as unknown as { remainingMs: number }).remainingMs);
          store.setIsPaused(false);
          break;
        }
        case 'game:round_leaderboard': {
          const { rankings, roundIndex, totalRounds } = msg as unknown as RoundLeaderboardPayload;
          store.setRankings(rankings, roundIndex);
          if (totalRounds !== undefined) store.setTotalRounds(totalRounds);
          store.setPhase('roundLeaderboard');
          break;
        }
        case 'game:final_leaderboard': {
          const finalData = msg as unknown as FinalLeaderboardPayload;
          store.setRankings(finalData.rankings);
          store.setPhase('finalLeaderboard');
          // Merge-update localStorage: only overwrite status, participantCount, finalRankings.
          // title and createdAt from the original session:created entry are preserved.
          if (store.code) {
            mergeSession(store.hostId, store.code, {
              status: 'ended',
              participantCount: store.participants.length,
              finalRankings: finalData.rankings,
            });
          }
          break;
        }
      }
    };

    socket.addEventListener('message', onMessage);

    return () => {
      socket.removeEventListener('message', onMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [code]);

  const send = useCallback((payload: object) => {
    socketRef.current?.send(JSON.stringify(payload));
  }, []);

  const createSession = useCallback((payload: CreateSessionPayload) => {
    pendingTitleRef.current = payload.title ?? payload.wines[0]?.name ?? '';
    send({ type: 'create_session', ...payload });
  }, [send]);

  const updateSession = useCallback((payload: CreateSessionPayload) => {
    pendingTitleRef.current = payload.title ?? payload.wines[0]?.name ?? '';
    send({ type: 'update_session', ...payload });
  }, [send]);

  const startGame = useCallback(() => send({ type: 'host:start' }), [send]);
  const pauseGame = useCallback(() => send({ type: 'host:pause' }), [send]);
  const resumeGame = useCallback(() => send({ type: 'host:resume' }), [send]);
  const revealAnswer = useCallback(() => send({ type: 'host:reveal' }), [send]);
  const nextQuestion = useCallback(() => send({ type: 'host:next' }), [send]);
  const endSession = useCallback(() => send({ type: 'host:end' }), [send]);

  return {
    createSession,
    updateSession,
    startGame,
    pauseGame,
    resumeGame,
    revealAnswer,
    nextQuestion,
    endSession,
  };
}

