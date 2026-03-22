import React, { useState, useEffect, useRef } from 'react';
import { useParticipantStore, loadRejoinData } from '../../stores/participantStore';
import { useParticipantSocket } from '../../hooks/useParticipantSocket';
import { useParticipantUrlSync } from '../../hooks/useUrlSync';
import { NavBar } from '../common/NavBar';
import { JoinForm } from './JoinForm';
import { ParticipantLobby } from './ParticipantLobby';
import { QuestionView } from './QuestionView';
import { RevealView } from './RevealView';
import { RoundLeaderboard } from './RoundLeaderboard';
import { FinalLeaderboard } from './FinalLeaderboard';
import { SessionEnded } from './SessionEnded';

export function ParticipantApp() {
  const phase = useParticipantStore((s) => s.phase);
  const pseudonym = useParticipantStore((s) => s.pseudonym);
  const sessionCode = useParticipantStore((s) => s.sessionCode);
  const currentQuestion = useParticipantStore((s) => s.currentQuestion);
  const selectedOptionId = useParticipantStore((s) => s.selectedOptionId);
  const revealData = useParticipantStore((s) => s.revealData);
  const rankings = useParticipantStore((s) => s.rankings);
  const timerMs = useParticipantStore((s) => s.timerMs);

  // Active session code — comes from joining or rejoin
  const [activeCode, setActiveCode] = useState<string>(() => {
    const rejoin = loadRejoinData();
    return rejoin?.code ?? '';
  });
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isRejoining, setIsRejoining] = useState(false);

  const { joinSession, submitAnswer } = useParticipantSocket(activeCode);

  // Keep browser address bar in sync with session phase
  useParticipantUrlSync(phase, sessionCode);

  // Move focus to new heading on phase change (WCAG 2.4.3)
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  // Auto-rejoin if token in localStorage
  useEffect(() => {
    const rejoin = loadRejoinData();
    if (rejoin) {
      setIsRejoining(true);
      setActiveCode(rejoin.code);
      // The hook will send rejoin_session on socket open
      const timer = setTimeout(() => setIsRejoining(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleJoin = (code: string) => {
    setJoinError(null);
    setActiveCode(code);
    // joinSession is called once the socket is open (hook handles it on connect)
    setTimeout(() => joinSession(), 100);
  };

  const handleSelect = (optionId: string) => {
    if (!currentQuestion) return;
    useParticipantStore.getState().setSelectedOption(optionId);
    submitAnswer(currentQuestion.questionId, optionId);
  };

  if (isRejoining) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <p className="text-slate-400 animate-pulse">Rejoining session…</p>
        </div>
      </div>
    );
  }

  if (phase === 'join') {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <JoinForm onJoin={handleJoin} error={joinError} />
      </div>
    );
  }

  if (phase === 'lobby' && pseudonym) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Waiting for host to start</h1>
        <ParticipantLobby pseudonym={pseudonym} />
      </div>
    );
  }

  if (phase === 'question' && currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Question {currentQuestion.questionIndex + 1}</h1>
        <QuestionView
          question={currentQuestion}
          selectedOptionId={selectedOptionId}
          timerMs={timerMs}
          onSelect={handleSelect}
        />
      </div>
    );
  }

  if (phase === 'revealed' && currentQuestion && revealData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Answer Revealed</h1>
        <RevealView
          question={currentQuestion}
          revealData={revealData}
          selectedOptionId={selectedOptionId}
        />
      </div>
    );
  }

  if (phase === 'roundLeaderboard') {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Round Leaderboard</h1>
        <RoundLeaderboard rankings={rankings} pseudonym={pseudonym} />
      </div>
    );
  }

  if (phase === 'finalLeaderboard') {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Final Leaderboard</h1>
        <FinalLeaderboard rankings={rankings} pseudonym={pseudonym} />
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Session Ended</h1>
        <SessionEnded />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-slate-400">Connecting…</p>
      </div>
    </div>
  );
}

