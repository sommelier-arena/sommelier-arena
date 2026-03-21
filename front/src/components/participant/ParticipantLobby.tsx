import React from 'react';

interface ParticipantLobbyProps {
  pseudonym: string;
}

export function ParticipantLobby({ pseudonym }: ParticipantLobbyProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm w-full">
        <p className="text-4xl">🍾</p>
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-widest mb-2">
            You are
          </p>
          <div className="inline-block bg-violet-50 border border-violet-200 rounded-2xl px-6 py-3">
            <span className="text-2xl font-bold text-violet-700">{pseudonym}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <p>Waiting for the host to start the game…</p>
        </div>
      </div>
    </div>
  );
}
