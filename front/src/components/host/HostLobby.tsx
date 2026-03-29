import React from 'react';

interface HostLobbyProps {
  code: string;
  participants: string[];
  onStart: () => void;
  onEdit?: () => void;
}

export function HostLobby({ code, participants, onStart, onEdit }: HostLobbyProps) {
  return (
    <div className="w-full max-w-lg mx-auto space-y-8 text-center">
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">
            Waiting Room
          </h2>
          <span className="text-sm text-slate-400">
            {participants.length} / 10
          </span>
        </div>

        {participants.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">
            No participants yet…
          </p>
        ) : (
          <ul className="space-y-2">
            {participants.map((p) => (
              <li
                key={p}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onStart}
        disabled={participants.length === 0}
        className="w-full bg-wine-600 text-white rounded-xl py-4 font-semibold text-lg hover:bg-wine-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Start Game
      </button>

      {onEdit && (
        <button
          onClick={onEdit}
          type="button"
          className="w-full border border-wine-300 text-wine-600 rounded-xl py-3 font-medium hover:bg-wine-50 transition-colors"
        >
          ✏️ Edit Wines
        </button>
      )}
    </div>
  );
}
