import { describe, it, expect } from 'vitest';
import { scoreAnswer, buildRankings } from '../../../../back/scoring';
import type { Question, Participant } from '../../../../back/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeOption = (id: string, text: string, correct = false) => ({ id, text, correct });

const makeQuestion = (overrides?: Partial<Question>): Question => ({
  id: 'q1',
  category: 'color',
  prompt: 'What is the color?',
  options: [makeOption('o1', 'Red', true), makeOption('o2', 'White'), makeOption('o3', 'Rosé'), makeOption('o4', 'Orange')],
  ...overrides,
} as Question);

const makeParticipant = (pseudonym: string, score: number): Participant => ({
  id: `id-${pseudonym}`,
  socketId: `socket-${pseudonym}`,
  pseudonym,
  score,
  connected: true,
  answeredQuestions: new Set(),
});

// ── scoreAnswer ───────────────────────────────────────────────────────────────

describe('scoreAnswer', () => {
  it('returns correct=true and 100 pts for the correct option', () => {
    const q = makeQuestion();
    const result = scoreAnswer(q, 'o1');
    expect(result.correct).toBe(true);
    expect(result.points).toBe(100);
  });

  it('returns correct=false and 0 pts for an incorrect option', () => {
    const q = makeQuestion();
    const result = scoreAnswer(q, 'o2');
    expect(result.correct).toBe(false);
    expect(result.points).toBe(0);
  });

  it('returns correct=false and 0 pts for an unknown optionId', () => {
    const q = makeQuestion();
    const result = scoreAnswer(q, 'nonexistent');
    expect(result.correct).toBe(false);
    expect(result.points).toBe(0);
  });

  it('returns correct=false and 0 pts for an empty optionId', () => {
    const q = makeQuestion();
    const result = scoreAnswer(q, '');
    expect(result.correct).toBe(false);
    expect(result.points).toBe(0);
  });

  it('does not award points when there are no correct options', () => {
    const q = makeQuestion({
      options: [makeOption('o1', 'Red', false), makeOption('o2', 'White', false)],
    });
    const result = scoreAnswer(q, 'o1');
    expect(result.correct).toBe(false);
    expect(result.points).toBe(0);
  });
});

// ── buildRankings ─────────────────────────────────────────────────────────────

describe('buildRankings', () => {
  it('sorts participants by score descending', () => {
    const map = new Map<string, Participant>();
    map.set('p1', makeParticipant('Alice', 50));
    map.set('p2', makeParticipant('Bob', 150));
    map.set('p3', makeParticipant('Carol', 100));

    const ranks = buildRankings(map);
    expect(ranks.map((r) => r.pseudonym)).toEqual(['Bob', 'Carol', 'Alice']);
    expect(ranks.map((r) => r.score)).toEqual([150, 100, 50]);
  });

  it('returns an empty array for an empty participants map', () => {
    expect(buildRankings(new Map())).toEqual([]);
  });

  it('returns a single entry for a single participant', () => {
    const map = new Map<string, Participant>();
    map.set('p1', makeParticipant('Solo', 300));
    const ranks = buildRankings(map);
    expect(ranks).toHaveLength(1);
    expect(ranks[0].pseudonym).toBe('Solo');
    expect(ranks[0].score).toBe(300);
  });

  it('handles participants with equal scores (stable relative order)', () => {
    const map = new Map<string, Participant>();
    map.set('p1', makeParticipant('Alpha', 100));
    map.set('p2', makeParticipant('Beta', 100));
    const ranks = buildRankings(map);
    expect(ranks).toHaveLength(2);
    expect(ranks.every((r) => r.score === 100)).toBe(true);
  });

  it('handles a participant with 0 score', () => {
    const map = new Map<string, Participant>();
    map.set('p1', makeParticipant('Leader', 200));
    map.set('p2', makeParticipant('Tail', 0));
    const ranks = buildRankings(map);
    expect(ranks[0].pseudonym).toBe('Leader');
    expect(ranks[1].pseudonym).toBe('Tail');
  });
});
