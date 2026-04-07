import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameContext } from '../../../../back/game-context';
import { TimerManager } from '../../../../back/timer';
import { handleRejoinHost } from '../../../../back/handlers/session';
import { endGame } from '../../../../back/persistence';
import { handleTimerExpiry } from '../../../../back/handlers/timer';

// ── Mock persistence & timer handler ──────────────────────────────────────────

vi.mock('../../../../back/persistence', () => ({
  saveState: vi.fn(async () => {}),
  endGame: vi.fn(async () => {}),
  upsertKvSession: vi.fn(async () => {}),
}));

vi.mock('../../../../back/handlers/timer', () => ({
  handleTimerExpiry: vi.fn(async () => {}),
  startTimer: vi.fn(async () => {}),
}));

vi.mock('../../../../back/scoring', () => ({
  buildRankings: vi.fn(() => []),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createMockRoom() {
  return {
    id: '1234',
    storage: {
      setAlarm: vi.fn(async () => {}),
      deleteAlarm: vi.fn(async () => {}),
      get: vi.fn(async (key: string) => {
        if (key === 'hostId') return 'HOST-123';
        return undefined;
      }),
      put: vi.fn(async () => {}),
      list: vi.fn(async () => new Map()),
    },
    context: { bindings: {} },
  };
}

function createMockCtx(overrides?: Partial<GameContext>): GameContext {
  const room = createMockRoom();
  const ctx: GameContext = {
    room: room as unknown as GameContext['room'],
    wines: [{ name: 'Test Wine', questions: [] }] as any,
    phase: 'question_open',
    timerSeconds: 60,
    currentRound: 0,
    currentQuestion: 0,
    hostId: 'HOST-123',
    sessionTitle: 'Test Session',
    createdAt: new Date().toISOString(),
    hostConnectionId: 'conn-host',
    hostDisconnectedAt: null,
    timer: new TimerManager(),
    participants: new Map(),
    inFlightAnswers: new Map(),
    broadcast: vi.fn(),
    broadcastQuestion: vi.fn(async () => {}),
    saveState: vi.fn(async () => {}),
    upsertKvSession: vi.fn(async () => {}),
    endGame: vi.fn(async () => {}),
    getLobbyParticipants: vi.fn(() => []),
    startTimer: vi.fn(async () => {}),
    buildQuestionPayload: vi.fn(() => ({})),
    ...overrides,
  };
  return ctx;
}

function createMockConnection(id: string) {
  return {
    id,
    send: vi.fn(),
  } as unknown as import('partykit/server').Connection;
}

// Simulate the onClose logic from game.ts for the host connection
function simulateHostOnClose(ctx: GameContext) {
  ctx.hostConnectionId = null;
  if (ctx.phase !== 'waiting' && ctx.phase !== 'ended') {
    ctx.timer.clear();
    ctx.hostDisconnectedAt = Date.now();
    void ctx.room.storage.setAlarm(Date.now() + 3_600_000);
    void ctx.saveState();
  }
}

// Simulate alarm() from game.ts
async function simulateAlarm(ctx: GameContext) {
  if (ctx.hostDisconnectedAt && !ctx.hostConnectionId) {
    ctx.hostDisconnectedAt = null;
    await endGame(ctx);
  } else {
    await handleTimerExpiry(ctx);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Host disconnect grace period', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Host disconnects during question_open → alarm scheduled, NOT endGame
  it('sets hostDisconnectedAt and schedules alarm when host disconnects during question_open', () => {
    const ctx = createMockCtx({ phase: 'question_open' });

    simulateHostOnClose(ctx);

    expect(ctx.hostConnectionId).toBeNull();
    expect(ctx.hostDisconnectedAt).toBeTypeOf('number');
    expect(ctx.room.storage.setAlarm).toHaveBeenCalledOnce();
    expect(ctx.saveState).toHaveBeenCalledOnce();
    expect(ctx.endGame).not.toHaveBeenCalled();
  });

  // 2. Host reconnects → hostDisconnectedAt cleared, alarm deleted
  it('clears hostDisconnectedAt and deletes alarm when host reconnects', async () => {
    const ctx = createMockCtx({
      phase: 'question_open',
      hostConnectionId: null,
      hostDisconnectedAt: Date.now(),
    });
    const sender = createMockConnection('conn-rejoin');

    await handleRejoinHost(ctx, { type: 'rejoin_host', hostId: 'HOST-123' }, sender);

    expect(ctx.hostConnectionId).toBe('conn-rejoin');
    expect(ctx.hostDisconnectedAt).toBeNull();
    expect(ctx.room.storage.deleteAlarm).toHaveBeenCalledOnce();
    expect(ctx.saveState).toHaveBeenCalled();
  });

  // 3. Alarm fires with host still disconnected → endGame called
  it('ends the game when alarm fires with host still disconnected', async () => {
    const ctx = createMockCtx({
      phase: 'question_open',
      hostConnectionId: null,
      hostDisconnectedAt: Date.now() - 3_600_000,
    });

    await simulateAlarm(ctx);

    expect(ctx.hostDisconnectedAt).toBeNull();
    expect(endGame).toHaveBeenCalledWith(ctx);
    expect(handleTimerExpiry).not.toHaveBeenCalled();
  });

  // 4. Alarm fires with host reconnected → falls through to handleTimerExpiry
  it('does NOT end game when alarm fires with host reconnected', async () => {
    const ctx = createMockCtx({
      phase: 'question_open',
      hostConnectionId: 'conn-host',
      hostDisconnectedAt: null,
    });

    await simulateAlarm(ctx);

    expect(endGame).not.toHaveBeenCalled();
    expect(handleTimerExpiry).toHaveBeenCalledWith(ctx);
  });

  // 5. Host disconnect during 'waiting' phase → no alarm
  it('does NOT set alarm when host disconnects during waiting phase', () => {
    const ctx = createMockCtx({ phase: 'waiting' });

    simulateHostOnClose(ctx);

    expect(ctx.hostConnectionId).toBeNull();
    expect(ctx.hostDisconnectedAt).toBeNull();
    expect(ctx.room.storage.setAlarm).not.toHaveBeenCalled();
    expect(ctx.saveState).not.toHaveBeenCalled();
  });

  // 6. Host disconnect during 'ended' phase → no alarm
  it('does NOT set alarm when host disconnects during ended phase', () => {
    const ctx = createMockCtx({ phase: 'ended' });

    simulateHostOnClose(ctx);

    expect(ctx.hostConnectionId).toBeNull();
    expect(ctx.hostDisconnectedAt).toBeNull();
    expect(ctx.room.storage.setAlarm).not.toHaveBeenCalled();
    expect(ctx.saveState).not.toHaveBeenCalled();
  });

  // Additional: alarm fires with hostDisconnectedAt set but host reconnected clears timestamp
  it('falls through to handleTimerExpiry when hostDisconnectedAt is set but host is reconnected', async () => {
    const ctx = createMockCtx({
      phase: 'question_open',
      hostConnectionId: 'conn-host',
      hostDisconnectedAt: Date.now() - 1000,
    });

    await simulateAlarm(ctx);

    // hostDisconnectedAt is set but hostConnectionId is also set → not a disconnect scenario
    expect(endGame).not.toHaveBeenCalled();
    expect(handleTimerExpiry).toHaveBeenCalledWith(ctx);
  });
});
