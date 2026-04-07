import React, { useState, useEffect } from 'react';
import type { CreateSessionPayload, CreateWinePayload, QuestionCategory } from '../../types/events';
import { ComboboxInput } from '../common/ComboboxInput';
import { WINE_ANSWERS_URL } from '../../lib/wine-answers';

const CATEGORIES: { key: QuestionCategory; label: string }[] = [
  { key: 'color', label: 'Color' },
  { key: 'region', label: 'Region' },
  { key: 'grape_variety', label: 'Grape Variety' },
  { key: 'vintage_year', label: 'Vintage Year' },
  { key: 'wine_name', label: 'Wine Name' },
];

// Autocomplete defaults per category — host edits to match their actual wine
const DISTRACTOR_DEFAULTS: Record<QuestionCategory, [string, string, string]> = {
  color: ['Blanc', 'Rosé', 'Orange'],
  region: ['Loire', 'Bourgogne', 'Languedoc'],
  grape_variety: ['Pinot Noir', 'Syrah', 'Cabernet Sauvignon'],
  vintage_year: ['2015', '2016', '2018'],
  wine_name: ['Château Margaux', 'Château Lafite Rothschild', 'Château Latour'],
};

const CORRECT_ANSWER_DEFAULTS: Record<QuestionCategory, string> = {
  color: 'Rouge',
  region: 'Bordeaux',
  grape_variety: 'Merlot',
  vintage_year: '2019',
  wine_name: 'Château Pétrus',
};

const CORRECT_ANSWER_PLACEHOLDERS: Record<QuestionCategory, string> = {
  color: 'e.g. Rouge',
  region: 'e.g. Bordeaux (France)',
  grape_variety: 'e.g. Cabernet Sauvignon',
  vintage_year: 'e.g. 2019',
  wine_name: 'e.g. Château Pétrus',
};

const DISTRACTOR_PLACEHOLDERS: Record<QuestionCategory, [string, string, string]> = {
  color: ['e.g. Blanc', 'e.g. Rosé', 'e.g. Orange'],
  region: ['e.g. Burgundy (France)', 'e.g. Tuscany (Italy)', 'e.g. Rioja (Spain)'],
  grape_variety: ['e.g. Pinot Noir', 'e.g. Merlot', 'e.g. Syrah'],
  vintage_year: ['e.g. 2018', 'e.g. 2020', 'e.g. 2016'],
  wine_name: ['e.g. Château Margaux', 'e.g. Pétrus', 'e.g. Opus One'],
};

interface QuestionFormData {
  correctAnswer: string;
  distractors: [string, string, string];
}

type WineQuestions = Record<QuestionCategory, QuestionFormData>;

interface WineFormData {
  questions: WineQuestions;
}

function emptyWine(): WineFormData {
  return {
    questions: Object.fromEntries(
      CATEGORIES.map(({ key }) => [
        key,
        {
          correctAnswer: CORRECT_ANSWER_DEFAULTS[key],
          distractors: DISTRACTOR_DEFAULTS[key],
        },
      ]),
    ) as WineQuestions,
  };
}

function wineFromPayload(wine: CreateWinePayload): WineFormData {
  const questions = Object.fromEntries(
    CATEGORIES.map(({ key }) => {
      const q = wine.questions.find((q) => q.category === key);
      return [
        key,
        {
          correctAnswer: q?.correctAnswer ?? CORRECT_ANSWER_DEFAULTS[key],
          distractors: (q?.distractors ?? DISTRACTOR_DEFAULTS[key]) as [string, string, string],
        },
      ];
    }),
  ) as WineQuestions;
  return { questions };
}

interface SessionFormProps {
  onSubmit: (payload: CreateSessionPayload) => void;
  hostId?: string;
  /** Pre-filled wines for editing an existing session */
  initialWines?: CreateWinePayload[];
  /** Pre-filled title for editing an existing session */
  initialTitle?: string;
  /** When true, renders in edit mode (different heading + submit label) */
  isEditing?: boolean;
}

export function SessionForm({ onSubmit, hostId, initialWines, initialTitle, isEditing = false }: SessionFormProps) {
  const [wines, setWines] = useState<WineFormData[]>(() =>
    initialWines?.length ? initialWines.map(wineFromPayload) : [emptyWine()],
  );
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [title, setTitle] = useState(initialTitle ?? '');
  const [error, setError] = useState<string | null>(null);
  const [answerOptions, setAnswerOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch(`${WINE_ANSWERS_URL}/answers`)
      .then(res => res.json())
      .then(data => setAnswerOptions(data))
      .catch(() => {
        // Fallback to empty — the combobox still allows free text
      });
  }, []);

  const updateAnswer = (
    wi: number,
    cat: QuestionCategory,
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
        distractors[field as number] = value;
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
      for (const cat of CATEGORIES) {
        const q = wine.questions[cat.key];
        if (!q.correctAnswer.trim()) {
          setError(`Wine ${wi + 1} — ${cat.label}: correct answer is required.`);
          return;
        }
        for (const [di, d] of q.distractors.entries()) {
          if (!d.trim()) {
            setError(`Wine ${wi + 1} — ${cat.label}: distractor ${di + 1} is required.`);
            return;
          }
        }
      }
    }

    // Collect custom answers to persist
    const customAnswers: { category: string; value: string }[] = [];
    for (const wine of wines) {
      for (const cat of CATEGORIES) {
        const existing = answerOptions[cat.key] || [];
        const correctAnswer = wine.questions[cat.key].correctAnswer.trim();
        if (correctAnswer && !existing.includes(correctAnswer)) {
          customAnswers.push({ category: cat.key, value: correctAnswer });
        }
        for (const d of wine.questions[cat.key].distractors) {
          const trimmed = d.trim();
          if (trimmed && !existing.includes(trimmed)) {
            customAnswers.push({ category: cat.key, value: trimmed });
          }
        }
      }
    }

    // Fire-and-forget: persist custom answers to the collection
    for (const { category, value } of customAnswers) {
      fetch(`${WINE_ANSWERS_URL}/answers/${category}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      }).catch(() => {});  // Best-effort, don't block session creation
    }

    const payload: CreateSessionPayload = {
      wines: wines.map(
        (wine, wi): CreateWinePayload => ({
          name: wine.questions.wine_name.correctAnswer.trim() || `Wine ${wi + 1}`,
          questions: CATEGORIES.map((cat) => ({
            category: cat.key,
            correctAnswer: wine.questions[cat.key].correctAnswer.trim(),
            distractors: wine.questions[cat.key].distractors.map((d) =>
              d.trim(),
            ) as [string, string, string],
          })),
        }),
      ),
      timerSeconds,
      hostId: hostId ?? '',
      title: title.trim() || wines[0]?.questions.wine_name.correctAnswer.trim(),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">
          {isEditing ? 'Edit Blind Tasting' : 'New Blind Tasting'}
        </h1>
        <p className="text-slate-500 mt-1">Add wines and fill in the answers for each question.</p>
      </div>

      {/* Optional tasting title */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <label htmlFor="tasting-title" className="block text-sm font-semibold text-slate-700 mb-1">
          Tasting title <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="tasting-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g. "Friday Night Tasting"'
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-wine-400"
        />
        <p className="text-xs text-slate-400 mt-1">Leave blank to use the first wine's name (from the Wine Name answer) as title.</p>
      </div>

      {/* Timer slider */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <label htmlFor="timer-slider" className="block text-sm font-semibold text-slate-700">
          Timer per question:{' '}
          <span className="text-wine-600">{timerSeconds}s</span>
        </label>
        <input
          id="timer-slider"
          type="range"
          min={15}
          max={120}
          step={5}
          value={timerSeconds}
          onChange={(e) => setTimerSeconds(Number(e.target.value))}
          aria-valuemin={15}
          aria-valuemax={120}
          aria-valuenow={timerSeconds}
          aria-valuetext={`${timerSeconds} seconds`}
          className="w-full accent-wine-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>15s</span>
          <span>120s</span>
        </div>
      </div>

      {wines.map((wine, wi) => (
        <div key={wi} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-lg">
              Wine {wi + 1}
              {wine.questions.wine_name.correctAnswer && (
                <span className="ml-2 font-normal text-slate-500 text-base">
                  — {wine.questions.wine_name.correctAnswer}
                </span>
              )}
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

          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="space-y-2">
              <p className="text-sm font-semibold text-wine-600 uppercase tracking-wide">
                {cat.label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <ComboboxInput
                    id={`wine-${wi}-${cat.key}-correct`}
                    options={answerOptions[cat.key] || []}
                    value={wine.questions[cat.key].correctAnswer}
                    onChange={(val) => updateAnswer(wi, cat.key, 'correctAnswer', val)}
                    placeholder={CORRECT_ANSWER_PLACEHOLDERS[cat.key]}
                    label={`Wine ${wi + 1} ${cat.label} — correct answer`}
                    inputClassName="w-full border border-emerald-300 bg-emerald-50 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="absolute right-2 top-2 text-xs text-emerald-600 font-medium" aria-hidden="true">✓</span>
                </div>
                {wine.questions[cat.key].distractors.map((d, di) => (
                  <div key={di}>
                    <ComboboxInput
                      id={`wine-${wi}-${cat.key}-distractor-${di}`}
                      options={answerOptions[cat.key] || []}
                      value={d}
                      onChange={(val) => updateAnswer(wi, cat.key, di, val)}
                      placeholder={DISTRACTOR_PLACEHOLDERS[cat.key][di]}
                      label={`Wine ${wi + 1} ${cat.label} — distractor ${di + 1}`}
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
          className="flex-1 border border-wine-300 text-wine-600 rounded-xl py-3 font-medium hover:bg-wine-50 transition-colors"
        >
          + Add Wine
        </button>
        <button
          type="submit"
          className="flex-1 bg-wine-600 text-white rounded-xl py-3 font-semibold hover:bg-wine-700 transition-colors"
        >
          {isEditing ? 'Update Tasting' : 'Create Tasting'}
        </button>
      </div>
    </form>
  );
}
