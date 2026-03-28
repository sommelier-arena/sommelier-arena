/**
 * question.ts
 *
 * Question payload construction and broadcast helpers, plus getLobbyParticipants.
 */
import type { GameContext } from './game-context';

export function buildQuestionPayload(ctx: GameContext): object {
  const wine = ctx.wines[ctx.currentRound];
  const question = wine.questions[ctx.currentQuestion];
  return {
    questionId: question.id,
    questionIndex: ctx.currentQuestion,
    totalQuestions: wine.questions.length,
    roundIndex: ctx.currentRound,
    totalRounds: ctx.wines.length,
    category: question.category,
    prompt: question.prompt,
    options: question.options.map((o) => ({ id: o.id, text: o.text })),
    timerMs: ctx.timerSeconds * 1000,
  };
}

export async function broadcastQuestion(ctx: GameContext): Promise<void> {
  const payload = buildQuestionPayload(ctx);
  ctx.room.broadcast(JSON.stringify({ type: 'game:question', ...payload }));
  await ctx.startTimer();
}

/** Returns pseudonyms of all joined participants (connected or not). */
export function getLobbyParticipants(ctx: GameContext): string[] {
  return Array.from(ctx.participants.values()).map((p) => p.pseudonym);
}

export function broadcast(
  ctx: GameContext,
  type: string,
  data: object,
  exclude?: string[],
): void {
  ctx.room.broadcast(JSON.stringify({ type, ...data }), exclude);
}
