import { describe, it, expect } from 'vitest';
import { scoreAnswer, buildRankings } from '../../../../back/scoring';

const makeOption = (id: string, text: string, correct = false) => ({ id, text, correct });
const makeQuestion = () => ({
  id: 'q1',
  category: 'color' as const,
  prompt: 'What is the color?',
  options: [makeOption('o1', 'Red', true), makeOption('o2', 'White', false)],
});

describe('scoring', () => {
  it('scores correct and incorrect answers', () => {
    const q = makeQuestion();
    const res1 = scoreAnswer(q as any, 'o1');
    expect(res1.correct).toBe(true);
    expect(res1.points).toBe(100);

    const res2 = scoreAnswer(q as any, 'o2');
    expect(res2.correct).toBe(false);
    expect(res2.points).toBe(0);
  });

  it('buildRankings sorts participants by score desc', () => {
    const map = new Map();
    map.set('p1', { pseudonym: 'A', score: 50 });
    map.set('p2', { pseudonym: 'B', score: 150 });
    const ranks = buildRankings(map as any);
    expect(ranks[0].pseudonym).toBe('B');
    expect(ranks[1].pseudonym).toBe('A');
  });
});
