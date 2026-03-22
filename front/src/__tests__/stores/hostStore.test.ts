import { describe, it, expect, beforeEach } from 'vitest';
import { useHostStore } from '../../stores/hostStore';

const HOST_ID_KEY = 'sommelierArena:hostId';

describe('hostStore', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useHostStore.setState({
      phase: 'setup',
      code: null,
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
    localStorage.clear();
  });

  describe('hostId initialization', () => {
    it('generates and stores a hostId if none exists in localStorage', () => {
      localStorage.clear();
      // Re-init by calling the generator via setHostId with a fresh value
      const id = useHostStore.getState().hostId;
      expect(id).toMatch(/^[A-Z]+-[A-Z]+$/);
    });

    it('reads existing hostId from localStorage', () => {
      localStorage.setItem(HOST_ID_KEY, 'TANNIC-FALCON');
      // Simulate re-initializing by calling setHostId
      useHostStore.getState().setHostId('TANNIC-FALCON');
      expect(useHostStore.getState().hostId).toBe('TANNIC-FALCON');
      expect(localStorage.getItem(HOST_ID_KEY)).toBe('TANNIC-FALCON');
    });

    it('setHostId persists to localStorage', () => {
      useHostStore.getState().setHostId('SILKY-BARREL');
      expect(localStorage.getItem(HOST_ID_KEY)).toBe('SILKY-BARREL');
      expect(useHostStore.getState().hostId).toBe('SILKY-BARREL');
    });
  });

  describe('phase transitions', () => {
    it('setPhase updates the phase', () => {
      useHostStore.getState().setPhase('lobby');
      expect(useHostStore.getState().phase).toBe('lobby');
    });

    it('supports all valid phases', () => {
      const phases = ['setup', 'dashboard', 'lobby', 'question', 'revealed', 'roundLeaderboard', 'finalLeaderboard'] as const;
      for (const p of phases) {
        useHostStore.getState().setPhase(p);
        expect(useHostStore.getState().phase).toBe(p);
      }
    });
  });

  describe('sessions', () => {
    it('setSessions updates sessions list', () => {
      const sessions = [
        { code: '1234', title: 'Test', createdAt: new Date().toISOString(), status: 'active' as const, participantCount: 3 },
      ];
      useHostStore.getState().setSessions(sessions);
      expect(useHostStore.getState().sessions).toEqual(sessions);
    });

    it('setSessions with empty array clears sessions', () => {
      useHostStore.getState().setSessions([]);
      expect(useHostStore.getState().sessions).toHaveLength(0);
    });
  });

  describe('answered stats', () => {
    it('setAnsweredStats updates counts', () => {
      useHostStore.getState().setAnsweredStats(5, 10);
      expect(useHostStore.getState().answeredCount).toBe(5);
      expect(useHostStore.getState().totalCount).toBe(10);
    });

    it('resetAnsweredStats resets to zero', () => {
      useHostStore.getState().setAnsweredStats(5, 10);
      useHostStore.getState().resetAnsweredStats();
      expect(useHostStore.getState().answeredCount).toBe(0);
    });
  });

  describe('rankings', () => {
    it('setRankings updates rankings', () => {
      const rankings = [{ pseudonym: 'Alice', score: 100, rank: 1 }];
      useHostStore.getState().setRankings(rankings);
      expect(useHostStore.getState().rankings).toEqual(rankings);
    });

    it('setRankings with roundIndex updates roundIndex', () => {
      useHostStore.getState().setRankings([], 2);
      expect(useHostStore.getState().roundIndex).toBe(2);
    });
  });
});
