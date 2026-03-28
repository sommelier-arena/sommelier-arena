/**
 * handlers/game-flow.ts
 *
 * Handlers for host game-control events:
 * host:start, host:pause, host:resume, host:reveal, host:next, host:end
 * and participant submit_answer.
 */
import type * as Party from 'partykit/server';
import type { GameContext } from '../game-context';
import { scoreAnswer, buildRankings } from '../scoring';

export async function handleHostStart(
  ctx: GameContext,
  sender: Party.Connection,
): Promise<void> {
  if (sender.id !== ctx.hostConnectionId) return;
  if (ctx.phase !== 'waiting') return;
  if (ctx.participants.size === 0) {
    sender.send(JSON.stringify({
      type: 'error',
      message: 'No participants in lobby',
      code: 'NO_PARTICIPANTS',
    }));
    return;
  }

  ctx.phase = 'question_open';
  ctx.currentRound = 0;
  ctx.currentQuestion = 0;
  await ctx.saveState();
  await ctx.upsertKvSession({ status: 'active' });

  ctx.broadcast('game:started', {});
  await ctx.broadcastQuestion();
}

export function handleHostPause(ctx: GameContext, sender: Party.Connection): void {
  if (sender.id !== ctx.hostConnectionId) return;
  if (ctx.phase !== 'question_open') return;

  ctx.timer.pause();
  ctx.phase = 'question_paused';

  ctx.room.broadcast(JSON.stringify({
    type: 'game:timer_paused',
    remainingMs: ctx.timer.remainingMs,
  }));
}

export async function handleHostResume(
  ctx: GameContext,
  sender: Party.Connection,
): Promise<void> {
  if (sender.id !== ctx.hostConnectionId) return;
  if (ctx.phase !== 'question_paused') return;

  ctx.phase = 'question_open';

  const onTick = (ms: number) => {
    ctx.room.broadcast(JSON.stringify({ type: 'game:timer_tick', remainingMs: ms }));
  };
  ctx.timer.resume(ctx.timer.remainingMs, onTick, () => {});

  await ctx.room.storage.setAlarm(Date.now() + ctx.timer.remainingMs);

  ctx.room.broadcast(JSON.stringify({
    type: 'game:timer_resumed',
    remainingMs: ctx.timer.remainingMs,
  }));
}

export async function handleHostReveal(
  ctx: GameContext,
  sender: Party.Connection,
): Promise<void> {
  if (sender.id !== ctx.hostConnectionId) return;
  if (ctx.phase !== 'question_open' && ctx.phase !== 'question_paused') return;

  ctx.timer.clear();
  ctx.phase = 'question_revealed';

  const question = ctx.wines[ctx.currentRound].questions[ctx.currentQuestion];
  const correctOption = question.options.find((o) => o.correct)!;

  const hostResults: { pseudonym: string; points: number; totalScore: number }[] = [];
  for (const [, participant] of ctx.participants) {
    const inFlightKey = `${participant.id}:${question.id}`;
    const answeredOptionId = ctx.inFlightAnswers.get(inFlightKey) ?? null;
    const { correct: isCorrect, points } = answeredOptionId !== null
      ? scoreAnswer(question, answeredOptionId)
      : { correct: false, points: 0 };
    participant.score += points;

    await ctx.room.storage.put(`response:${participant.id}:${question.id}`, {
      optionId: answeredOptionId,
      correct: isCorrect,
      points,
    });

    hostResults.push({ pseudonym: participant.pseudonym, points, totalScore: participant.score });

    const conn = ctx.room.getConnection(participant.socketId);
    if (conn) {
      conn.send(JSON.stringify({
        type: 'game:answer_revealed',
        correctOptionId: correctOption.id,
        myPoints: points,
        myTotalScore: participant.score,
      }));
    }
  }

  await ctx.saveState();

  const hostConn = ctx.hostConnectionId ? ctx.room.getConnection(ctx.hostConnectionId) : null;
  hostConn?.send(JSON.stringify({
    type: 'game:answer_revealed',
    correctOptionId: correctOption.id,
    results: hostResults,
  }));
}

export async function handleHostNext(
  ctx: GameContext,
  sender: Party.Connection,
): Promise<void> {
  if (sender.id !== ctx.hostConnectionId) return;
  if (ctx.phase !== 'question_revealed' && ctx.phase !== 'round_leaderboard') return;

  const wine = ctx.wines[ctx.currentRound];
  const isLastQuestion = ctx.currentQuestion >= wine.questions.length - 1;
  const isLastWine = ctx.currentRound >= ctx.wines.length - 1;

  if (ctx.phase === 'round_leaderboard') {
    if (isLastWine) {
      await ctx.endGame();
    } else {
      ctx.currentRound++;
      ctx.currentQuestion = 0;
      ctx.phase = 'question_open';
      await ctx.saveState();
      await ctx.broadcastQuestion();
    }
    return;
  }

  if (isLastQuestion) {
    ctx.phase = 'round_leaderboard';
    await ctx.saveState();
    ctx.broadcast('game:round_leaderboard', {
      rankings: buildRankings(ctx.participants),
      roundIndex: ctx.currentRound,
      totalRounds: ctx.wines.length,
    });
  } else {
    ctx.currentQuestion++;
    ctx.phase = 'question_open';
    await ctx.saveState();
    await ctx.broadcastQuestion();
  }
}

export async function handleHostEnd(
  ctx: GameContext,
  sender: Party.Connection,
): Promise<void> {
  if (sender.id !== ctx.hostConnectionId) return;
  await ctx.endGame();
}

export function handleSubmitAnswer(
  ctx: GameContext,
  event: Record<string, unknown>,
  sender: Party.Connection,
): void {
  const { questionId, optionId } = event as { questionId: string; optionId: string };
  if (ctx.phase !== 'question_open' && ctx.phase !== 'question_paused') return;

  let participant = null;
  for (const [, p] of ctx.participants) {
    if (p.socketId === sender.id) {
      participant = p;
      break;
    }
  }
  if (!participant) return;

  const inFlightKey = `${participant.id}:${questionId}`;
  const isFirstAnswer = !ctx.inFlightAnswers.has(inFlightKey);

  ctx.inFlightAnswers.set(inFlightKey, optionId);

  const answeredCount = isFirstAnswer
    ? (participant.answeredQuestions.add(questionId), Array.from(ctx.participants.values()).filter(
        (p) => p.answeredQuestions.has(questionId),
      ).length)
    : Array.from(ctx.participants.values()).filter(
        (p) => p.answeredQuestions.has(questionId),
      ).length;

  const hostConn = ctx.hostConnectionId ? ctx.room.getConnection(ctx.hostConnectionId) : null;
  hostConn?.send(JSON.stringify({
    type: 'game:participant_answered',
    pseudonym: participant.pseudonym,
    answeredCount,
    totalCount: ctx.participants.size,
  }));
}
