import React, { useState } from 'react';
import type { CreateSessionPayload, CreateWinePayload } from '../../types/events';

const CATEGORIES = [
  { key: 'color', label: 'Color' },
  { key: 'country', label: 'Country' },
  { key: 'grape_variety', label: 'Grape Variety' },
  { key: 'vintage_year', label: 'Vintage Year' },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

interface QuestionFormData {
  correctAnswer: string;
  distractors: [string, string, string];
}

type WineQuestions = Record<CategoryKey, QuestionFormData>;

interface WineFormData {
  name: string;
  questions: WineQuestions;
}

function emptyWine(): WineFormData {
  return {
    name: '',
    questions: {
      color: { correctAnswer: '', distractors: ['', '', ''] },
      country: { correctAnswer: '', distractors: ['', '', ''] },
      grape_variety: { correctAnswer: '', distractors: ['', '', ''] },
      vintage_year: { correctAnswer: '', distractors: ['', '', ''] },
    },
  };
}

interface SessionFormProps {
  onSubmit: (payload: CreateSessionPayload) => void;
}

export function SessionForm({ onSubmit }: SessionFormProps) {
  const [wines, setWines] = useState<WineFormData[]>([emptyWine()]);
  const [error, setError] = useState<string | null>(null);

  const updateWineName = (wi: number, value: string) => {
    setWines((prev) => {
      const next = [...prev];
      next[wi] = { ...next[wi], name: value };
      return next;
    });
  };

  const updateAnswer = (
    wi: number,
    cat: CategoryKey,
    field: 'correctAnswer' | number,
    value: string,
  ) => {
    setWines((prev) => {
      const next = [...prev];
      const wine = { ...next[wi] };
      const q = { ...wine.questions[cat] };
      if (field === 'correctAnswer') {
        q.correctAnswer = value;
      } else {
        const distractors = [...q.distractors] as [string, string, string];
        distractors[field] = value;
        q.distractors = distractors;
      }
      wine.questions = { ...wine.questions, [cat]: q };
      next[wi] = wine;
      return next;
    });
  };

  const addWine = () => setWines((prev) => [...prev, emptyWine()]);

  const removeWine = (wi: number) =>
    setWines((prev) => prev.filter((_, i) => i !== wi));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    for (const [wi, wine] of wines.entries()) {
      if (!wine.name.trim()) {
        setError(`Wine ${wi + 1}: name is required.`);
        return;
      }
      for (const cat of CATEGORIES) {
        const q = wine.questions[cat.key];
        if (!q.correctAnswer.trim()) {
          setError(`Wine ${wi + 1} — ${cat.label}: correct answer is required.`);
          return;
        }
        for (const [di, d] of q.distractors.entries()) {
          if (!d.trim()) {
            setError(
              `Wine ${wi + 1} — ${cat.label}: distractor ${di + 1} is required.`,
            );
            return;
          }
        }
      }
    }

    const payload: CreateSessionPayload = {
      wines: wines.map(
        (wine): CreateWinePayload => ({
          name: wine.name.trim(),
          questions: CATEGORIES.map((cat) => ({
            category: cat.key,
            correctAnswer: wine.questions[cat.key].correctAnswer.trim(),
            distractors: wine.questions[cat.key].distractors.map((d) =>
              d.trim(),
            ) as [string, string, string],
          })),
        }),
      ),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">New Session</h1>
        <p className="text-slate-500 mt-1">Add wines and fill in the answers for each question.</p>
      </div>

      {wines.map((wine, wi) => (
        <div key={wi} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-lg">
              Wine {wi + 1}
            </h2>
            {wines.length > 1 && (
              <button
                type="button"
                onClick={() => removeWine(wi)}
                className="text-sm text-red-400 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          <div>
            <label
              htmlFor={`wine-name-${wi}`}
              className="block text-sm font-medium text-slate-600 mb-1"
            >
              Wine name
            </label>
            <input
              id={`wine-name-${wi}`}
              type="text"
              value={wine.name}
              onChange={(e) => updateWineName(wi, e.target.value)}
              placeholder="e.g. Château Margaux 2015"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="space-y-2">
              <p className="text-sm font-semibold text-violet-600 uppercase tracking-wide">
                {cat.label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <label
                    htmlFor={`wine-${wi}-${cat.key}-correct`}
                    className="sr-only"
                  >
                    Wine {wi + 1} {cat.label} — correct answer
                  </label>
                  <input
                    id={`wine-${wi}-${cat.key}-correct`}
                    type="text"
                    value={wine.questions[cat.key].correctAnswer}
                    onChange={(e) =>
                      updateAnswer(wi, cat.key, 'correctAnswer', e.target.value)
                    }
                    placeholder="Correct answer"
                    className="w-full border border-emerald-300 bg-emerald-50 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="absolute right-2 top-2 text-xs text-emerald-600 font-medium" aria-hidden="true">
                    ✓
                  </span>
                </div>
                {wine.questions[cat.key].distractors.map((d, di) => (
                  <div key={di}>
                    <label
                      htmlFor={`wine-${wi}-${cat.key}-distractor-${di}`}
                      className="sr-only"
                    >
                      Wine {wi + 1} {cat.label} — distractor {di + 1}
                    </label>
                    <input
                      id={`wine-${wi}-${cat.key}-distractor-${di}`}
                      type="text"
                      value={d}
                      onChange={(e) =>
                        updateAnswer(wi, cat.key, di, e.target.value)
                      }
                      placeholder={`Distractor ${di + 1}`}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {error && (
        <p role="alert" className="text-red-500 text-sm text-center">{error}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={addWine}
          className="flex-1 border border-violet-300 text-violet-600 rounded-xl py-3 font-medium hover:bg-violet-50 transition-colors"
        >
          + Add Wine
        </button>
        <button
          type="submit"
          className="flex-1 bg-violet-600 text-white rounded-xl py-3 font-semibold hover:bg-violet-700 transition-colors"
        >
          Create Session
        </button>
      </div>
    </form>
  );
}
