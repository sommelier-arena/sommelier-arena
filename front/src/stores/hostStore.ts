import { create } from 'zustand';
import type {
  QuestionPayload,
  HostRevealPayload,
  RankingEntry,
  SessionListEntry,
} from '../types/events';
import { deleteSession } from '../lib/sessionStorage';
export { saveSession, loadSessions, mergeSession, deleteSession } from '../lib/sessionStorage';

export type HostPhase =
  | 'setup'
  | 'dashboard'
  | 'lobby'
  | 'question'
  | 'revealed'
  | 'roundLeaderboard'
  | 'finalLeaderboard';

const HOST_ID_KEY = 'sommelierArena:hostId';

const ADJECTIVES = [
  'TANNIC', 'FRUITY', 'OAKY', 'CRISP', 'BOLD',
  'SILKY', 'ROBUST', 'FLORAL', 'VELVETY', 'MINERAL',
  'EARTHY', 'SMOKY', 'SPICY', 'VIVID', 'AMBER',
  'PEATY', 'BRINY', 'ZESTY', 'PLUMMY', 'MELLOW',
];
const NOUNS = [
  'FALCON', 'BARREL', 'VINE', 'CORK', 'CELLAR',
  'MAGNUM', 'CHATEAU', 'BOUQUET', 'TANNIN', 'GRAPE',
  'CARAFE', 'TERROIR', 'DECANTER', 'CUVEE', 'GOBLET',
  'RIESLING', 'CLARET', 'MERLOT', 'SHIRAZ', 'PINOT',
];

function generateHostId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}`;
}

function loadOrCreateHostId(): string {
  if (typeof window === 'undefined') return generateHostId();
  const existing = window.localStorage.getItem(HOST_ID_KEY);
  if (existing) return existing;
  const id = generateHostId();
  window.localStorage.setItem(HOST_ID_KEY, id);
  return id;
}

interface HostState {
  phase: HostPhase;
  code: string | null;
  hostId: string;
  sessions: SessionListEntry[];
  participants: string[];
  answeredCount: number;
  totalCount: number;
  isPaused: boolean;
  currentQuestion: QuestionPayload | null;
  revealData: HostRevealPayload | null;
  rankings: RankingEntry[];
  roundIndex: number;
  totalRounds: number;
  timerMs: number;

  setPhase: (phase: HostPhase) => void;
  setCode: (code: string) => void;
  setHostId: (id: string) => void;
  setSessions: (sessions: SessionListEntry[]) => void;
  removeSession: (code: string) => void;
  setParticipants: (participants: string[]) => void;
  setAnsweredStats: (answeredCount: number, totalCount: number) => void;
  setIsPaused: (paused: boolean) => void;
  setCurrentQuestion: (q: QuestionPayload) => void;
  setRevealData: (data: HostRevealPayload) => void;
  setRankings: (rankings: RankingEntry[], roundIndex?: number) => void;
  setTotalRounds: (totalRounds: number) => void;
  setTimerMs: (ms: number) => void;
  resetAnsweredStats: () => void;
  /** Reset all session-specific state to return to the setup form for a new tasting */
  resetSession: () => void;
}

export const useHostStore = create<HostState>((set, get) => ({
  phase: 'setup',
  code: null,
  hostId: loadOrCreateHostId(),
  sessions: [],
  participants: [],
  answeredCount: 0,
  totalCount: 0,
  isPaused: false,
  currentQuestion: null,
  revealData: null,
  rankings: [],
  roundIndex: 0,
  totalRounds: 0,
  timerMs: 60000,

  setPhase: (phase) => set({ phase }),
  setCode: (code) => set({ code }),
  setHostId: (hostId) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HOST_ID_KEY, hostId);
    }
    set({ hostId });
  },
  setSessions: (sessions) => set({ sessions }),
  removeSession: (code) => {
    const { hostId, sessions } = get();
    deleteSession(hostId, code);
    set({ sessions: sessions.filter((s) => s.code !== code) });
  },
  setParticipants: (participants) => set({ participants }),
  setAnsweredStats: (answeredCount, totalCount) =>
    set({ answeredCount, totalCount }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setCurrentQuestion: (currentQuestion) =>
    set({ currentQuestion, answeredCount: 0, revealData: null }),
  setRevealData: (revealData) => set({ revealData }),
  setRankings: (rankings, roundIndex) =>
    set((s) => ({ rankings, roundIndex: roundIndex ?? s.roundIndex })),
  setTotalRounds: (totalRounds) => set({ totalRounds }),
  setTimerMs: (timerMs) => set({ timerMs }),
  resetAnsweredStats: () => set({ answeredCount: 0 }),
  resetSession: () =>
    set({
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
      totalRounds: 0,
      timerMs: 60000,
    }),
}));

