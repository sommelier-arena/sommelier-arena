import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Session,
  SessionPhase,
  Wine,
  Question,
  AnswerOption,
  Participant,
  QuestionCategory,
} from './interfaces/session.interface';
import { CreateSessionDto } from './dto/create-session.dto';
import { PseudonymService } from './pseudonym.service';

const QUESTION_DURATION_MS = 60_000;
const MAX_PLAYERS = 10;

const CATEGORY_PROMPTS: Record<QuestionCategory, string> = {
  color: 'What is the color of this wine?',
  country: 'From which country does this wine come?',
  grape_variety: 'What is the grape variety of this wine?',
  vintage_year: 'What is the vintage year of this wine?',
};

export interface QuestionPayload {
  questionId: string;
  questionIndex: number;
  totalQuestions: number;
  roundIndex: number;
  totalRounds: number;
  category: string;
  prompt: string;
  options: { id: string; text: string }[];
  timerMs: number;
}

export interface RevealResult {
  hostSocketId: string;
  correctOptionId: string;
  hostResults: { pseudonym: string; points: number; totalScore: number }[];
  participantResults: Map<
    string,
    { correctOptionId: string; myPoints: number; myTotalScore: number }
  >;
}

export interface RoundLeaderboardPayload {
  rankings: { pseudonym: string; score: number }[];
  roundIndex: number;
}

export interface FinalLeaderboardPayload {
  rankings: { pseudonym: string; score: number }[];
}

export type AdvanceResult =
  | { type: 'question'; payload: QuestionPayload }
  | { type: 'roundLeaderboard'; payload: RoundLeaderboardPayload }
  | { type: 'finalLeaderboard'; payload: FinalLeaderboardPayload };

export interface SubmitAnswerResult {
  hostUpdate: {
    pseudonym: string;
    answeredCount: number;
    totalCount: number;
  };
}

@Injectable()
export class GameService {
  private readonly sessions = new Map<string, Session>();
  private readonly hostSocketToCode = new Map<string, string>();
  private readonly participantSocketToCode = new Map<string, string>();

  constructor(private readonly pseudonymService: PseudonymService) {}

  // ─── Session creation ──────────────────────────────────────────────────────

  createSession(dto: CreateSessionDto, hostSocketId: string): string {
    const code = this.generateUniqueCode();

    const wines: Wine[] = dto.wines.map((wineDto, wIndex) => ({
      id: uuidv4(),
      name: wineDto.name,
      position: wIndex + 1,
      questions: wineDto.questions.map((qDto) => {
        const category = qDto.category as QuestionCategory;
        const options: AnswerOption[] = [
          { id: uuidv4(), text: qDto.correctAnswer, correct: true, position: 1 },
          ...qDto.distractors.map((text, i) => ({
            id: uuidv4(),
            text,
            correct: false,
            position: i + 2,
          })),
        ];
        const question: Question = {
          id: uuidv4(),
          category,
          prompt: CATEGORY_PROMPTS[category],
          options,
        };
        return question;
      }),
    }));

    const session: Session = {
      id: uuidv4(),
      code,
      hostSocketId,
      phase: 'waiting',
      wines,
      participants: new Map(),
      currentRound: 0,
      currentQuestion: 0,
      timerRemainingMs: QUESTION_DURATION_MS,
    };

    this.sessions.set(code, session);
    this.hostSocketToCode.set(hostSocketId, code);
    return code;
  }

  // ─── Joining ───────────────────────────────────────────────────────────────

  joinSession(
    code: string,
    socketId: string,
  ):
    | { pseudonym: string; lobbyParticipants: string[] }
    | { error: { message: string; code: string } } {
    const session = this.sessions.get(code);
    if (!session) {
      return { error: { message: 'Session not found', code: 'NOT_FOUND' } };
    }
    if (session.phase !== 'waiting') {
      return {
        error: { message: 'Session already started', code: 'ALREADY_STARTED' },
      };
    }
    if (session.participants.size >= MAX_PLAYERS) {
      return { error: { message: 'Session is full', code: 'SESSION_FULL' } };
    }

    const pseudonym = this.pseudonymService.generate(session);
    const participant: Participant = {
      id: uuidv4(),
      socketId,
      pseudonym,
      score: 0,
      connected: true,
      answers: new Map(),
    };

    session.participants.set(socketId, participant);
    this.participantSocketToCode.set(socketId, code);

    const lobbyParticipants = Array.from(session.participants.values()).map(
      (p) => p.pseudonym,
    );
    return { pseudonym, lobbyParticipants };
  }

  // ─── Game flow ─────────────────────────────────────────────────────────────

  startGame(code: string): QuestionPayload | null {
    const session = this.sessions.get(code);
    if (!session || session.phase !== 'waiting') return null;
    if (session.wines.length === 0) return null;

    session.phase = 'question_open';
    session.currentRound = 0;
    session.currentQuestion = 0;
    session.timerRemainingMs = QUESTION_DURATION_MS;
    return this.buildQuestionPayload(session);
  }

  submitAnswer(
    code: string,
    socketId: string,
    questionId: string,
    optionId: string,
  ): SubmitAnswerResult | null {
    const session = this.sessions.get(code);
    if (!session || session.phase !== 'question_open') return null;

    const wine = session.wines[session.currentRound];
    const question = wine.questions[session.currentQuestion];
    if (question.id !== questionId) return null;

    const participant = session.participants.get(socketId);
    if (!participant?.connected) return null;
    if (participant.answers.has(questionId)) return null; // first-tap lock

    const option = question.options.find((o) => o.id === optionId);
    if (!option) return null;

    participant.answers.set(questionId, {
      optionId,
      correct: option.correct,
      points: 0, // calculated on reveal
    });

    const connected = Array.from(session.participants.values()).filter(
      (p) => p.connected,
    );
    const answeredCount = connected.filter((p) =>
      p.answers.has(questionId),
    ).length;

    return {
      hostUpdate: {
        pseudonym: participant.pseudonym,
        answeredCount,
        totalCount: connected.length,
      },
    };
  }

  revealAnswer(code: string): RevealResult | null {
    const session = this.sessions.get(code);
    if (!session) return null;
    if (session.phase === 'question_revealed') return null; // idempotent guard
    if (
      session.phase !== 'question_open' &&
      session.phase !== 'question_paused'
    ) {
      return null;
    }

    session.phase = 'question_revealed';

    const wine = session.wines[session.currentRound];
    const question = wine.questions[session.currentQuestion];
    const correctOption = question.options.find((o) => o.correct)!;

    const hostResults: { pseudonym: string; points: number; totalScore: number }[] = [];
    const participantResults = new Map<
      string,
      { correctOptionId: string; myPoints: number; myTotalScore: number }
    >();

    session.participants.forEach((participant, socketId) => {
      const answer = participant.answers.get(question.id);
      const points = answer?.correct ? 100 : 0;
      if (answer) {
        answer.points = points;
        participant.score += points;
      }

      hostResults.push({
        pseudonym: participant.pseudonym,
        points,
        totalScore: participant.score,
      });

      if (participant.connected) {
        participantResults.set(socketId, {
          correctOptionId: correctOption.id,
          myPoints: points,
          myTotalScore: participant.score,
        });
      }
    });

    return {
      hostSocketId: session.hostSocketId,
      correctOptionId: correctOption.id,
      hostResults,
      participantResults,
    };
  }

  advanceQuestion(code: string): AdvanceResult | null {
    const session = this.sessions.get(code);
    if (!session) return null;
    if (
      session.phase !== 'question_revealed' &&
      session.phase !== 'round_leaderboard'
    ) {
      return null;
    }

    if (session.phase === 'round_leaderboard') {
      return this.advanceFromRoundLeaderboard(session);
    }

    // phase === 'question_revealed'
    const wine = session.wines[session.currentRound];
    const isLastQuestion =
      session.currentQuestion === wine.questions.length - 1;

    if (!isLastQuestion) {
      session.currentQuestion++;
      session.phase = 'question_open';
      session.timerRemainingMs = QUESTION_DURATION_MS;
      return { type: 'question', payload: this.buildQuestionPayload(session) };
    }

    // Last question of this wine → show round leaderboard
    session.phase = 'round_leaderboard';
    return {
      type: 'roundLeaderboard',
      payload: {
        rankings: this.buildRankings(session),
        roundIndex: session.currentRound,
      },
    };
  }

  pauseGame(code: string): boolean {
    const session = this.sessions.get(code);
    if (!session || session.phase !== 'question_open') return false;
    session.phase = 'question_paused';
    return true;
  }

  resumeGame(code: string): boolean {
    const session = this.sessions.get(code);
    if (!session || session.phase !== 'question_paused') return false;
    session.phase = 'question_open';
    return true;
  }

  endSession(code: string): FinalLeaderboardPayload | null {
    const session = this.sessions.get(code);
    if (!session || session.phase === 'ended') return null;
    session.phase = 'ended';
    const rankings = this.buildRankings(session);
    this.cleanup(session);
    return { rankings };
  }

  // ─── Disconnect handlers ───────────────────────────────────────────────────

  handleHostDisconnect(
    hostSocketId: string,
  ): { code: string } | null {
    const code = this.hostSocketToCode.get(hostSocketId);
    if (!code) return null;
    const session = this.sessions.get(code);
    if (!session) return null;

    session.phase = 'ended';
    this.cleanup(session);
    return { code };
  }

  handleParticipantDisconnect(
    socketId: string,
  ): { code: string; pseudonym: string } | null {
    const code = this.participantSocketToCode.get(socketId);
    if (!code) return null;
    const session = this.sessions.get(code);
    const participant = session?.participants.get(socketId);
    if (!participant) return null;

    participant.connected = false;
    this.participantSocketToCode.delete(socketId);

    return { code, pseudonym: participant.pseudonym };
  }

  // ─── Lookups ───────────────────────────────────────────────────────────────

  getCodeForHostSocket(socketId: string): string | undefined {
    return this.hostSocketToCode.get(socketId);
  }

  getCodeForParticipantSocket(socketId: string): string | undefined {
    return this.participantSocketToCode.get(socketId);
  }

  getSession(code: string): Session | undefined {
    return this.sessions.get(code);
  }

  getLobbyParticipants(code: string): string[] {
    const session = this.sessions.get(code);
    if (!session) return [];
    return Array.from(session.participants.values()).map((p) => p.pseudonym);
  }

  // ─── Privates ──────────────────────────────────────────────────────────────

  private advanceFromRoundLeaderboard(session: Session): AdvanceResult {
    const isLastRound = session.currentRound === session.wines.length - 1;

    if (isLastRound) {
      session.phase = 'ended';
      const rankings = this.buildRankings(session);
      this.cleanup(session);
      return { type: 'finalLeaderboard', payload: { rankings } };
    }

    session.currentRound++;
    session.currentQuestion = 0;
    session.phase = 'question_open';
    session.timerRemainingMs = QUESTION_DURATION_MS;
    return { type: 'question', payload: this.buildQuestionPayload(session) };
  }

  private buildQuestionPayload(session: Session): QuestionPayload {
    const wine = session.wines[session.currentRound];
    const question = wine.questions[session.currentQuestion];
    return {
      questionId: question.id,
      questionIndex: session.currentQuestion,
      totalQuestions: wine.questions.length,
      roundIndex: session.currentRound,
      totalRounds: session.wines.length,
      category: question.category,
      prompt: question.prompt,
      options: question.options.map((o) => ({ id: o.id, text: o.text })),
      timerMs: QUESTION_DURATION_MS,
    };
  }

  private buildRankings(
    session: Session,
  ): { pseudonym: string; score: number }[] {
    return Array.from(session.participants.values())
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ pseudonym: p.pseudonym, score: p.score }));
  }

  private generateUniqueCode(): string {
    for (let i = 0; i < 100; i++) {
      const code = String(Math.floor(Math.random() * 9000) + 1000);
      if (!this.sessions.has(code)) return code;
    }
    throw new Error('Could not generate a unique session code');
  }

  private cleanup(session: Session): void {
    this.hostSocketToCode.delete(session.hostSocketId);
    session.participants.forEach((_, socketId) => {
      this.participantSocketToCode.delete(socketId);
    });
    this.sessions.delete(session.code);
  }
}
