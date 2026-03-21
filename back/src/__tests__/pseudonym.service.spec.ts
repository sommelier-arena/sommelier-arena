import { PseudonymService } from '../game/pseudonym.service';
import { Session } from '../game/interfaces/session.interface';

function makeEmptySession(existingPseudonyms: string[] = []): Session {
  const participants = new Map(
    existingPseudonyms.map((p, i) => [
      `socket-${i}`,
      {
        id: `id-${i}`,
        socketId: `socket-${i}`,
        pseudonym: p,
        score: 0,
        connected: true,
        answers: new Map(),
      },
    ]),
  );
  return {
    id: 'session-1',
    code: '1234',
    hostSocketId: 'host-socket',
    phase: 'waiting',
    wines: [],
    participants,
    currentRound: 0,
    currentQuestion: 0,
    timerRemainingMs: 60000,
  };
}

describe('PseudonymService', () => {
  let service: PseudonymService;

  beforeEach(() => {
    service = new PseudonymService();
  });

  it('generates a pseudonym in AdjNoun format', () => {
    const session = makeEmptySession();
    const pseudonym = service.generate(session);
    expect(typeof pseudonym).toBe('string');
    expect(pseudonym.length).toBeGreaterThan(4);
    // Should be a single word of two concatenated parts (no spaces)
    expect(pseudonym).toMatch(/^[A-Z]/);
  });

  it('generates unique pseudonyms for each participant', () => {
    const session = makeEmptySession();
    const pseudonyms = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const p = service.generate(session);
      expect(pseudonyms.has(p)).toBe(false);
      pseudonyms.add(p);
      // Simulate adding participant to session
      session.participants.set(`socket-${i}`, {
        id: `id-${i}`,
        socketId: `socket-${i}`,
        pseudonym: p,
        score: 0,
        connected: true,
        answers: new Map(),
      });
    }
  });

  it('does not return a pseudonym already in use', () => {
    const existing = ['TannicFalcon', 'FruityBarrel'];
    const session = makeEmptySession(existing);
    // Generate many times to confirm no collision
    for (let i = 0; i < 50; i++) {
      const p = service.generate(session);
      expect(existing.includes(p)).toBe(false);
    }
  });
});
