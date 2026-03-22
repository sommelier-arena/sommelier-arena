import { describe, it, expect, beforeEach } from 'vitest';
import { useParticipantStore, loadRejoinData } from '../../stores/participantStore';

const REJOIN_KEY = 'sommelierArena:rejoin';

describe('participantStore', () => {
  beforeEach(() => {
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
    localStorage.clear();
  });

  describe('initial state', () => {
    it('starts in join phase', () => {
      expect(useParticipantStore.getState().phase).toBe('join');
    });

    it('rejoinToken is null initially', () => {
      expect(useParticipantStore.getState().rejoinToken).toBeNull();
    });
  });

  describe('phase transitions', () => {
    it('setPhase updates the phase', () => {
      useParticipantStore.getState().setPhase('lobby');
      expect(useParticipantStore.getState().phase).toBe('lobby');
    });
  });

  describe('pseudonym', () => {
    it('setPseudonym stores the pseudonym', () => {
      useParticipantStore.getState().setPseudonym('EARTHY-VINE');
      expect(useParticipantStore.getState().pseudonym).toBe('EARTHY-VINE');
    });
  });

  describe('rejoin token', () => {
    it('setRejoinToken saves token to state', () => {
      useParticipantStore.getState().setRejoinToken('tok123', '4567', 'Alice');
      expect(useParticipantStore.getState().rejoinToken).toBe('tok123');
      expect(useParticipantStore.getState().sessionCode).toBe('4567');
    });

    it('setRejoinToken persists to localStorage', () => {
      useParticipantStore.getState().setRejoinToken('tok123', '4567', 'Alice');
      const stored = JSON.parse(localStorage.getItem(REJOIN_KEY)!);
      expect(stored).toEqual({ rejoinToken: 'tok123', code: '4567', pseudonym: 'Alice' });
    });

    it('clearRejoin removes localStorage entry', () => {
      useParticipantStore.getState().setRejoinToken('tok123', '4567', 'Alice');
      useParticipantStore.getState().clearRejoin();
      expect(localStorage.getItem(REJOIN_KEY)).toBeNull();
      expect(useParticipantStore.getState().rejoinToken).toBeNull();
      expect(useParticipantStore.getState().sessionCode).toBeNull();
    });

    it('clearRejoin also clears pseudonym from store', () => {
      useParticipantStore.getState().setPseudonym('Alice');
      useParticipantStore.getState().setRejoinToken('tok123', '4567', 'Alice');
      useParticipantStore.getState().clearRejoin();
      expect(useParticipantStore.getState().pseudonym).toBeNull();
    });

    it('clearRejoin removes token and code from state', () => {
      useParticipantStore.getState().setRejoinToken('tok123', '4567', 'Alice');
      useParticipantStore.getState().clearRejoin();
      expect(useParticipantStore.getState().rejoinToken).toBeNull();
      expect(useParticipantStore.getState().sessionCode).toBeNull();
    });
  });

  describe('resetGame', () => {
    it('resets phase to join', () => {
      useParticipantStore.getState().setPhase('question');
      useParticipantStore.getState().resetGame();
      expect(useParticipantStore.getState().phase).toBe('join');
    });

    it('clears pseudonym, rejoinToken, sessionCode', () => {
      useParticipantStore.getState().setPseudonym('Alice');
      useParticipantStore.getState().setRejoinToken('tok', '1234', 'Alice');
      useParticipantStore.getState().resetGame();
      expect(useParticipantStore.getState().pseudonym).toBeNull();
      expect(useParticipantStore.getState().rejoinToken).toBeNull();
      expect(useParticipantStore.getState().sessionCode).toBeNull();
    });

    it('clears rankings and revealData', () => {
      useParticipantStore.getState().setRankings([{ pseudonym: 'Alice', score: 100 }]);
      useParticipantStore.getState().resetGame();
      expect(useParticipantStore.getState().rankings).toEqual([]);
    });

    it('removes localStorage rejoin entry', () => {
      localStorage.setItem(REJOIN_KEY, JSON.stringify({ rejoinToken: 'tok', code: '1234', pseudonym: 'Alice' }));
      useParticipantStore.getState().resetGame();
      expect(localStorage.getItem(REJOIN_KEY)).toBeNull();
    });
  });

  describe('loadRejoinData', () => {
    it('returns null when no data in localStorage', () => {
      expect(loadRejoinData()).toBeNull();
    });

    it('returns stored data when present', () => {
      const data = { rejoinToken: 'tok', code: '4567', pseudonym: 'Alice' };
      localStorage.setItem(REJOIN_KEY, JSON.stringify(data));
      expect(loadRejoinData()).toEqual(data);
    });

    it('returns null on malformed JSON', () => {
      localStorage.setItem(REJOIN_KEY, 'not-json');
      expect(loadRejoinData()).toBeNull();
    });
  });

  describe('selected option', () => {
    it('setSelectedOption stores the selection', () => {
      useParticipantStore.getState().setSelectedOption('opt-a');
      expect(useParticipantStore.getState().selectedOptionId).toBe('opt-a');
    });

    it('selection can be changed', () => {
      useParticipantStore.getState().setSelectedOption('opt-a');
      useParticipantStore.getState().setSelectedOption('opt-b');
      expect(useParticipantStore.getState().selectedOptionId).toBe('opt-b');
    });
  });
});
