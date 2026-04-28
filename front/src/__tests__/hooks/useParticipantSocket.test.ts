import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useParticipantStore } from '../../stores/participantStore';

let mockListeners: Record<string, Array<(e: MessageEvent) => void>> = {};
let openListeners: Array<() => void> = [];
let closeListeners: Array<() => void> = [];
const mockSend = vi.fn();

vi.mock('partysocket', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      addEventListener: vi.fn((event: string, cb: (e: MessageEvent | Event) => void) => {
        if (event === 'message') {
          mockListeners['message'] = mockListeners['message'] || [];
          mockListeners['message'].push(cb as (e: MessageEvent) => void);
        } else if (event === 'open') {
          openListeners.push(cb as () => void);
        } else if (event === 'close') {
          closeListeners.push(cb as () => void);
        }
      }),
      removeEventListener: vi.fn(),
      send: mockSend,
      close: vi.fn(),
    };
  }),
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
    closeListeners = [];
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
      rejoinId: null,
      sessionCode: null,
    });
  });

  it('emits rejoin_session on open when credential in localStorage', () => {
    localStorage.setItem(REJOIN_KEY, JSON.stringify({ id: 'TANNIC-BARREL', code: '1234' }));
    renderHook(() => useParticipantSocket('1234'));
    openListeners.forEach((cb) => cb());
    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'rejoin_session', pseudonym: 'TANNIC-BARREL' }),
    );
  });

  it('does not emit rejoin_session when no credential in localStorage', () => {
    renderHook(() => useParticipantSocket('1234'));
    openListeners.forEach((cb) => cb());
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sets phase to lobby on participant:joined', () => {
    renderHook(() => useParticipantSocket('1234'));
    emitMessage('participant:joined', { pseudonym: 'TANNIC-BARREL' });
    expect(useParticipantStore.getState().phase).toBe('lobby');
    expect(useParticipantStore.getState().pseudonym).toBe('TANNIC-BARREL');
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
    localStorage.setItem(REJOIN_KEY, JSON.stringify({ id: 'TANNIC-BARREL', code: '1234' }));
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

  it('socket close clears localStorage rejoin token', () => {
    // Socket close no longer changes phase — it only matters for the
    // temporary-disconnect case where PartySocket will auto-reconnect.
    localStorage.setItem(REJOIN_KEY, JSON.stringify({ rejoinToken: 'tok', code: '1234', pseudonym: 'Alice' }));
    renderHook(() => useParticipantSocket('1234'));
    closeListeners.forEach((cb) => cb());
    // close does NOT clear the rejoin token — clearRejoin is only called on
    // server:state_snapshot(ended) or session:ended message
    expect(localStorage.getItem(REJOIN_KEY)).not.toBeNull();
  });

  it('socket close does NOT change phase (PartySocket will auto-reconnect)', () => {
    renderHook(() => useParticipantSocket('1234'));
    useParticipantStore.getState().setPhase('question');
    closeListeners.forEach((cb) => cb());
    // Phase must stay as-is — PartySocket will reconnect and receive a snapshot
    expect(useParticipantStore.getState().phase).toBe('question');
  });

  it('socket close does not affect finalLeaderboard phase', () => {
    renderHook(() => useParticipantSocket('1234'));
    useParticipantStore.getState().setPhase('finalLeaderboard');
    closeListeners.forEach((cb) => cb());
    expect(useParticipantStore.getState().phase).toBe('finalLeaderboard');
  });

  it('server:state_snapshot with phase=ended transitions to ended and clears rejoin', () => {
    localStorage.setItem(REJOIN_KEY, JSON.stringify({ rejoinToken: 'tok', code: '1234', pseudonym: 'Alice' }));
    renderHook(() => useParticipantSocket('1234'));
    emitMessage('server:state_snapshot', { phase: 'ended', code: '1234' });
    expect(useParticipantStore.getState().phase).toBe('ended');
    expect(localStorage.getItem(REJOIN_KEY)).toBeNull();
  });

  it('server:state_snapshot with phase=waiting does NOT change phase', () => {
    renderHook(() => useParticipantSocket('1234'));
    useParticipantStore.getState().setPhase('lobby');
    emitMessage('server:state_snapshot', { phase: 'waiting', code: '1234' });
    expect(useParticipantStore.getState().phase).toBe('lobby');
  });

  it('server:state_snapshot with phase=question_open does NOT change phase', () => {
    renderHook(() => useParticipantSocket('1234'));
    useParticipantStore.getState().setPhase('question');
    emitMessage('server:state_snapshot', { phase: 'question_open', code: '1234' });
    expect(useParticipantStore.getState().phase).toBe('question');
  });

  it('session:ended while in finalLeaderboard keeps finalLeaderboard phase', () => {
    renderHook(() => useParticipantSocket('1234'));
    useParticipantStore.getState().setPhase('finalLeaderboard');
    emitMessage('session:ended', {});
    expect(useParticipantStore.getState().phase).toBe('finalLeaderboard');
  });
});
