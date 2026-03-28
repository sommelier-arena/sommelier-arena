import { ADJECTIVES, NOUNS } from './constants';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate a unique ADJECTIVE-NOUN identity (e.g. TANNIC-BARREL).
 *  Used for both host IDs and participant pseudonyms. */
export function generateIdentity(usedIds: Set<string> = new Set()): string {
  for (let i = 0; i < 400; i++) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const candidate = `${adj.toUpperCase()}-${noun.toUpperCase()}`;
    if (!usedIds.has(candidate)) return candidate;
  }
  return `WINE-${Math.floor(Math.random() * 9000) + 1000}`;
}
