import React from 'react';

interface TimerProps {
  remainingMs: number;
}

export function Timer({ remainingMs }: TimerProps) {
  const seconds = Math.ceil(remainingMs / 1000);

  const colorClass =
    seconds > 30
      ? 'text-slate-700'
      : seconds > 10
        ? 'text-amber-500'
        : 'text-red-500';

  return (
    <div
      role="timer"
      aria-label={`Time remaining: ${seconds} second${seconds === 1 ? '' : 's'}`}
      aria-live="off"
      className={`text-4xl font-bold tabular-nums motion-safe:transition-colors ${colorClass}`}
    >
      {seconds}
      <span className="text-base font-normal text-slate-400 ml-1" aria-hidden="true">s</span>
    </div>
  );
}
