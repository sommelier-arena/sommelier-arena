import React, { useState } from 'react';

interface JoinFormProps {
  onJoin: (code: string) => void;
  error: string | null;
}

export function JoinForm({ onJoin, error }: JoinFormProps) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) return;
    onJoin(trimmed);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <p className="text-4xl mb-3">🍷</p>
          <h1 className="text-3xl font-bold text-slate-800">Join Session</h1>
          <p className="text-slate-500 mt-2">Enter the 4-digit code from your host.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="session-code"
              className="block text-sm font-medium text-slate-600 text-left"
            >
              Session code
            </label>
            <input
              id="session-code"
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              aria-describedby={error ? 'join-error' : undefined}
              className="w-full text-center text-4xl font-bold font-mono tracking-widest border-2 border-slate-300 rounded-2xl px-4 py-5 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-wine-400 bg-white"
            />
          </div>

          {error && (
            <p id="join-error" role="alert" className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={code.length !== 4}
            className="w-full bg-gradient-to-br from-wine-700 to-wine-500 text-white rounded-xl py-4 font-semibold text-lg hover:from-wine-800 hover:to-wine-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  );
}
