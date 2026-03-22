// Mirrors party/game.ts types and event payloads.
// Keep in sync with party/game.ts when changing event shapes.

export type QuestionCategory =
  | 'color'
  | 'country'
  | 'grape_variety'
  | 'vintage_year'
  | 'wine_name';

export interface OptionPayload {
  id: string;
  text: string;
}

export interface QuestionPayload {
  questionId: string;
  questionIndex: number;
  totalQuestions: number;
  roundIndex: number;
  totalRounds: number;
  category: QuestionCategory;
  prompt: string;
  options: OptionPayload[];
  timerMs: number;
}

export interface RankingEntry {
  pseudonym: string;
  score: number;
}

// Server → Host: answer revealed
export interface HostRevealPayload {
  correctOptionId: string;
  results: { pseudonym: string; points: number; totalScore: number }[];
}

// Server → Participant: answer revealed
export interface ParticipantRevealPayload {
  correctOptionId: string;
  myPoints: number;
  myTotalScore: number;
}

export interface RoundLeaderboardPayload {
  rankings: RankingEntry[];
  roundIndex: number;
  totalRounds: number;
}

export interface FinalLeaderboardPayload {
  rankings: RankingEntry[];
}

// Server → all: participant answered (host side)
export interface ParticipantAnsweredPayload {
  pseudonym: string;
  answeredCount: number;
  totalCount: number;
}

export interface LobbyUpdatedPayload {
  participants: string[];
  count: number;
}

export interface ErrorPayload {
  message: string;
  code: string;
}

// Host → Server: create session wine question
export interface CreateQuestionPayload {
  category: QuestionCategory;
  correctAnswer: string;
  distractors: [string, string, string];
}

export interface CreateWinePayload {
  name: string;
  questions: CreateQuestionPayload[];
}

export interface CreateSessionPayload {
  wines: CreateWinePayload[];
  timerSeconds: number;
  hostId: string;
  title?: string;
}

// Host identity + session list (from KV)
export interface SessionListEntry {
  code: string;
  title: string;
  createdAt: string;
  status: 'waiting' | 'active' | 'ended';
  participantCount: number;
  finalRankings?: RankingEntry[];
}

export interface SessionsListPayload {
  sessions: SessionListEntry[];
}

// Server → Host: full state snapshot on reconnect
export interface HostStateSnapshot {
  phase: string;
  code: string;
  hostId: string;
  wines: unknown[];
  participants: string[];
  timerSeconds: number;
  currentRound: number;
  currentQuestion: number;
  question: QuestionPayload | null;
  rankings: RankingEntry[];
}

// Server → Participant: full state snapshot on rejoin
export interface ParticipantStateSnapshot {
  pseudonym: string;
  score: number;
  phase: string;
  question: QuestionPayload | null;
}

