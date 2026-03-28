/**
 * handlers/session.ts
 *
 * Handlers for session lifecycle events:
 * - create_session: host creates a new session
 * - rejoin_host: host reconnects with stored hostId
 * - join_session: participant joins the lobby
 * - rejoin_session: participant reconnects with stored pseudonym
 */
import type * as Party from 'partykit/server';
import type { QuestionCategory, AnswerOption } from '../types';
import type { GameContext } from '../game-context';
import { MAX_PLAYERS, CATEGORY_PROMPTS } from '../constants';
import { shuffle, generateIdentity } from '../utils';
import { buildRankings } from '../scoring';

export async function handleCreateSession(
  ctx: GameContext,
  event: Record<string, unknown>,
  sender: Party.Connection,
): Promise<void> {
  if (ctx.wines.length > 0) {
    // Session already exists — re-attach if same hostId
    const existingHostId = await ctx.room.storage.get<string>('hostId');
    if (existingHostId && existingHostId === event.hostId) {
      ctx.hostConnectionId = sender.id;
      sender.send(JSON.stringify({
        type: 'session:created',
        code: ctx.room.id,
        hostId: existingHostId,
      }));
    } else {
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Session already exists',
        code: 'SESSION_EXISTS',
      }));
    }
    return;
  }

  const wines = (event.wines as Array<{
    name: string;
    questions: Array<{
      category: QuestionCategory;
      correctAnswer: string;
      distractors: [string, string, string];
    }>;
  }>);

  if (!wines?.length) {
    sender.send(JSON.stringify({
      type: 'error',
      message: 'At least one wine is required',
      code: 'NO_WINES',
    }));
    return;
  }

  const timerSeconds = typeof event.timerSeconds === 'number'
    ? Math.max(15, Math.min(120, event.timerSeconds))
    : 60;

  const hostId = (event.hostId as string) || generateIdentity();
  const title = (event.title as string) || wines[0]?.name || 'Wine Night';

  ctx.wines = wines.map((wineDto) => ({
    id: generateIdentity(),
    name: wineDto.name,
    questions: wineDto.questions.map((qDto) => {
      const options: AnswerOption[] = shuffle([
        { id: generateIdentity(), text: qDto.correctAnswer, correct: true },
        ...qDto.distractors.map((text) => ({
          id: generateIdentity(),
          text,
          correct: false,
        })),
      ]);
      return {
        id: generateIdentity(),
        category: qDto.category,
        prompt: CATEGORY_PROMPTS[qDto.category],
        options,
      };
    }),
  }));

  ctx.timerSeconds = timerSeconds;
  ctx.hostId = hostId;
  ctx.sessionTitle = title;
  ctx.createdAt = new Date().toISOString();
  ctx.hostConnectionId = sender.id;

  await ctx.saveState();
  await ctx.room.storage.put('hostId', hostId);
  await ctx.upsertKvSession({ status: 'waiting' });

  sender.send(JSON.stringify({
    type: 'session:created',
    code: ctx.room.id,
    hostId,
  }));
}

export async function handleRejoinHost(
  ctx: GameContext,
  event: Record<string, unknown>,
  sender: Party.Connection,
): Promise<void> {
  const storedHostId = await ctx.room.storage.get<string>('hostId');
  if (!storedHostId || storedHostId !== event.hostId) {
    sender.send(JSON.stringify({
      type: 'error',
      message: 'Invalid host ID',
      code: 'INVALID_HOST_ID',
    }));
    return;
  }

  ctx.hostConnectionId = sender.id;
  sender.send(JSON.stringify({
    type: 'host:state_snapshot',
    phase: ctx.phase,
    code: ctx.room.id,
    hostId: storedHostId,
    wines: ctx.wines,
    participants: ctx.getLobbyParticipants(),
    timerSeconds: ctx.timerSeconds,
    currentRound: ctx.currentRound,
    currentQuestion: ctx.currentQuestion,
    question: ctx.phase === 'question_open' || ctx.phase === 'question_paused' || ctx.phase === 'question_revealed'
      ? ctx.buildQuestionPayload()
      : null,
    rankings: buildRankings(ctx.participants),
  }));
}

export async function handleJoinSession(
  ctx: GameContext,
  event: Record<string, unknown>,
  sender: Party.Connection,
): Promise<void> {
  if (ctx.wines.length === 0) {
    sender.send(JSON.stringify({
      type: 'error',
      message: 'Session not found',
      code: 'SESSION_NOT_FOUND',
    }));
    return;
  }
  if (ctx.phase !== 'waiting') {
    sender.send(JSON.stringify({
      type: 'error',
      message: 'Game already started',
      code: 'GAME_STARTED',
    }));
    return;
  }
  if (ctx.participants.size >= MAX_PLAYERS) {
    sender.send(JSON.stringify({
      type: 'error',
      message: 'Session is full',
      code: 'SESSION_FULL',
    }));
    return;
  }

  const usedPseudonyms = new Set(
    Array.from(ctx.participants.values()).map((p) => p.pseudonym),
  );
  const pseudonym = generateIdentity(usedPseudonyms);

  const participant = {
    id: pseudonym,
    socketId: sender.id,
    pseudonym,
    score: 0,
    connected: true,
    answeredQuestions: new Set<string>(),
  };

  ctx.participants.set(pseudonym, participant);

  await ctx.room.storage.put(`participant:${pseudonym}`, {
    id: participant.id,
    pseudonym: participant.pseudonym,
    score: participant.score,
    connected: participant.connected,
    answeredQuestions: [],
  });

  sender.send(JSON.stringify({
    type: 'participant:joined',
    pseudonym,
  }));

  ctx.broadcast('lobby:updated', {
    participants: ctx.getLobbyParticipants(),
    count: ctx.participants.size,
  });
}

export async function handleRejoinSession(
  ctx: GameContext,
  event: Record<string, unknown>,
  sender: Party.Connection,
): Promise<void> {
  const pseudonym = event.pseudonym as string;
  const participant = ctx.participants.get(pseudonym);

  if (!participant) {
    sender.send(JSON.stringify({
      type: 'error',
      message: 'Invalid pseudonym — cannot rejoin session',
      code: 'INVALID_PSEUDONYM',
    }));
    return;
  }

  participant.socketId = sender.id;
  participant.connected = true;

  sender.send(JSON.stringify({
    type: 'participant:state_snapshot',
    pseudonym: participant.pseudonym,
    score: participant.score,
    phase: ctx.phase,
    question: ctx.phase === 'question_open' || ctx.phase === 'question_paused'
      ? ctx.buildQuestionPayload()
      : null,
  }));

  if (ctx.phase === 'waiting') {
    ctx.broadcast('lobby:updated', {
      participants: ctx.getLobbyParticipants(),
      count: ctx.participants.size,
    });
  }
}
