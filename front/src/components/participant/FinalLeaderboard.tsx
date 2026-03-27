import React from 'react';
import { Leaderboard } from '../common/Leaderboard';
import { useParticipantStore } from '../../stores/participantStore';
import type { RankingEntry } from '../../types/events';

interface FinalLeaderboardProps {
  rankings: RankingEntry[];
  pseudonym: string | null;
}

export function FinalLeaderboard({ rankings, pseudonym }: FinalLeaderboardProps) {
  const myRank = rankings.findIndex((r) => r.pseudonym === pseudonym) + 1;

  const handlePlayAgain = () => {
    useParticipantStore.getState().resetGame();
    window.location.href = '/play';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-3xl font-bold text-slate-800">Final Results</h2>
          {pseudonym && myRank > 0 && (
            <p className="text-slate-500 mt-2">
              You finished{' '}
              <span className="font-bold text-wine-600">#{myRank}</span> as{' '}
              <span className="font-medium text-slate-700">{pseudonym}</span>
            </p>
          )}
        </div>

        <Leaderboard
          rankings={rankings}
          highlightPseudonym={pseudonym ?? undefined}
        />

        <button
          onClick={handlePlayAgain}
          className="w-full bg-wine-600 text-white rounded-xl py-3 font-semibold hover:bg-wine-700 transition-colors"
        >
          Play Another Session
        </button>
      </div>
    </div>
  );
}
