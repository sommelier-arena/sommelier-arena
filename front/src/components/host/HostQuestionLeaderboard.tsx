import React from 'react';
import { Leaderboard } from '../common/Leaderboard';
import type { RankingEntry } from '../../types/events';

interface HostQuestionLeaderboardProps {
  rankings: RankingEntry[];
  questionIndex: number;
  totalQuestions: number;
  onNext: () => void;
  onEnd: () => void;
}

export function HostQuestionLeaderboard({
  rankings,
  questionIndex,
  totalQuestions,
  onNext,
  onEnd,
}: HostQuestionLeaderboardProps) {
  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <p className="text-sm text-slate-500 uppercase tracking-widest mb-1">
          After Question {questionIndex + 1} of {totalQuestions}
        </p>
        <h2 className="text-2xl font-bold text-slate-800">Leaderboard</h2>
      </div>

      <Leaderboard rankings={rankings} />

      <div className="flex gap-3">
        <button
          onClick={onNext}
          className="flex-1 bg-wine-600 text-white rounded-xl py-3 font-semibold hover:bg-wine-700 transition-colors"
        >
          {questionIndex === totalQuestions - 1 ? 'See Round Results' : 'Next Question'}
        </button>
        <button
          onClick={onEnd}
          className="border border-red-200 text-red-400 rounded-xl py-3 px-5 font-semibold hover:bg-red-50 transition-colors"
        >
          End
        </button>
      </div>
    </div>
  );
}
