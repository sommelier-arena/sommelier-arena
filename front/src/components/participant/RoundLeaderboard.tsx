import React from 'react';
import { Leaderboard } from '../common/Leaderboard';
import type { RankingEntry } from '../../types/events';

interface RoundLeaderboardProps {
  rankings: RankingEntry[];
  pseudonym: string | null;
}

export function RoundLeaderboard({ rankings, pseudonym }: RoundLeaderboardProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Round Over</h2>
          <p className="text-slate-500 mt-1">Waiting for the next round…</p>
        </div>
        <Leaderboard
          rankings={rankings}
          highlightPseudonym={pseudonym ?? undefined}
        />
      </div>
    </div>
  );
}
