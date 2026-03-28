import { describe, it, expect, vi } from 'vitest';
import { shuffle, generateIdentity } from '../../../../back/utils';
import { ADJECTIVES, NOUNS } from '../../../../back/constants';

// ── shuffle ───────────────────────────────────────────────────────────────────

describe('shuffle', () => {
  it('returns an array with the same elements', () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original);
    expect(result).toHaveLength(original.length);
    expect(result.sort()).toEqual([...original].sort());
  });

  it('does not mutate the original array', () => {
    const original = ['a', 'b', 'c'];
    const copy = [...original];
    shuffle(original);
    expect(original).toEqual(copy);
  });

  it('returns an empty array unchanged', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('returns a single-element array unchanged', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('produces a different order with high probability over many runs', () => {
    const original = [1, 2, 3, 4, 5];
    let sameCount = 0;
    for (let i = 0; i < 20; i++) {
      if (shuffle(original).join(',') === original.join(',')) sameCount++;
    }
    expect(sameCount).toBeLessThan(20);
  });
});

// ── generateIdentity ──────────────────────────────────────────────────────────

describe('generateIdentity', () => {
  it('returns a string in ADJECTIVE-NOUN format (uppercase, hyphen-separated)', () => {
    const result = generateIdentity();
    expect(result).toMatch(/^[A-Z]+-[A-Z]+$/);
  });

  it('consists of a valid adjective and a valid noun from the vocabulary lists', () => {
    const result = generateIdentity();
    const [adj, noun] = result.split('-');
    expect(ADJECTIVES.map((a) => a.toUpperCase())).toContain(adj);
    expect(NOUNS.map((n) => n.toUpperCase())).toContain(noun);
  });

  it('returns a string not already in usedIds', () => {
    const used = new Set<string>();
    const result = generateIdentity(used);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(used.has(result)).toBe(false);
  });

  it('avoids identities already in the used set', () => {
    const used = new Set<string>();
    for (const adj of ADJECTIVES) {
      for (const noun of NOUNS) {
        used.add(`${adj.toUpperCase()}-${noun.toUpperCase()}`);
      }
    }
    // Remove one so there is exactly one valid result.
    const remaining = `${ADJECTIVES[0].toUpperCase()}-${NOUNS[0].toUpperCase()}`;
    used.delete(remaining);

    const result = generateIdentity(used);
    expect(used.has(result)).toBe(false);
  });

  it('returns a fallback "WINE-####" string when all combinations are used', () => {
    const used = new Set<string>();
    for (const adj of ADJECTIVES) {
      for (const noun of NOUNS) {
        used.add(`${adj.toUpperCase()}-${noun.toUpperCase()}`);
      }
    }
    const result = generateIdentity(used);
    expect(result).toMatch(/^WINE-\d{4}$/);
  });

  it('returns unique identities across multiple calls with the same used set', () => {
    const used = new Set<string>();
    const results = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const p = generateIdentity(used);
      used.add(p);
      results.add(p);
    }
    expect(results.size).toBe(10);
  });

  it('produces diverse results across multiple calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 30; i++) {
      results.add(generateIdentity());
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

