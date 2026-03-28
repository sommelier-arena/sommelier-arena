import { describe, it, expect, beforeEach } from 'vitest';
import { useParticipantStore } from '../../stores/participantStore';
import { loadRejoin } from '../../lib/rejoin';

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
      rejoinId: null,
      sessionCode: null,
    });
    localStorage.clear();
  });

  describe('initial state', () => {
    it('starts in join phase', () => {
      expect(useParticipantStore.getState().phase).toBe('join');
    });

    it('rejoinId is null initially', () => {
      expect(useParticipantStore.getState().rejoinId).toBeNull();
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

  describe('rejoin credential', () => {
    it('setRejoin saves pseudonym to state as rejoinId', () => {
      useParticipantStore.getState().setRejoin('TANNIC-BARREL', '4567');
      expect(useParticipantStore.getState().rejoinId).toBe('TANNIC-BARREL');
      expect(useParticipantStore.getState().sessionCode).toBe('4567');
    });

    it('setRejoin persists to localStorage', () => {
      useParticipantStore.getState().setRejoin('TANNIC-BARREL', '4567');
      const stored = JSON.parse(localStorage.getItem(REJOIN_KEY)!);
      expect(stored).toEqual({ id: 'TANNIC-BARREL', code: '4567' });
    });

    it('clearRejoin removes localStorage entry', () => {
      useParticipantStore.getState().setRejoin('TANNIC-BARREL', '4567');
      useParticipantStore.getState().clearRejoin();
      expect(localStorage.getItem(REJOIN_KEY)).toBeNull();
      expect(useParticipantStore.getState().rejoinId).toBeNull();
      expect(useParticipantStore.getState().sessionCode).toBeNull();
    });

    it('clearRejoin also clears pseudonym from store', () => {
      useParticipantStore.getState().setPseudonym('TANNIC-BARREL');
      useParticipantStore.getState().setRejoin('TANNIC-BARREL', '4567');
      useParticipantStore.getState().clearRejoin();
      expect(useParticipantStore.getState().pseudonym).toBeNull();
    });

    it('clearRejoin removes rejoinId and code from state', () => {
      useParticipantStore.getState().setRejoin('TANNIC-BARREL', '4567');
      useParticipantStore.getState().clearRejoin();
      expect(useParticipantStore.getState().rejoinId).toBeNull();
      expect(useParticipantStore.getState().sessionCode).toBeNull();
    });
  });

  describe('resetGame', () => {
    it('resets phase to join', () => {
      useParticipantStore.getState().setPhase('question');
      useParticipantStore.getState().resetGame();
      expect(useParticipantStore.getState().phase).toBe('join');
    });

    it('clears pseudonym, rejoinId, sessionCode', () => {
      useParticipantStore.getState().setPseudonym('SILKY-MERLOT');
      useParticipantStore.getState().setRejoin('SILKY-MERLOT', '1234');
      useParticipantStore.getState().resetGame();
      expect(useParticipantStore.getState().pseudonym).toBeNull();
      expect(useParticipantStore.getState().rejoinId).toBeNull();
      expect(useParticipantStore.getState().sessionCode).toBeNull();
    });

    it('clears rankings and revealData', () => {
      useParticipantStore.getState().setRankings([{ pseudonym: 'SILKY-MERLOT', score: 100 }]);
      useParticipantStore.getState().resetGame();
      expect(useParticipantStore.getState().rankings).toEqual([]);
    });

    it('removes localStorage rejoin entry', () => {
      localStorage.setItem(REJOIN_KEY, JSON.stringify({ id: 'SILKY-MERLOT', code: '1234' }));
      useParticipantStore.getState().resetGame();
      expect(localStorage.getItem(REJOIN_KEY)).toBeNull();
    });
  });

  describe('loadRejoin', () => {
    it('returns null when no data in localStorage', () => {
      expect(loadRejoin()).toBeNull();
    });

    it('returns stored data when present', () => {
      const data = { id: 'TANNIC-BARREL', code: '4567' };
      localStorage.setItem(REJOIN_KEY, JSON.stringify(data));
      expect(loadRejoin()).toEqual(data);
    });

    it('returns null on malformed JSON', () => {
      localStorage.setItem(REJOIN_KEY, 'not-json');
      expect(loadRejoin()).toBeNull();
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
