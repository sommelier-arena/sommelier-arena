import React from 'react';
import { Timer } from '../common/Timer';
import type { QuestionPayload } from '../../types/events';

const CATEGORY_LABELS: Record<string, string> = {
  color: 'Color',
  country: 'Country',
  grape_variety: 'Grape Variety',
  vintage_year: 'Vintage Year',
};

interface QuestionViewProps {
  question: QuestionPayload;
  selectedOptionId: string | null;
  timerMs: number;
  onSelect: (optionId: string) => void;
}

export function QuestionView({
  question,
  selectedOptionId,
  timerMs,
  onSelect,
}: QuestionViewProps) {
  const isLocked = selectedOptionId !== null;

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

        {/* Timer */}
        <div className="flex justify-center">
          <Timer remainingMs={timerMs} />
        </div>

        {/* Question */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xl font-semibold text-slate-800 text-center">
            {question.prompt}
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3 flex-1">
          {question.options.map((opt, i) => {
            const isSelected = opt.id === selectedOptionId;
            return (
              <button
                key={opt.id}
                onClick={() => !isLocked && onSelect(opt.id)}
                disabled={isLocked}
                className={`w-full text-left rounded-xl border px-5 py-4 font-medium text-base transition-colors min-h-[56px] ${
                  isSelected
                    ? 'border-violet-400 bg-violet-50 text-violet-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-white'
                }`}
              >
                <span className="font-bold text-slate-400 mr-3">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt.text}
              </button>
            );
          })}
        </div>

        {isLocked && (
          <p className="text-center text-slate-400 text-sm">
            Answer locked in — waiting for the host to reveal.
          </p>
        )}
      </div>
    </div>
  );
}
