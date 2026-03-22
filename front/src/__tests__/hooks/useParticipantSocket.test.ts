import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useParticipantStore } from '../../stores/participantStore';

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

import { useParticipantSocket } from '../../hooks/useParticipantSocket';

function emitMessage(type: string, extra: object = {}) {
  const event = new MessageEvent('message', {
    data: JSON.stringify({ type, ...extra }),
  });
  (mockListeners['message'] || []).forEach((cb) => cb(event));
}

const REJOIN_KEY = 'sommelierArena:rejoin';

describe('useParticipantSocket', () => {
  beforeEach(() => {
    mockListeners = {};
    openListeners = [];
    mockSend.mockClear();
    localStorage.clear();
    useParticipantStore.setState({
      phase: 'join',
      pseudonym: null,
      currentQuestion: null,
      selectedOptionId: null,
      revealData: null,
      rankings: [],
      timerMs: 0,
      rejoinToken: null,
      sessionCode: null,
    });
  });

  it('emits rejoin_session on open when rejoinToken in localStorage', () => {
    localStorage.setItem(REJOIN_KEY, JSON.stringify({ rejoinToken: 'tok123', code: '1234', pseudonym: 'Alice' }));
    renderHook(() => useParticipantSocket('1234'));
    openListeners.forEach((cb) => cb());
    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'rejoin_session', rejoinToken: 'tok123' }),
    );
  });

  it('does not emit rejoin_session when no token in localStorage', () => {
    renderHook(() => useParticipantSocket('1234'));
    openListeners.forEach((cb) => cb());
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sets phase to lobby on participant:joined', () => {
    renderHook(() => useParticipantSocket('1234'));
    emitMessage('participant:joined', { pseudonym: 'Alice', rejoinToken: 'tok123' });
    expect(useParticipantStore.getState().phase).toBe('lobby');
    expect(useParticipantStore.getState().pseudonym).toBe('Alice');
  });

  it('sets phase to question on game:question', () => {
    renderHook(() => useParticipantSocket('1234'));
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
    expect(useParticipantStore.getState().phase).toBe('question');
  });

  it('updates timerMs on game:timer_tick', () => {
    renderHook(() => useParticipantSocket('1234'));
    emitMessage('game:timer_tick', { remainingMs: 45000 });
    expect(useParticipantStore.getState().timerMs).toBe(45000);
  });

  it('clears localStorage on session:ended', () => {
    localStorage.setItem(REJOIN_KEY, JSON.stringify({ rejoinToken: 'tok', code: '1234', pseudonym: 'Alice' }));
    renderHook(() => useParticipantSocket('1234'));
    emitMessage('session:ended', {});
    expect(localStorage.getItem(REJOIN_KEY)).toBeNull();
  });

  it('sets phase to ended on session:ended', () => {
    renderHook(() => useParticipantSocket('1234'));
    emitMessage('session:ended', {});
    expect(useParticipantStore.getState().phase).toBe('ended');
  });

  it('sets phase to roundLeaderboard on game:round_leaderboard', () => {
    renderHook(() => useParticipantSocket('1234'));
    emitMessage('game:round_leaderboard', { rankings: [] });
    expect(useParticipantStore.getState().phase).toBe('roundLeaderboard');
  });
});
