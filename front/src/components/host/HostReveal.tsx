import React from 'react';
import type { QuestionPayload, HostRevealPayload } from '../../types/events';

const CATEGORY_LABELS: Record<string, string> = {
  color: 'Color',
  country: 'Country',
  grape_variety: 'Grape Variety',
  vintage_year: 'Vintage Year',
};

interface HostRevealProps {
  question: QuestionPayload;
  revealData: HostRevealPayload;
  onNext: () => void;
  onEnd: () => void;
}

export function HostReveal({
  question,
  revealData,
  onNext,
  onEnd,
}: HostRevealProps) {
  const correctId = revealData.correctOptionId;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Round {question.roundIndex + 1}/{question.totalRounds} · Q{question.questionIndex + 1}/{question.totalQuestions}
        </div>
        <span className="text-xs font-medium bg-slate-100 text-slate-600 rounded-full px-3 py-1">
          {CATEGORY_LABELS[question.category] ?? question.category}
        </span>
      </div>

      {/* Question card with highlighted answer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <p className="text-xl font-semibold text-slate-800">{question.prompt}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt, i) => {
            const isCorrect = opt.id === correctId;
            return (
              <div
                key={opt.id}
                className={`border rounded-xl px-4 py-3 text-sm ${
                  isCorrect
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                <span className="font-medium mr-2">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt.text}
                {isCorrect && (
                  <span className="ml-2 text-emerald-500">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Score deltas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">
          Score Update
        </h3>
        <ul className="space-y-2">
          {revealData.results.map((r) => (
            <li
              key={r.pseudonym}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-700">{r.pseudonym}</span>
              <div className="flex items-center gap-3">
                <span
                  className={`font-bold ${r.points > 0 ? 'text-emerald-500' : 'text-slate-400'}`}
                >
                  {r.points > 0 ? `+${r.points}` : '—'}
                </span>
                <span className="text-slate-500 w-20 text-right">
                  {r.totalScore} pts
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={onNext}
          className="flex-1 bg-gradient-to-br from-wine-700 to-wine-500 text-white rounded-xl py-3 font-semibold hover:from-wine-800 hover:to-wine-600 transition-colors"
        >
          Next
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
