import React from 'react';
import { Timer } from '../common/Timer';
import type { QuestionPayload } from '../../types/events';

const CATEGORY_LABELS: Record<string, string> = {
  color: 'Color',
  region: 'Region',
  grape_variety: 'Grape Variety',
  vintage_year: 'Vintage Year',
  wine_name: 'Wine Name',
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

        {/* Question prompt */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xl font-semibold text-slate-800 text-center">
            {question.prompt}
          </p>
        </div>

        {/* Options — 2×2 grid: A+B on row 1, C+D on row 2 */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {question.options.map((opt, i) => {
            const isSelected = opt.id === selectedOptionId;
            return (
              <button
                key={opt.id}
                onClick={() => onSelect(opt.id)}
                aria-pressed={isSelected}
                className={`w-full text-left rounded-xl border px-4 py-2.5 font-medium text-sm transition-colors flex items-center ${
                  isSelected
                    ? 'border-wine-400 bg-wine-100 text-wine-800 ring-2 ring-wine-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-wine-300 hover:bg-wine-50'
                }`}
              >
                <span className="font-bold text-slate-400 mr-2">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt.text}
              </button>
            );
          })}
        </div>

        {selectedOptionId && (
          <p className="text-center text-slate-400 text-sm">
            Selection recorded — you can change it until the host reveals.
          </p>
        )}
      </div>
    </div>
  );
}

