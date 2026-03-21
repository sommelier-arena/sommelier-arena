// Mirrors back/src/game/game.service.ts exported types
// and back/src/game/game.gateway.ts event payloads

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
  category: string;
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
  category: string;
  correctAnswer: string;
  distractors: [string, string, string];
}

export interface CreateWinePayload {
  name: string;
  questions: CreateQuestionPayload[];
}

export interface CreateSessionPayload {
  wines: CreateWinePayload[];
}
