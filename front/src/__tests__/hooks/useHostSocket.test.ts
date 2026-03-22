import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHostStore } from '../../stores/hostStore';
// Mock partysocket with an event-emitting fake
let mockListeners: Record<string, Array<(e: MessageEvent) => void>> = {};
let openListeners: Array<() => void> = [];
const mockSend = vi.fn();

vi.mock('partysocket', () => ({
  default: vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn((event: string, cb: (e: MessageEvent | Event) => void) => {
      if (event === 'message') {
        mockListeners['message'] = mockListeners['message'] || [];
        mockListeners['message'].push(cb as (e: MessageEvent) => void);
      } else if (event === 'open') {
        openListeners.push(cb as () => void);
      }
    }),
    removeEventListener: vi.fn(),
    send: mockSend,
    close: vi.fn(),
  })),
}));

import { useHostSocket } from '../../hooks/useHostSocket';

function emitMessage(type: string, extra: object = {}) {
  const event = new MessageEvent('message', {
    data: JSON.stringify({ type, ...extra }),
  });
  (mockListeners['message'] || []).forEach((cb) => cb(event));
}

describe('useHostSocket', () => {
  beforeEach(() => {
    mockListeners = {};
    openListeners = [];
    mockSend.mockClear();
    useHostStore.setState({
      phase: 'setup',
      code: null,
      hostId: 'TANNIC-FALCON',
      sessions: [],
      participants: [],
      answeredCount: 0,
      totalCount: 0,
      isPaused: false,
      currentQuestion: null,
      revealData: null,
      rankings: [],
      roundIndex: 0,
      timerMs: 60000,
    });
  });

  it('emits rejoin_host on socket open when hostId is present', () => {
    renderHook(() => useHostSocket('1234'));
    openListeners.forEach((cb) => cb());
    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'rejoin_host', hostId: 'TANNIC-FALCON' }),
    );
  });

  it('does not connect when code is empty string', () => {
    const callsBefore = openListeners.length;
    renderHook(() => useHostSocket(''));
    // Hook early-returns when code is falsy — no socket created, no open listener added
    expect(openListeners.length).toBe(callsBefore);
  });

  it('sets phase to lobby on session:created', () => {
    renderHook(() => useHostSocket('1234'));
    emitMessage('session:created', { code: '1234', hostId: 'TANNIC-FALCON' });
    expect(useHostStore.getState().phase).toBe('lobby');
  });

  it('sets phase to question on game:question', () => {
    renderHook(() => useHostSocket('1234'));
    emitMessage('game:question', {
      questionId: 'q1',
      prompt: 'What color?',
      category: 'color',
      options: [{ id: 'o1', text: 'Red' }],
      roundIndex: 0,
      questionIndex: 0,
      totalQuestions: 5,
      totalRounds: 1,
      timerMs: 60000,
    });
    expect(useHostStore.getState().phase).toBe('question');
  });

  it('updates timerMs on game:timer_tick', () => {
    renderHook(() => useHostSocket('1234'));
    emitMessage('game:timer_tick', { remainingMs: 30000 });
    expect(useHostStore.getState().timerMs).toBe(30000);
  });

  it('sets isPaused on game:timer_paused', () => {
    renderHook(() => useHostSocket('1234'));
    emitMessage('game:timer_paused', { remainingMs: 25000 });
    expect(useHostStore.getState().isPaused).toBe(true);
    expect(useHostStore.getState().timerMs).toBe(25000);
  });

  it('sets sessions on sessions:list', () => {
    renderHook(() => useHostSocket('1234'));
    const sessions = [{ code: '1234', title: 'Test', createdAt: new Date().toISOString(), status: 'active', participantCount: 2 }];
    emitMessage('sessions:list', { sessions });
    expect(useHostStore.getState().sessions).toEqual(sessions);
  });

  it('sets phase to roundLeaderboard on game:round_leaderboard', () => {
    renderHook(() => useHostSocket('1234'));
    emitMessage('game:round_leaderboard', { rankings: [], roundIndex: 0, totalRounds: 2 });
    expect(useHostStore.getState().phase).toBe('roundLeaderboard');
  });

  it('stores totalRounds from game:round_leaderboard payload', () => {
    renderHook(() => useHostSocket('1234'));
    emitMessage('game:round_leaderboard', { rankings: [], roundIndex: 0, totalRounds: 3 });
    expect(useHostStore.getState().totalRounds).toBe(3);
  });

  it('sets phase to finalLeaderboard on game:final_leaderboard', () => {
    renderHook(() => useHostSocket('1234'));
    emitMessage('game:final_leaderboard', { rankings: [] });
    expect(useHostStore.getState().phase).toBe('finalLeaderboard');
  });
});
