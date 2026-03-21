import React, { useEffect, useRef } from 'react';
import { useHostStore } from '../../stores/hostStore';
import { useHostSocket } from '../../hooks/useHostSocket';
import { SessionForm } from './SessionForm';
import { HostLobby } from './HostLobby';
import { HostQuestion } from './HostQuestion';
import { HostReveal } from './HostReveal';
import { HostRoundLeaderboard } from './HostRoundLeaderboard';
import { HostFinalLeaderboard } from './HostFinalLeaderboard';

export function HostApp() {
  const phase = useHostStore((s) => s.phase);
  const code = useHostStore((s) => s.code);
  const participants = useHostStore((s) => s.participants);
  const answeredCount = useHostStore((s) => s.answeredCount);
  const totalCount = useHostStore((s) => s.totalCount);
  const isPaused = useHostStore((s) => s.isPaused);
  const currentQuestion = useHostStore((s) => s.currentQuestion);
  const revealData = useHostStore((s) => s.revealData);
  const rankings = useHostStore((s) => s.rankings);
  const roundIndex = useHostStore((s) => s.roundIndex);
  const timerMs = useHostStore((s) => s.timerMs);

  const {
    createSession,
    startGame,
    pauseGame,
    resumeGame,
    revealAnswer,
    nextQuestion,
    endSession,
  } = useHostSocket();

  // Move focus to the heading of each new view when the phase changes so
  // keyboard and screen-reader users don't lose context (WCAG 2.4.3).
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        {/* tabIndex={-1} allows programmatic focus without adding to tab order */}
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>New Session</h1>
        <SessionForm onSubmit={createSession} />
      </div>
    );
  }

  if (phase === 'lobby' && code) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Session Lobby</h1>
        <HostLobby
          code={code}
          participants={participants}
          onStart={startGame}
        />
      </div>
    );
  }

  if (phase === 'question' && currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Question {currentQuestion.questionIndex + 1}</h1>
        <HostQuestion
          question={currentQuestion}
          answeredCount={answeredCount}
          totalCount={totalCount}
          timerMs={timerMs}
          isPaused={isPaused}
          onPause={pauseGame}
          onResume={resumeGame}
          onReveal={revealAnswer}
          onEnd={endSession}
        />
      </div>
    );
  }

  if (phase === 'revealed' && currentQuestion && revealData) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Answer Revealed</h1>
        <HostReveal
          question={currentQuestion}
          revealData={revealData}
          onNext={nextQuestion}
          onEnd={endSession}
        />
      </div>
    );
  }

  if (phase === 'roundLeaderboard' && currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Round Leaderboard</h1>
        <HostRoundLeaderboard
          rankings={rankings}
          roundIndex={roundIndex}
          totalRounds={currentQuestion.totalRounds}
          onNext={nextQuestion}
          onEnd={endSession}
        />
      </div>
    );
  }

  if (phase === 'finalLeaderboard') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Final Leaderboard</h1>
        <HostFinalLeaderboard rankings={rankings} />
      </div>
    );
  }

  // Fallback loading
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400">Connecting…</p>
    </div>
  );
}
