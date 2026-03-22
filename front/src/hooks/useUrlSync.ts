/**
 * useUrlSync.ts
 * Keeps the browser address bar in sync with app phase changes.
 *
 * Extracted here so HostApp and ParticipantApp remain phase routers only —
 * they don't need to know anything about history.replaceState.
 */
import { useEffect } from 'react';
import type { HostPhase } from '../stores/hostStore';
import type { ParticipantPhase } from '../stores/participantStore';

/**
 * Host URL sync:
 * - When a session is active (lobby / game phases): URL becomes /host?code=X&id=Y
 * - On dashboard or setup (no session): URL is reset to /host
 */
export function useHostUrlSync(
  phase: HostPhase,
  code: string | null,
  hostId: string,
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessionPhases: HostPhase[] = [
      'lobby',
      'question',
      'revealed',
      'roundLeaderboard',
      'finalLeaderboard',
    ];

    if (code && sessionPhases.includes(phase)) {
      const params = new URLSearchParams({ code, id: hostId });
      history.replaceState(null, '', `/host?${params.toString()}`);
    } else {
      history.replaceState(null, '', '/host');
    }
  }, [phase, code, hostId]);
}

/**
 * Participant URL sync:
 * - After joining (lobby and beyond): URL becomes /play?code=X
 * - On join form or after reset: URL is reset to /play
 */
export function useParticipantUrlSync(
  phase: ParticipantPhase,
  sessionCode: string | null,
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const activePhases: ParticipantPhase[] = [
      'lobby',
      'question',
      'revealed',
      'roundLeaderboard',
      'finalLeaderboard',
    ];

    if (sessionCode && activePhases.includes(phase)) {
      history.replaceState(null, '', `/play?code=${encodeURIComponent(sessionCode)}`);
    } else {
      history.replaceState(null, '', '/play');
    }
  }, [phase, sessionCode]);
}
