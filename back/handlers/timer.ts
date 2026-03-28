/**
 * handlers/timer.ts
 *
 * Timer-related handlers:
 * - startTimer: starts the in-process tick + sets DO alarm
 * - handleTimerExpiry: called by alarm(); scores pending answers and sends reveal
 */
import type { GameContext } from '../game-context';
import { scoreAnswer } from '../scoring';

export async function startTimer(ctx: GameContext): Promise<void> {
  const onTick = (ms: number) => {
    ctx.room.broadcast(JSON.stringify({ type: 'game:timer_tick', remainingMs: ms }));
  };
  ctx.timer.start(ctx.timerSeconds, onTick, () => {});

  // Disk layer: authoritative alarm (survives DO eviction)
  await ctx.room.storage.setAlarm(Date.now() + ctx.timer.remainingMs);
}

export async function handleTimerExpiry(ctx: GameContext): Promise<void> {
  if (ctx.phase !== 'question_open') return;
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
    conn?.send(JSON.stringify({
      type: 'game:answer_revealed',
      correctOptionId: correctOption.id,
      myPoints: points,
      myTotalScore: participant.score,
    }));
  }

  await ctx.saveState();

  const hostConn = ctx.hostConnectionId ? ctx.room.getConnection(ctx.hostConnectionId) : null;
  hostConn?.send(JSON.stringify({
    type: 'game:answer_revealed',
    correctOptionId: correctOption.id,
    results: hostResults,
  }));
}
