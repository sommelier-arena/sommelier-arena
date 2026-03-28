import type * as Party from 'partykit/server';
import type { SessionPhase, Wine, Participant, SessionListEntry, SavedState } from './types';
export type { SessionPhase, Wine, Participant, SessionListEntry, SavedState };
export type { QuestionCategory, AnswerOption, Question, ParticipantAnswer } from './types';
import { TimerManager } from './timer';
import type { GameContext } from './game-context';

import {
  handleCreateSession,
  handleRejoinHost,
  handleJoinSession,
  handleRejoinSession,
} from './handlers/session';
import {
  handleHostStart,
  handleHostPause,
  handleHostResume,
  handleHostReveal,
  handleHostNext,
  handleHostEnd,
  handleSubmitAnswer,
} from './handlers/game-flow';
import { startTimer, handleTimerExpiry } from './handlers/timer';
import { saveState, upsertKvSession, endGame } from './persistence';
import { buildQuestionPayload, broadcastQuestion, getLobbyParticipants, broadcast } from './question';

// ─── GameSession Durable Object ───────────────────────────────────────────────

export default class GameSession implements Party.Server, GameContext {
  // ── In-memory state (restored from disk in onStart) ──────────────────────
  wines: Wine[] = [];
  phase: SessionPhase = 'waiting';
  timerSeconds = 60;
  currentRound = 0;
  currentQuestion = 0;
  hostId: string | null = null;
  sessionTitle = '';
  createdAt = '';
  hostConnectionId: string | null = null;
  readonly timer = new TimerManager();

  // Keyed by pseudonym (unique per session)
  participants = new Map<string, Participant>();
  // Keyed by `${participantId}:${questionId}`
  inFlightAnswers = new Map<string, string>();

  constructor(readonly room: Party.Room) {}

  // ── Restore persisted state when DO wakes ────────────────────────────────

  async onStart() {
    const state = await this.room.storage.get<SavedState>('state');
    if (state) {
      this.wines = state.wines;
      this.phase = state.phase;
      this.timerSeconds = state.timerSeconds;
      this.currentRound = state.currentRound;
      this.currentQuestion = state.currentQuestion;
      this.hostId = state.hostId;
      this.sessionTitle = state.sessionTitle;
      this.createdAt = state.createdAt;
    }

    // Restore participants from disk
    const allKeys = await this.room.storage.list<Participant>();
    for (const [key, value] of allKeys) {
      if (key.startsWith('participant:')) {
        const pseudonym = key.slice('participant:'.length);
        this.participants.set(pseudonym, {
          ...value,
          socketId: '',
          connected: false,
          answeredQuestions: new Set(Array.isArray((value as any).answeredQuestions)
            ? (value as any).answeredQuestions
            : []),
        });
      }
    }
  }

  // ── New connection ────────────────────────────────────────────────────────

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify({
      type: 'server:state_snapshot',
      phase: this.phase,
      code: this.room.id,
    }));
  }

  // ── Message dispatcher ────────────────────────────────────────────────────

  async onMessage(message: string, sender: Party.Connection) {
    let event: { type: string; [key: string]: unknown };
    try {
      event = JSON.parse(message);
    } catch {
      return;
    }

    switch (event.type) {
      case 'create_session':
        await handleCreateSession(this, event, sender);
        break;
      case 'rejoin_host':
        await handleRejoinHost(this, event, sender);
        break;
      case 'join_session':
        await handleJoinSession(this, event, sender);
        break;
      case 'rejoin_session':
        await handleRejoinSession(this, event, sender);
        break;
      case 'host:start':
        await handleHostStart(this, sender);
        break;
      case 'host:pause':
        handleHostPause(this, sender);
        break;
      case 'host:resume':
        await handleHostResume(this, sender);
        break;
      case 'host:reveal':
        await handleHostReveal(this, sender);
        break;
      case 'host:next':
        await handleHostNext(this, sender);
        break;
      case 'host:end':
        await handleHostEnd(this, sender);
        break;
      case 'submit_answer':
        handleSubmitAnswer(this, event, sender);
        break;
    }
  }

  // ── Connection closed ─────────────────────────────────────────────────────

  onClose(conn: Party.Connection) {
    if (conn.id === this.hostConnectionId) {
      this.hostConnectionId = null;
      if (this.phase !== 'waiting' && this.phase !== 'ended') {
        this.timer.clear();
        void this.endGame();
      }
      return;
    }

    for (const [, participant] of this.participants) {
      if (participant.socketId === conn.id) {
        participant.connected = false;
        if (this.phase === 'waiting') {
          this.broadcast('lobby:updated', {
            participants: this.getLobbyParticipants(),
            count: this.participants.size,
          });
        }
        break;
      }
    }
  }

  // ── Alarm: authoritative timer expiry ────────────────────────────────────

  async alarm() {
    await handleTimerExpiry(this);
  }

  // ── GameContext interface implementation (delegates to extracted modules) ──

  async saveState(): Promise<void> { return saveState(this); }
  async upsertKvSession(update: Parameters<typeof upsertKvSession>[1]): Promise<void> {
    return upsertKvSession(this, update);
  }
  async endGame(): Promise<void> { return endGame(this); }
  async startTimer(): Promise<void> { return startTimer(this); }
  async broadcastQuestion(): Promise<void> { return broadcastQuestion(this); }
  buildQuestionPayload(): object { return buildQuestionPayload(this); }
  getLobbyParticipants(): string[] { return getLobbyParticipants(this); }
  broadcast(type: string, data: object, exclude?: string[]): void {
    return broadcast(this, type, data, exclude);
  }
}
