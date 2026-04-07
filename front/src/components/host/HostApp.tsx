import React, { useEffect, useRef, useState } from 'react';
import { useHostStore } from '../../stores/hostStore';
import { loadSessions } from '../../lib/sessionStorage';
import { useHostSocket } from '../../hooks/useHostSocket';
import { useHostUrlSync } from '../../hooks/useUrlSync';
import { NavBar } from '../common/NavBar';
import { SessionForm } from './SessionForm';
import { SessionCreated } from './SessionCreated';
import { HostDashboard } from './HostDashboard';
import { HostLobby } from './HostLobby';
import { HostQuestion } from './HostQuestion';
import { HostReveal } from './HostReveal';
import { HostQuestionLeaderboard } from './HostQuestionLeaderboard';
import { HostRoundLeaderboard } from './HostRoundLeaderboard';
import { HostFinalLeaderboard } from './HostFinalLeaderboard';
import type { SessionListEntry, CreateWinePayload } from '../../types/events';

export function HostApp({ showNav = true }: { showNav?: boolean }) {
  const phase = useHostStore((s) => s.phase);
  const code = useHostStore((s) => s.code);
  const hostId = useHostStore((s) => s.hostId);
  const sessions = useHostStore((s) => s.sessions);
  const participants = useHostStore((s) => s.participants);
  const answeredCount = useHostStore((s) => s.answeredCount);
  const totalCount = useHostStore((s) => s.totalCount);
  const isPaused = useHostStore((s) => s.isPaused);
  const currentQuestion = useHostStore((s) => s.currentQuestion);
  const revealData = useHostStore((s) => s.revealData);
  const rankings = useHostStore((s) => s.rankings);
  const roundIndex = useHostStore((s) => s.roundIndex);
  const totalRounds = useHostStore((s) => s.totalRounds);
  const timerMs = useHostStore((s) => s.timerMs);

  // Wines snapshot for edit mode (captured when host clicks "Edit Tasting")
  const [editingWines, setEditingWines] = useState<CreateWinePayload[] | null>(null);
  // Store the last submitted wines payload so we can pre-fill the edit form
  const lastWinesRef = useRef<CreateWinePayload[]>([]);
  // Store the last submitted title so we can pre-fill the edit form
  const lastTitleRef = useRef<string>('');

  // Socket connects to the active session room (empty string = no connection yet)
  const {
    createSession,
    updateSession,
    startGame,
    pauseGame,
    resumeGame,
    revealAnswer,
    nextQuestion,
    endSession,
  } = useHostSocket(code ?? '');

  // Move focus to the heading of each new view when the phase changes (WCAG 2.4.3).
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  // On mount: check ?id= and ?code= params to restore host identity and session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    const codeParam = params.get('code');
    const store = useHostStore.getState();
    if (idParam) {
      store.setHostId(idParam);
    }
    if (codeParam) {
      // Direct link to a specific session — reconnect immediately
      store.setCode(codeParam);
      store.setPhase('lobby');
    } else {
      // No session in URL — show dashboard, load local sessions as KV fallback
      const localSessions = loadSessions(store.hostId);
      if (localSessions.length > 0) {
        store.setSessions(localSessions);
      }
      store.setPhase('dashboard');
    }

    const storageHandler = (event: StorageEvent) => {
      if (event.key !== `sommelierArena:sessions:${useHostStore.getState().hostId}`) return;
      useHostStore.getState().setSessions(loadSessions(useHostStore.getState().hostId));
    };
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  // Keep browser address bar in sync with current phase (enables share/bookmark)
  useHostUrlSync(phase, code, hostId);

  const handleNewSession = () => {
    // Generate a 4-digit code and set it now so useHostSocket can connect
    // before the form is submitted — without a code the socket never opens
    // and create_session would be silently dropped.
    const newCode = String(Math.floor(1000 + Math.random() * 9000));
    useHostStore.getState().setCode(newCode);
    useHostStore.getState().setPhase('setup');
  };

  if (phase === 'dashboard') {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Host Dashboard</h1>
        <HostDashboard
          hostId={hostId}
          sessions={sessions}
          onOpenSession={(sessionCode) => {
            useHostStore.getState().setCode(sessionCode);
            useHostStore.getState().setPhase('lobby');
          }}
          onViewResults={(session: SessionListEntry) => {
            if (session.finalRankings) {
              useHostStore.getState().setRankings(session.finalRankings);
              useHostStore.getState().setPhase('finalLeaderboard');
            }
          }}
          onNewSession={handleNewSession}
          onDeleteSession={(sessionCode) => {
            useHostStore.getState().removeSession(sessionCode);
          }}
        />
      </div>
    );
  }

  if (phase === 'setup') {
    const isEditing = editingWines !== null;
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <div className="px-4 py-10">
          <h1 className="sr-only" tabIndex={-1} ref={headingRef}>
            {isEditing ? 'Edit Blind Tasting' : 'New Blind Testing HostApp'}
          </h1>
          <SessionForm
            onSubmit={(payload) => {
              lastWinesRef.current = payload.wines;
              lastTitleRef.current = payload.title ?? payload.wines[0]?.name ?? '';
              if (isEditing) {
                setEditingWines(null);
                updateSession(payload);
              } else {
                createSession(payload);
              }
            }}
            hostId={hostId}
            initialWines={editingWines ?? undefined}
            initialTitle={isEditing ? lastTitleRef.current : undefined}
            isEditing={isEditing}
          />
        </div>
      </div>
    );
  }

  if (phase === 'lobby' && code) {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <div className="px-4 py-10 space-y-6">
          <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Tasting Lobby</h1>
          <SessionCreated code={code} hostId={hostId} />
          <HostLobby
            code={code}
            participants={participants}
            onStart={startGame}
            onEdit={() => {
              setEditingWines(lastWinesRef.current);
              useHostStore.getState().setPhase('setup');
            }}
          />
        </div>
      </div>
    );
  }

  if (phase === 'question' && currentQuestion) {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <div className="px-4 py-10">
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
      </div>
    );
  }

  if (phase === 'revealed' && currentQuestion && revealData) {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <div className="px-4 py-10">
          <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Answer Revealed</h1>
          <HostReveal
            question={currentQuestion}
            revealData={revealData}
            onNext={nextQuestion}
            onEnd={endSession}
          />
        </div>
      </div>
    );
  }

  if (phase === 'questionLeaderboard') {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <div className="px-4 py-10">
          <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Question Leaderboard</h1>
          <HostQuestionLeaderboard
            rankings={rankings}
            questionIndex={currentQuestion?.questionIndex ?? 0}
            totalQuestions={currentQuestion?.totalQuestions ?? 1}
            onNext={nextQuestion}
            onEnd={endSession}
          />
        </div>
      </div>
    );
  }

  if (phase === 'roundLeaderboard') {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <div className="px-4 py-10">
          <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Round Leaderboard</h1>
          <HostRoundLeaderboard
            rankings={rankings}
            roundIndex={roundIndex}
            totalRounds={totalRounds}
            onNext={nextQuestion}
            onEnd={endSession}
          />
        </div>
      </div>
    );
  }

  if (phase === 'finalLeaderboard') {
    return (
      <div className="bg-slate-50">
        {showNav && <NavBar />}
        <div className="px-4 py-10">
          <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Final Leaderboard</h1>
          <HostFinalLeaderboard
            rankings={rankings}
            onNewTasting={() => {
              setEditingWines(null);
              lastWinesRef.current = [];
              lastTitleRef.current = '';
              useHostStore.getState().resetSession();
              handleNewSession();
            }}
          />
        </div>
      </div>
    );
  }

  // Fallback loading
  return (
    <div className="bg-slate-50">
      {showNav && <NavBar />}
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">Connecting…</p>
      </div>
    </div>
  );
}
