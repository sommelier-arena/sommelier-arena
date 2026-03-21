import { useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import { useParticipantStore } from '../stores/participantStore';
import type {
  QuestionPayload,
  ParticipantRevealPayload,
  RoundLeaderboardPayload,
  FinalLeaderboardPayload,
} from '../types/events';

export function useParticipantSocket() {
  useEffect(() => {
    socket.connect();

    const onParticipantJoined = ({ pseudonym }: { pseudonym: string }) => {
      useParticipantStore.getState().setPseudonym(pseudonym);
      useParticipantStore.getState().setPhase('lobby');
    };

    const onLobbyUpdated = () => {
      // Participant view: just stay in lobby phase, no action needed
    };

    const onGameStarted = () => {
      // phase transitions on game:question
    };

    const onGameQuestion = (payload: QuestionPayload) => {
      useParticipantStore.getState().setCurrentQuestion(payload);
      useParticipantStore.getState().setTimerMs(payload.timerMs);
      useParticipantStore.getState().setPhase('question');
    };

    const onAnswerRevealed = (payload: ParticipantRevealPayload) => {
      useParticipantStore.getState().setRevealData(payload);
      useParticipantStore.getState().setPhase('revealed');
    };

    const onTimerTick = ({ remainingMs }: { remainingMs: number }) => {
      useParticipantStore.getState().setTimerMs(remainingMs);
    };

    const onTimerPaused = ({ remainingMs }: { remainingMs: number }) => {
      useParticipantStore.getState().setTimerMs(remainingMs);
    };

    const onTimerResumed = ({ remainingMs }: { remainingMs: number }) => {
      useParticipantStore.getState().setTimerMs(remainingMs);
    };

    const onRoundLeaderboard = (payload: RoundLeaderboardPayload) => {
      useParticipantStore.getState().setRankings(payload.rankings);
      useParticipantStore.getState().setPhase('roundLeaderboard');
    };

    const onFinalLeaderboard = (payload: FinalLeaderboardPayload) => {
      useParticipantStore.getState().setRankings(payload.rankings);
      useParticipantStore.getState().setPhase('finalLeaderboard');
    };

    const onSessionEnded = () => {
      useParticipantStore.getState().setPhase('ended');
    };

    const onDisconnect = () => {
      const phase = useParticipantStore.getState().phase;
      if (phase !== 'finalLeaderboard' && phase !== 'ended') {
        useParticipantStore.getState().setPhase('ended');
      }
    };

    socket.on('participant:joined', onParticipantJoined);
    socket.on('lobby:updated', onLobbyUpdated);
    socket.on('game:started', onGameStarted);
    socket.on('game:question', onGameQuestion);
    socket.on('game:answer_revealed', onAnswerRevealed);
    socket.on('game:timer_tick', onTimerTick);
    socket.on('game:timer_paused', onTimerPaused);
    socket.on('game:timer_resumed', onTimerResumed);
    socket.on('game:round_leaderboard', onRoundLeaderboard);
    socket.on('game:final_leaderboard', onFinalLeaderboard);
    socket.on('session:ended', onSessionEnded);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('participant:joined', onParticipantJoined);
      socket.off('lobby:updated', onLobbyUpdated);
      socket.off('game:started', onGameStarted);
      socket.off('game:question', onGameQuestion);
      socket.off('game:answer_revealed', onAnswerRevealed);
      socket.off('game:timer_tick', onTimerTick);
      socket.off('game:timer_paused', onTimerPaused);
      socket.off('game:timer_resumed', onTimerResumed);
      socket.off('game:round_leaderboard', onRoundLeaderboard);
      socket.off('game:final_leaderboard', onFinalLeaderboard);
      socket.off('session:ended', onSessionEnded);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, []);

  const joinSession = useCallback((code: string) => {
    socket.emit('join_session', { code });
  }, []);

  const submitAnswer = useCallback(
    (questionId: string, optionId: string) => {
      socket.emit('submit_answer', { questionId, optionId });
    },
    [],
  );

  return { joinSession, submitAnswer };
}
