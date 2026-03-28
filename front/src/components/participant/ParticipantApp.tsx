import React, { useState, useEffect, useRef } from 'react';
import { useParticipantStore } from '../../stores/participantStore';
import { loadRejoin } from '../../lib/rejoin';
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

export function ParticipantApp({ showNav = true }: { showNav?: boolean }) {
  const phase = useParticipantStore((s) => s.phase);
  const pseudonym = useParticipantStore((s) => s.pseudonym);
  const sessionCode = useParticipantStore((s) => s.sessionCode);
  const rejoinId = useParticipantStore((s) => s.rejoinId);
  const currentQuestion = useParticipantStore((s) => s.currentQuestion);
  const selectedOptionId = useParticipantStore((s) => s.selectedOptionId);
  const revealData = useParticipantStore((s) => s.revealData);
  const rankings = useParticipantStore((s) => s.rankings);
  const timerMs = useParticipantStore((s) => s.timerMs);

  // Active session code — comes from URL params, stored rejoin, or manual join
  const [activeCode, setActiveCode] = useState<string>(() => {
    // 1. Read ?code= from URL (handles share links and ?code=X&id=Y rejoin links)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code');
      if (urlCode) return urlCode;
    }
    // 2. Fall back to stored rejoin credential
    return loadRejoin()?.code ?? '';
  });
  const joinError = useParticipantStore((s) => s.joinError);
  const [isRejoining, setIsRejoining] = useState(false);

  // Capture URL params synchronously at component initialization — BEFORE
  // useParticipantUrlSync can strip them via history.replaceState.
  const [initialParams] = useState<{ code: string | null; id: string | null }>(() => {
    if (typeof window === 'undefined') return { code: null, id: null };
    const p = new URLSearchParams(window.location.search);
    return { code: p.get('code'), id: p.get('id') };
  });

  const { joinSession, submitAnswer } = useParticipantSocket(activeCode);

  // Keep browser address bar in sync with session phase
  useParticipantUrlSync(phase, sessionCode, rejoinId);

  // Move focus to new heading on phase change (WCAG 2.4.3)
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  // On mount: handle URL params for direct join or rejoin
  // Use initialParams (captured before URL sync strips them).
  useEffect(() => {
    const { code: urlCode, id: urlId } = initialParams;

    if (urlCode && urlId) {
      // ?code=X&id=Y — restore credential so the socket hook can auto-rejoin
      useParticipantStore.getState().setRejoin(urlId, urlCode);
      setIsRejoining(true);
      setActiveCode(urlCode);
      const timer = setTimeout(() => setIsRejoining(false), 3000);
      return () => clearTimeout(timer);
    }

    if (urlCode && !urlId) {
      // ?code=X only — fresh join, set code and trigger join after socket opens
      setActiveCode(urlCode);
      setTimeout(() => joinSession(), 100);
      return;
    }

    // No URL params — check for stored rejoin credential
    const rejoin = loadRejoin();
    if (rejoin) {
      setIsRejoining(true);
      setActiveCode(rejoin.code);
      const timer = setTimeout(() => setIsRejoining(false), 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = (code: string) => {
    useParticipantStore.getState().setJoinError(null);
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
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-400 animate-pulse">Rejoining session…</p>
        </div>
      </div>
    );
  }

  if (phase === 'join') {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <JoinForm onJoin={handleJoin} error={joinError} />
      </div>
    );
  }

  if (phase === 'lobby' && pseudonym) {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Waiting for host to start</h1>
        <ParticipantLobby pseudonym={pseudonym} />
      </div>
    );
  }

  if (phase === 'question' && currentQuestion) {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
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
      <div className="bg-slate-50">
        {showNav && <NavBar />}
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
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Round Leaderboard</h1>
        <RoundLeaderboard rankings={rankings} pseudonym={pseudonym} />
      </div>
    );
  }

  if (phase === 'finalLeaderboard') {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Final Leaderboard</h1>
        <FinalLeaderboard rankings={rankings} pseudonym={pseudonym} />
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Session Ended</h1>
        <SessionEnded />
      </div>
    );
  }

  return (
    <div className="bg-slate-50">
      {showNav && <NavBar />}
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">Connecting…</p>
      </div>
    </div>
  );
}
