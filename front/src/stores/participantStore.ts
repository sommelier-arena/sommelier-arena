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

interface ParticipantState {
  phase: ParticipantPhase;
  pseudonym: string | null;
  currentQuestion: QuestionPayload | null;
  selectedOptionId: string | null;
  revealData: ParticipantRevealPayload | null;
  rankings: RankingEntry[];
  timerMs: number;

  setPhase: (phase: ParticipantPhase) => void;
  setPseudonym: (pseudonym: string) => void;
  setCurrentQuestion: (q: QuestionPayload) => void;
  setSelectedOption: (id: string) => void;
  setRevealData: (data: ParticipantRevealPayload) => void;
  setRankings: (rankings: RankingEntry[]) => void;
  setTimerMs: (ms: number) => void;
}

export const useParticipantStore = create<ParticipantState>((set) => ({
  phase: 'join',
  pseudonym: null,
  currentQuestion: null,
  selectedOptionId: null,
  revealData: null,
  rankings: [],
  timerMs: 60000,

  setPhase: (phase) => set({ phase }),
  setPseudonym: (pseudonym) => set({ pseudonym }),
  setCurrentQuestion: (currentQuestion) =>
    set({ currentQuestion, selectedOptionId: null, revealData: null }),
  setSelectedOption: (selectedOptionId) => set({ selectedOptionId }),
  setRevealData: (revealData) => set({ revealData }),
  setRankings: (rankings) => set({ rankings }),
  setTimerMs: (timerMs) => set({ timerMs }),
}));
