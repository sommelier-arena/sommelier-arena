import React from 'react';

export function SessionEnded() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-5xl">🔌</p>
        <h2 className="text-2xl font-bold text-slate-700">Session Ended</h2>
        <p className="text-slate-500">
          The host has closed the session. Thanks for playing!
        </p>
        <a
          href="/"
          className="inline-block mt-4 bg-gradient-to-br from-wine-700 to-wine-500 text-white rounded-xl px-6 py-3 font-semibold hover:from-wine-800 hover:to-wine-600 transition-colors"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
