/**
 * persistence.ts
 *
 * Storage helpers: save/restore DO state, write to KV session index, end game.
 */
import type { GameContext } from './game-context';
import type { SavedState, SessionListEntry } from './types';
import { buildRankings } from './scoring';

export async function saveState(ctx: GameContext): Promise<void> {
  await ctx.room.storage.put<SavedState>('state', {
    wines: ctx.wines,
    phase: ctx.phase,
    timerSeconds: ctx.timerSeconds,
    currentRound: ctx.currentRound,
    currentQuestion: ctx.currentQuestion,
    hostId: ctx.hostId ?? '',
    sessionTitle: ctx.sessionTitle,
    createdAt: ctx.createdAt,
  });
}

export async function upsertKvSession(
  ctx: GameContext,
  update: {
    status?: 'waiting' | 'active' | 'ended';
    finalRankings?: { pseudonym: string; score: number }[];
  },
): Promise<void> {
  if (!ctx.hostId) return;
  const kvKey = `host:${ctx.hostId}`;
  try {
    const hostsKv = (ctx.room.context.bindings as unknown as {
      HOSTS_KV: {
        get(k: string, t: 'json'): Promise<unknown>;
        put(k: string, v: string): Promise<void>;
      };
    }).HOSTS_KV;

    const existing = (await hostsKv.get(kvKey, 'json') as SessionListEntry[] | null) ?? [];

    const sessionEntry: SessionListEntry = {
      code: ctx.room.id,
      title: ctx.sessionTitle,
      createdAt: ctx.createdAt,
      status: update.status ?? 'waiting',
      participantCount: ctx.participants.size,
      ...(update.finalRankings ? { finalRankings: update.finalRankings } : {}),
    };

    const idx = existing.findIndex((s) => s.code === ctx.room.id);
    if (idx >= 0) {
      existing[idx] = sessionEntry;
    } else {
      existing.push(sessionEntry);
    }

    await hostsKv.put(kvKey, JSON.stringify(existing));
  } catch {
    // KV not available in local dev without binding — fail silently
  }
}

export async function endGame(ctx: GameContext): Promise<void> {
  ctx.timer.clear();
  ctx.phase = 'ended';
  const rankings = buildRankings(ctx.participants);

  await saveState(ctx);
  await upsertKvSession(ctx, { status: 'ended', finalRankings: rankings });

  ctx.broadcast('game:final_leaderboard', { rankings });
  ctx.broadcast('session:ended', {});
}
