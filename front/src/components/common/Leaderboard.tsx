import React from 'react';
import type { RankingEntry } from '../../types/events';

interface LeaderboardProps {
  rankings: RankingEntry[];
  highlightPseudonym?: string;
}

export function Leaderboard({ rankings, highlightPseudonym }: LeaderboardProps) {
  return (
    <ol className="space-y-2 w-full">
      {rankings.map((entry, index) => {
        const isHighlighted = entry.pseudonym === highlightPseudonym;
        return (
          <li
            key={entry.pseudonym}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
              isHighlighted
                ? 'bg-violet-50 border-violet-300 font-semibold'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${
                  index === 0
                    ? 'bg-amber-100 text-amber-700'
                    : index === 1
                      ? 'bg-slate-100 text-slate-600'
                      : index === 2
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-slate-50 text-slate-400'
                }`}
              >
                {index + 1}
              </span>
              <span className="text-slate-800">{entry.pseudonym}</span>
            </div>
            <span className="text-violet-600 font-bold">{entry.score} pts</span>
          </li>
        );
      })}
    </ol>
  );
}
