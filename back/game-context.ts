/**
 * game-context.ts
 *
 * Minimal interface exposing the GameSession state and helpers that extracted
 * handler modules need. The GameSession class implements this interface and
 * passes `this` when calling handlers.
 */
import type * as Party from 'partykit/server';
import type { SessionPhase, Wine, Participant, SessionListEntry } from './types';
import type { TimerManager } from './timer';

export interface GameContext {
  // ── Core state ─────────────────────────────────────────────────────────────
  room: Party.Room;
  wines: Wine[];
  phase: SessionPhase;
  timerSeconds: number;
  currentRound: number;
  currentQuestion: number;
  hostId: string | null;
  sessionTitle: string;
  createdAt: string;
  hostConnectionId: string | null;
  hostDisconnectedAt: number | null;
  readonly timer: TimerManager;
  participants: Map<string, Participant>;
  inFlightAnswers: Map<string, string>;

  // ── Helpers exposed to handlers ────────────────────────────────────────────
  broadcast(type: string, data: object, exclude?: string[]): void;
  broadcastQuestion(): Promise<void>;
  saveState(): Promise<void>;
  upsertKvSession(update: {
    status?: 'waiting' | 'active' | 'ended';
    finalRankings?: { pseudonym: string; score: number }[];
  }): Promise<void>;
  endGame(): Promise<void>;
  getLobbyParticipants(): string[];
  startTimer(): Promise<void>;
  buildQuestionPayload(): object;
}
