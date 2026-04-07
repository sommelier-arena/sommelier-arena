import React from 'react';

export function SessionEnded() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-5xl">🔌</p>
        <h2 className="text-2xl font-bold text-slate-700">Tasting Ended</h2>
        <p className="text-slate-500">
          The host has closed the tasting. Thanks for playing!
        </p>
        <a
          href="/"
          className="inline-block mt-4 bg-wine-600 text-white rounded-xl px-6 py-3 font-semibold hover:bg-wine-700 transition-colors"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
