import React from 'react';
import type { SessionListEntry } from '../../types/events';

interface HostDashboardProps {
  hostId: string;
  sessions: SessionListEntry[];
  onOpenSession: (code: string) => void;
  onViewResults: (session: SessionListEntry) => void;
  onNewSession: () => void;
  onDeleteSession: (code: string) => void;
}

export function HostDashboard({
  hostId,
  sessions,
  onOpenSession,
  onViewResults,
  onNewSession,
  onDeleteSession,
}: HostDashboardProps) {
  const activeSessions = sessions
    .filter((s) => s.status === 'waiting' || s.status === 'active')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const endedSessions = sessions
    .filter((s) => s.status === 'ended')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-[80vh] bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {/* Host identity */}
        <div className="text-center">
          <p className="text-4xl mb-2">🍷</p>
          <h1 className="text-3xl font-bold text-slate-800">Sommelier Arena</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your host ID:{' '}
            <span className="font-mono font-bold text-wine-600">{hostId}</span>
          </p>
        </div>

        {/* New session button */}
        <button
          onClick={onNewSession}
          className="w-full bg-wine-600 text-white rounded-xl py-4 font-semibold text-lg hover:bg-wine-700 transition-colors"
        >
          + New Blind Testing
        </button>

        {/* Active sessions */}
        {activeSessions.length > 0 && (
          <section aria-labelledby="active-sessions-heading">
            <h2 id="active-sessions-heading" className="text-lg font-semibold text-slate-700 mb-3">
              Active Tastings
            </h2>
            <ul className="space-y-3">
              {activeSessions.map((session) => (
                <li
                  key={session.code}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-800 truncate">{session.title}</p>
                      <span className="shrink-0 text-xs font-medium bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                        🟢 Open
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Code:{' '}
                      <span className="font-mono font-bold text-slate-700">{session.code}</span>
                      {' · '}
                      {session.participantCount} player{session.participantCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onOpenSession(session.code)}
                      className="bg-wine-600 text-white rounded-xl px-5 py-2 font-semibold hover:bg-wine-700 transition-colors text-sm"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => onDeleteSession(session.code)}
                      className="border border-slate-300 text-slate-500 rounded-xl px-3 py-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors text-sm"
                      aria-label={`Delete session ${session.code}`}
                      title="Delete session"
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Ended sessions */}
        {endedSessions.length > 0 && (
          <section aria-labelledby="ended-sessions-heading">
            <h2 id="ended-sessions-heading" className="text-lg font-semibold text-slate-700 mb-3">
              Past Tastings
            </h2>
            <ul className="space-y-3">
              {endedSessions.map((session) => (
                <li
                  key={session.code}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-800 truncate">{session.title}</p>
                      <span className="shrink-0 text-xs font-medium bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                        ⚪ Ended
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {session.participantCount} player{session.participantCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onViewResults(session)}
                      disabled={!session.finalRankings}
                      className="border border-slate-300 text-slate-600 rounded-xl px-5 py-2 font-semibold hover:bg-slate-50 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Results
                    </button>
                    <button
                      onClick={() => onDeleteSession(session.code)}
                      className="border border-slate-300 text-slate-500 rounded-xl px-3 py-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors text-sm"
                      aria-label={`Delete session ${session.code}`}
                      title="Delete session"
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sessions.length === 0 && (
          <p className="text-center text-slate-400 py-8">
            No tastings yet. Create your first one!
          </p>
        )}
      </div>
    </div>
  );
}
