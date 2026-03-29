import React from 'react';
import { Leaderboard } from '../common/Leaderboard';
import type { RankingEntry } from '../../types/events';

interface HostFinalLeaderboardProps {
  rankings: RankingEntry[];
  onNewTasting?: () => void;
}

export function HostFinalLeaderboard({ rankings, onNewTasting }: HostFinalLeaderboardProps) {
  return (
    <div className="w-full max-w-lg mx-auto space-y-6 text-center">
      <div>
        <p className="text-4xl mb-2">🏆</p>
        <h2 className="text-3xl font-bold text-slate-800">Final Results</h2>
        <p className="text-slate-500 mt-1">The tasting has ended.</p>
      </div>

      <Leaderboard rankings={rankings} />

      <p className="text-slate-400 text-sm">
        Participants will see this screen until they close their tab.
      </p>

      {onNewTasting && (
        <button
          onClick={onNewTasting}
          className="w-full bg-wine-600 text-white rounded-xl py-3 font-semibold hover:bg-wine-700 transition-colors"
        >
          ➕ Create a new blind tasting
        </button>
      )}
    </div>
  );
}
