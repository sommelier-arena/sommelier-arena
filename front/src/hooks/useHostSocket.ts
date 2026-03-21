import { useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import { useHostStore } from '../stores/hostStore';
import type {
  CreateSessionPayload,
  LobbyUpdatedPayload,
  QuestionPayload,
  HostRevealPayload,
  RoundLeaderboardPayload,
  FinalLeaderboardPayload,
  ParticipantAnsweredPayload,
} from '../types/events';

export function useHostSocket() {
  useEffect(() => {
    socket.connect();

    const onSessionCreated = ({ code }: { code: string }) => {
      useHostStore.getState().setCode(code);
      useHostStore.getState().setPhase('lobby');
    };

    const onLobbyUpdated = ({ participants }: LobbyUpdatedPayload) => {
      useHostStore.getState().setParticipants(participants);
    };

    const onGameStarted = () => {
      // phase transitions to 'question' on game:question
    };

    const onGameQuestion = (payload: QuestionPayload) => {
      useHostStore.getState().setCurrentQuestion(payload);
      useHostStore.getState().setTimerMs(payload.timerMs);
      useHostStore.getState().setIsPaused(false);
      useHostStore.getState().setPhase('question');
    };

    const onParticipantAnswered = (payload: ParticipantAnsweredPayload) => {
      useHostStore
        .getState()
        .setAnsweredStats(payload.answeredCount, payload.totalCount);
    };

    const onAnswerRevealed = (payload: HostRevealPayload) => {
      useHostStore.getState().setRevealData(payload);
      useHostStore.getState().setPhase('revealed');
    };

    const onTimerTick = ({ remainingMs }: { remainingMs: number }) => {
      useHostStore.getState().setTimerMs(remainingMs);
    };

    const onTimerPaused = ({ remainingMs }: { remainingMs: number }) => {
      useHostStore.getState().setTimerMs(remainingMs);
      useHostStore.getState().setIsPaused(true);
    };

    const onTimerResumed = ({ remainingMs }: { remainingMs: number }) => {
      useHostStore.getState().setTimerMs(remainingMs);
      useHostStore.getState().setIsPaused(false);
    };

    const onRoundLeaderboard = (payload: RoundLeaderboardPayload) => {
      useHostStore.getState().setRankings(payload.rankings, payload.roundIndex);
      useHostStore.getState().setPhase('roundLeaderboard');
    };

    const onFinalLeaderboard = (payload: FinalLeaderboardPayload) => {
      useHostStore.getState().setRankings(payload.rankings);
      useHostStore.getState().setPhase('finalLeaderboard');
    };

    socket.on('session:created', onSessionCreated);
    socket.on('lobby:updated', onLobbyUpdated);
    socket.on('game:started', onGameStarted);
    socket.on('game:question', onGameQuestion);
    socket.on('game:participant_answered', onParticipantAnswered);
    socket.on('game:answer_revealed', onAnswerRevealed);
    socket.on('game:timer_tick', onTimerTick);
    socket.on('game:timer_paused', onTimerPaused);
    socket.on('game:timer_resumed', onTimerResumed);
    socket.on('game:round_leaderboard', onRoundLeaderboard);
    socket.on('game:final_leaderboard', onFinalLeaderboard);

    return () => {
      socket.off('session:created', onSessionCreated);
      socket.off('lobby:updated', onLobbyUpdated);
      socket.off('game:started', onGameStarted);
      socket.off('game:question', onGameQuestion);
      socket.off('game:participant_answered', onParticipantAnswered);
      socket.off('game:answer_revealed', onAnswerRevealed);
      socket.off('game:timer_tick', onTimerTick);
      socket.off('game:timer_paused', onTimerPaused);
      socket.off('game:timer_resumed', onTimerResumed);
      socket.off('game:round_leaderboard', onRoundLeaderboard);
      socket.off('game:final_leaderboard', onFinalLeaderboard);
      socket.disconnect();
    };
  }, []);

  const createSession = useCallback((payload: CreateSessionPayload) => {
    socket.emit('create_session', payload);
  }, []);

  const startGame = useCallback(() => {
    socket.emit('host:start');
  }, []);

  const pauseGame = useCallback(() => {
    socket.emit('host:pause');
  }, []);

  const resumeGame = useCallback(() => {
    socket.emit('host:resume');
  }, []);

  const revealAnswer = useCallback(() => {
    socket.emit('host:reveal');
  }, []);

  const nextQuestion = useCallback(() => {
    socket.emit('host:next');
  }, []);

  const endSession = useCallback(() => {
    socket.emit('host:end');
  }, []);

  return {
    createSession,
    startGame,
    pauseGame,
    resumeGame,
    revealAnswer,
    nextQuestion,
    endSession,
  };
}
