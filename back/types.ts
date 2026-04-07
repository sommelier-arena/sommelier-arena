export type SessionPhase =
  | 'waiting'
  | 'question_open'
  | 'question_paused'
  | 'question_revealed'
  | 'question_leaderboard'
  | 'round_leaderboard'
  | 'ended';

export type QuestionCategory =
  | 'color'
  | 'region'
  | 'grape_variety'
  | 'vintage_year'
  | 'wine_name';

export interface AnswerOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  category: QuestionCategory;
  prompt: string;
  options: AnswerOption[];
}

export interface Wine {
  id: string;
  name: string;
  questions: Question[];
}

export interface Participant {
  id: string;
  socketId: string;
  pseudonym: string;
  score: number;
  connected: boolean;
  answeredQuestions: Set<string>;
}

export interface ParticipantAnswer {
  optionId: string;
  correct: boolean;
  points: number;
}

export interface SessionListEntry {
  code: string;
  title: string;
  createdAt: string;
  status: 'waiting' | 'active' | 'ended';
  participantCount: number;
  finalRankings?: { pseudonym: string; score: number }[];
}

export interface SavedState {
  wines: Wine[];
  phase: SessionPhase;
  timerSeconds: number;
  currentRound: number;
  currentQuestion: number;
  hostId: string;
  sessionTitle: string;
  createdAt: string;
  hostDisconnectedAt?: number | null;
}
