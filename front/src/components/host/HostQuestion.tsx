import React from 'react';
import { Timer } from '../common/Timer';
import type { QuestionPayload } from '../../types/events';

const CATEGORY_LABELS: Record<string, string> = {
  color: 'Color',
  country: 'Country',
  grape_variety: 'Grape Variety',
  vintage_year: 'Vintage Year',
};

interface HostQuestionProps {
  question: QuestionPayload;
  answeredCount: number;
  totalCount: number;
  timerMs: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onReveal: () => void;
  onEnd: () => void;
}

export function HostQuestion({
  question,
  answeredCount,
  totalCount,
  timerMs,
  isPaused,
  onPause,
  onResume,
  onReveal,
  onEnd,
}: HostQuestionProps) {
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

      {/* Question card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <p className="text-xl font-semibold text-slate-800">{question.prompt}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt, i) => (
            <div
              key={opt.id}
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-600 bg-slate-50 text-sm"
            >
              <span className="font-medium text-slate-400 mr-2">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt.text}
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3">
        <div
          aria-live="polite"
          aria-atomic="true"
          className="text-slate-600 text-sm"
        >
          <span className="font-bold text-slate-800">{answeredCount}</span>
          <span className="text-slate-400"> / {totalCount} answered</span>
        </div>
        <div className="flex items-center gap-2">
          {isPaused && (
            <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-3 py-1 font-medium">
              Paused
            </span>
          )}
          <Timer remainingMs={timerMs} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {isPaused ? (
          <button
            onClick={onResume}
            className="flex-1 bg-emerald-500 text-white rounded-xl py-3 font-semibold hover:bg-emerald-600 transition-colors"
          >
            Resume
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-3 font-semibold hover:bg-slate-50 transition-colors"
          >
            Pause
          </button>
        )}
        <button
          onClick={onReveal}
          className="flex-1 bg-gradient-to-br from-wine-700 to-wine-500 text-white rounded-xl py-3 font-semibold hover:from-wine-800 hover:to-wine-600 transition-colors"
        >
          Reveal Answer
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
