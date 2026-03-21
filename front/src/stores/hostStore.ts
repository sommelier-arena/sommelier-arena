import { create } from 'zustand';
import type {
  QuestionPayload,
  HostRevealPayload,
  RankingEntry,
} from '../types/events';

export type HostPhase =
  | 'setup'
  | 'lobby'
  | 'question'
  | 'revealed'
  | 'roundLeaderboard'
  | 'finalLeaderboard';

interface HostState {
  phase: HostPhase;
  code: string | null;
  participants: string[];
  answeredCount: number;
  totalCount: number;
  isPaused: boolean;
  currentQuestion: QuestionPayload | null;
  revealData: HostRevealPayload | null;
  rankings: RankingEntry[];
  roundIndex: number;
  timerMs: number;

  setPhase: (phase: HostPhase) => void;
  setCode: (code: string) => void;
  setParticipants: (participants: string[]) => void;
  setAnsweredStats: (answeredCount: number, totalCount: number) => void;
  setIsPaused: (paused: boolean) => void;
  setCurrentQuestion: (q: QuestionPayload) => void;
  setRevealData: (data: HostRevealPayload) => void;
  setRankings: (rankings: RankingEntry[], roundIndex?: number) => void;
  setTimerMs: (ms: number) => void;
  resetAnsweredStats: () => void;
}

export const useHostStore = create<HostState>((set) => ({
  phase: 'setup',
  code: null,
  participants: [],
  answeredCount: 0,
  totalCount: 0,
  isPaused: false,
  currentQuestion: null,
  revealData: null,
  rankings: [],
  roundIndex: 0,
  timerMs: 60000,

  setPhase: (phase) => set({ phase }),
  setCode: (code) => set({ code }),
  setParticipants: (participants) => set({ participants }),
  setAnsweredStats: (answeredCount, totalCount) =>
    set({ answeredCount, totalCount }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setCurrentQuestion: (currentQuestion) =>
    set({ currentQuestion, answeredCount: 0, revealData: null }),
  setRevealData: (revealData) => set({ revealData }),
  setRankings: (rankings, roundIndex) =>
    set((s) => ({ rankings, roundIndex: roundIndex ?? s.roundIndex })),
  setTimerMs: (timerMs) => set({ timerMs }),
  resetAnsweredStats: () => set({ answeredCount: 0 }),
}));
