import { useCallback, useEffect, useRef, useState } from 'react';
import { WINE_ANSWERS_URL } from '../../lib/wine-answers';

const CATEGORIES = [
  'color',
  'region',
  'grape_variety',
  'vintage_year',
  'wine_name',
] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  color: 'Color',
  region: 'Region',
  grape_variety: 'Grape Variety',
  vintage_year: 'Vintage Year',
  wine_name: 'Wine Name',
};

type AnswersMap = Record<Category, string[]>;

function getStoredSecret(): string | null {
  try {
    return sessionStorage.getItem('admin_secret');
  } catch {
    return null;
  }
}

function storeSecret(secret: string) {
  try {
    sessionStorage.setItem('admin_secret', secret);
  } catch {
    // ignore
  }
}

function clearSecret() {
  try {
    sessionStorage.removeItem('admin_secret');
  } catch {
    // ignore
  }
}

interface AdminAppProps {
  children?: React.ReactNode;
}

export function AdminApp({ children }: AdminAppProps) {
  const [secret, setSecret] = useState<string | null>(getStoredSecret);

  if (!secret) {
    return <LoginScreen onLogin={setSecret} />;
  }

  return <Dashboard secret={secret} onLogout={() => { clearSecret(); setSecret(null); }} />;
}

/* ------------------------------------------------------------------ */
/*  Login Screen                                                      */
/* ------------------------------------------------------------------ */

function LoginScreen({ onLogin }: { onLogin: (s: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter the admin secret.');
      return;
    }
    storeSecret(trimmed);
    onLogin(trimmed);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-5"
      >
        <h1 className="text-2xl font-bold text-wine-700 text-center">Admin Login</h1>
        <p className="text-slate-500 text-sm text-center">
          Enter the admin secret to manage wine answers.
        </p>

        <label className="block">
          <span className="sr-only">Admin secret</span>
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder="Admin secret"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-wine-400"
          />
        </label>

        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-wine-600 hover:bg-wine-700 text-white font-semibold py-2 transition-colors"
        >
          Login
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                         */
/* ------------------------------------------------------------------ */

function Dashboard({ secret, onLogout }: { secret: string; onLogout: () => void }) {
  const [answers, setAnswers] = useState<AnswersMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selected, setSelected] = useState<Category>('color');

  const fetchAnswers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(`${WINE_ANSWERS_URL}/answers`);
      if (!res.ok) throw new Error(`Failed to load answers (${res.status})`);
      const data: AnswersMap = await res.json();
      setAnswers(data);
    } catch (err: any) {
      setFetchError(err.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnswers();
  }, [fetchAnswers]);

  if (loading && !answers) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400">Loading answers…</div>
    );
  }

  if (fetchError && !answers) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <p className="text-red-600" role="alert">{fetchError}</p>
        <button
          onClick={fetchAnswers}
          className="rounded-lg bg-wine-600 hover:bg-wine-700 text-white px-4 py-2 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const data = answers!;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-wine-700">Wine Answers</h1>
        <button
          onClick={onLogout}
          className="text-sm text-slate-500 hover:text-wine-600 transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar — category tabs */}
        <nav className="md:w-56 flex-shrink-0" aria-label="Categories">
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {CATEGORIES.map((cat) => {
              const count = data[cat]?.length ?? 0;
              const isActive = cat === selected;
              return (
                <li key={cat}>
                  <button
                    onClick={() => setSelected(cat)}
                    className={`w-full text-left rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-between gap-2 whitespace-nowrap ${
                      isActive
                        ? 'bg-wine-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-wine-50'
                    }`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span>{CATEGORY_LABELS[cat]}</span>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 ${
                        isActive ? 'bg-wine-700 text-wine-100' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main content */}
        <CategoryPanel
          category={selected}
          values={data[selected] ?? []}
          secret={secret}
          onUpdated={fetchAnswers}
          onAuthError={onLogout}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Panel                                                    */
/* ------------------------------------------------------------------ */

function CategoryPanel({
  category,
  values,
  secret,
  onUpdated,
  onAuthError,
}: {
  category: Category;
  values: string[];
  secret: string;
  onUpdated: () => Promise<void>;
  onAuthError: () => void;
}) {
  const [newValue, setNewValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNewValue('');
    setError('');
  }, [category]);

  const authHeaders = {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newValue.trim();
    if (!trimmed) return;

    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${WINE_ANSWERS_URL}/answers/${category}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ value: trimmed }),
      });
      if (res.status === 401) {
        clearSecret();
        onAuthError();
        return;
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Failed (${res.status})`);
      }
      setNewValue('');
      await onUpdated();
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err.message ?? 'Network error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (value: string) => {
    setBusy(true);
    setError('');
    try {
      const encoded = encodeURIComponent(value);
      const res = await fetch(`${WINE_ANSWERS_URL}/answers/${category}/${encoded}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.status === 401) {
        clearSecret();
        onAuthError();
        return;
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Failed (${res.status})`);
      }
      await onUpdated();
    } catch (err: any) {
      setError(err.message ?? 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">
        {CATEGORY_LABELS[category]}
        <span className="ml-2 text-sm font-normal text-slate-400">({values.length})</span>
      </h2>

      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

      {/* Values list */}
      {values.length === 0 ? (
        <p className="text-slate-400 text-sm italic">No values yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
          {values.map((v) => (
            <li key={v} className="flex items-center justify-between py-2 px-1 group">
              <span className="text-slate-700 text-sm">{v}</span>
              <button
                onClick={() => handleDelete(v)}
                disabled={busy}
                title={`Delete "${v}"`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-red-400 hover:text-red-600 transition-opacity disabled:opacity-30"
                aria-label={`Delete ${v}`}
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <label className="sr-only" htmlFor={`add-${category}`}>
          New {CATEGORY_LABELS[category]} value
        </label>
        <input
          id={`add-${category}`}
          ref={inputRef}
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={`Add ${CATEGORY_LABELS[category].toLowerCase()}…`}
          disabled={busy}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wine-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !newValue.trim()}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </section>
  );
}
