import { create } from 'zustand';
import type {
  QuestionPayload,
  ParticipantRevealPayload,
  RankingEntry,
} from '../types/events';

export type ParticipantPhase =
  | 'join'
  | 'lobby'
  | 'question'
  | 'revealed'
  | 'roundLeaderboard'
  | 'finalLeaderboard'
  | 'ended';

const REJOIN_KEY = 'sommelierArena:rejoin';

export interface RejoinData {
  rejoinToken: string;
  code: string;
  pseudonym: string;
}

function loadRejoinData(): RejoinData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REJOIN_KEY);
    return raw ? (JSON.parse(raw) as RejoinData) : null;
  } catch {
    return null;
  }
}

interface ParticipantState {
  phase: ParticipantPhase;
  pseudonym: string | null;
  rejoinToken: string | null;
  sessionCode: string | null;
  currentQuestion: QuestionPayload | null;
  selectedOptionId: string | null;
  revealData: ParticipantRevealPayload | null;
  rankings: RankingEntry[];
  timerMs: number;

  setPhase: (phase: ParticipantPhase) => void;
  setPseudonym: (pseudonym: string) => void;
  setRejoinToken: (token: string, code: string, pseudonym: string) => void;
  setCurrentQuestion: (q: QuestionPayload) => void;
  setSelectedOption: (id: string) => void;
  setRevealData: (data: ParticipantRevealPayload) => void;
  setRankings: (rankings: RankingEntry[]) => void;
  setTimerMs: (ms: number) => void;
  /** Clears the rejoin token, session code, and pseudonym from store and localStorage. */
  clearRejoin: () => void;
  /** Resets all in-game state so the participant can start a fresh session. */
  resetGame: () => void;
}

export const useParticipantStore = create<ParticipantState>((set) => ({
  phase: 'join',
  pseudonym: null,
  rejoinToken: null,
  sessionCode: null,
  currentQuestion: null,
  selectedOptionId: null,
  revealData: null,
  rankings: [],
  timerMs: 60000,

  setPhase: (phase) => set({ phase }),
  setPseudonym: (pseudonym) => set({ pseudonym }),
  setRejoinToken: (rejoinToken, code, pseudonym) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        REJOIN_KEY,
        JSON.stringify({ rejoinToken, code, pseudonym } satisfies RejoinData),
      );
    }
    set({ rejoinToken, sessionCode: code });
  },
  setCurrentQuestion: (currentQuestion) =>
    set({ currentQuestion, selectedOptionId: null, revealData: null }),
  setSelectedOption: (selectedOptionId) => set({ selectedOptionId }),
  setRevealData: (revealData) => set({ revealData }),
  setRankings: (rankings) => set({ rankings }),
  setTimerMs: (timerMs) => set({ timerMs }),
  clearRejoin: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(REJOIN_KEY);
    }
    set({ rejoinToken: null, sessionCode: null, pseudonym: null });
  },
  resetGame: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(REJOIN_KEY);
    }
    set({
      phase: 'join',
      pseudonym: null,
      rejoinToken: null,
      sessionCode: null,
      currentQuestion: null,
      selectedOptionId: null,
      revealData: null,
      rankings: [],
      timerMs: 60000,
    });
  },
}));

export { loadRejoinData };

