import React from 'react';
import { Leaderboard } from '../common/Leaderboard';
import type { RankingEntry } from '../../types/events';

interface FinalLeaderboardProps {
  rankings: RankingEntry[];
  pseudonym: string | null;
}

export function FinalLeaderboard({ rankings, pseudonym }: FinalLeaderboardProps) {
  const myRank = rankings.findIndex((r) => r.pseudonym === pseudonym) + 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-3xl font-bold text-slate-800">Final Results</h2>
          {pseudonym && myRank > 0 && (
            <p className="text-slate-500 mt-2">
              You finished{' '}
              <span className="font-bold text-violet-600">#{myRank}</span> as{' '}
              <span className="font-medium text-slate-700">{pseudonym}</span>
            </p>
          )}
        </div>

        <Leaderboard
          rankings={rankings}
          highlightPseudonym={pseudonym ?? undefined}
        />

        <p className="text-slate-400 text-xs">You can close this tab.</p>
      </div>
    </div>
  );
}
