import { create } from 'zustand';
import type {
  QuestionPayload,
  ParticipantRevealPayload,
  RankingEntry,
} from '../types/events';
import { saveRejoin, clearRejoin as clearRejoinStorage } from '../lib/rejoin';
export type { RejoinCredential as RejoinData } from '../lib/rejoin';

export type ParticipantPhase =
  | 'join'
  | 'lobby'
  | 'question'
  | 'revealed'
  | 'questionLeaderboard'
  | 'roundLeaderboard'
  | 'finalLeaderboard'
  | 'ended';

interface ParticipantState {
  phase: ParticipantPhase;
  pseudonym: string | null;
  joinError: string | null;
  /** The participant's ADJECTIVE-NOUN identity, used for rejoin. */
  rejoinId: string | null;
  sessionCode: string | null;
  currentQuestion: QuestionPayload | null;
  selectedOptionId: string | null;
  revealData: ParticipantRevealPayload | null;
  rankings: RankingEntry[];
  timerMs: number;

  setPhase: (phase: ParticipantPhase) => void;
  setPseudonym: (pseudonym: string) => void;
  /** Persist the participant's identity so they can rejoin after a disconnect. */
  setRejoin: (pseudonym: string, code: string) => void;
  setJoinError: (err: string | null) => void;
  setCurrentQuestion: (q: QuestionPayload) => void;
  setSelectedOption: (id: string) => void;
  setRevealData: (data: ParticipantRevealPayload) => void;
  setRankings: (rankings: RankingEntry[]) => void;
  setTimerMs: (ms: number) => void;
  /** Clears the rejoin credential from store and localStorage. */
  clearRejoin: () => void;
  /** Resets all in-game state so the participant can start a fresh session. */
  resetGame: () => void;
}

export const useParticipantStore = create<ParticipantState>((set) => ({
  phase: 'join',
  pseudonym: null,
  rejoinId: null,
  joinError: null,
  sessionCode: null,
  currentQuestion: null,
  selectedOptionId: null,
  revealData: null,
  rankings: [],
  timerMs: 60000,

  setPhase: (phase) => set({ phase }),
  setPseudonym: (pseudonym) => set({ pseudonym }),
  setRejoin: (pseudonym, code) => {
    saveRejoin(pseudonym, code);
    set({ rejoinId: pseudonym, sessionCode: code });
  },
  setJoinError: (err: string | null) => set({ joinError: err }),
  setCurrentQuestion: (currentQuestion) =>
    set({ currentQuestion, selectedOptionId: null, revealData: null }),
  setSelectedOption: (selectedOptionId) => set({ selectedOptionId }),
  setRevealData: (revealData) => set({ revealData }),
  setRankings: (rankings) => set({ rankings }),
  setTimerMs: (timerMs) => set({ timerMs }),
  clearRejoin: () => {
    clearRejoinStorage();
    set({ rejoinId: null, sessionCode: null, pseudonym: null, joinError: null });
  },
  resetGame: () => {
    clearRejoinStorage();
    set({
      phase: 'join',
      pseudonym: null,
      rejoinId: null,
      sessionCode: null,
      joinError: null,
      currentQuestion: null,
      selectedOptionId: null,
      revealData: null,
      rankings: [],
      timerMs: 60000,
    });
  },
}));
