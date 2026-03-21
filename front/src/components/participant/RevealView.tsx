import React from 'react';
import type { QuestionPayload, ParticipantRevealPayload } from '../../types/events';

const CATEGORY_LABELS: Record<string, string> = {
  color: 'Color',
  country: 'Country',
  grape_variety: 'Grape Variety',
  vintage_year: 'Vintage Year',
};

interface RevealViewProps {
  question: QuestionPayload;
  revealData: ParticipantRevealPayload;
  selectedOptionId: string | null;
}

export function RevealView({ question, revealData, selectedOptionId }: RevealViewProps) {
  const { correctOptionId, myPoints, myTotalScore } = revealData;
  const isCorrect = myPoints > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col px-4 py-8">
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium bg-slate-100 text-slate-500 rounded-full px-3 py-1">
            {CATEGORY_LABELS[question.category] ?? question.category}
          </span>
          <div className="text-sm text-slate-400">
            R{question.roundIndex + 1} · Q{question.questionIndex + 1}/{question.totalQuestions}
          </div>
        </div>

        {/* Score delta */}
        <div
          className={`rounded-2xl p-4 text-center ${
            isCorrect
              ? 'bg-emerald-50 border border-emerald-200'
              : selectedOptionId
                ? 'bg-red-50 border border-red-200'
                : 'bg-slate-100 border border-slate-200'
          }`}
        >
          <p
            className={`text-3xl font-bold ${
              isCorrect ? 'text-emerald-600' : selectedOptionId ? 'text-red-500' : 'text-slate-400'
            }`}
          >
            {isCorrect ? '+100 pts' : selectedOptionId ? '0 pts' : 'No answer'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Total: <span className="font-semibold text-slate-700">{myTotalScore} pts</span>
          </p>
        </div>

        {/* Question */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-lg font-semibold text-slate-800 text-center mb-4">
            {question.prompt}
          </p>

          <div className="grid grid-cols-1 gap-3">
            {question.options.map((opt, i) => {
              const isCorrectOpt = opt.id === correctOptionId;
              const isSelected = opt.id === selectedOptionId;
              const isWrong = isSelected && !isCorrectOpt;

              return (
                <div
                  key={opt.id}
                  className={`rounded-xl border px-5 py-3 text-sm font-medium ${
                    isCorrectOpt
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : isWrong
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <span className="font-bold mr-2 text-slate-400">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt.text}
                  {isCorrectOpt && <span className="ml-2">✓</span>}
                  {isWrong && <span className="ml-2">✗</span>}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm">
          Waiting for the host to continue…
        </p>
      </div>
    </div>
  );
}
