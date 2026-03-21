export type SessionPhase =
  | 'waiting'
  | 'question_open'
  | 'question_paused'
  | 'question_revealed'
  | 'round_leaderboard'
  | 'ended';

export type QuestionCategory =
  | 'color'
  | 'country'
  | 'grape_variety'
  | 'vintage_year';

export interface AnswerOption {
  id: string;
  text: string;
  correct: boolean;
  position: number;
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
  position: number;
  questions: Question[];
}

export interface ParticipantAnswer {
  optionId: string;
  correct: boolean;
  points: number;
}

export interface Participant {
  id: string;
  socketId: string;
  pseudonym: string;
  score: number;
  connected: boolean;
  answers: Map<string, ParticipantAnswer>;
}

export interface Session {
  id: string;
  code: string;
  hostSocketId: string;
  phase: SessionPhase;
  wines: Wine[];
  participants: Map<string, Participant>;
  currentRound: number;
  currentQuestion: number;
  timerRemainingMs: number;
}
