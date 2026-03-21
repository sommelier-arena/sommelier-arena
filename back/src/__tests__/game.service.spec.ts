import { GameService, QuestionPayload } from '../game/game.service';
import { PseudonymService } from '../game/pseudonym.service';
import { CreateSessionDto } from '../game/dto/create-session.dto';

function makeDto(wineCount = 1): CreateSessionDto {
  const dto = new CreateSessionDto();
  dto.wines = Array.from({ length: wineCount }, (_, wi) => ({
    name: `Wine ${wi + 1}`,
    questions: [
      {
        category: 'color',
        correctAnswer: 'Red',
        distractors: ['White', 'Rosé', 'Orange'],
      },
      {
        category: 'country',
        correctAnswer: 'France',
        distractors: ['Italy', 'Spain', 'USA'],
      },
      {
        category: 'grape_variety',
        correctAnswer: 'Merlot',
        distractors: ['Cabernet', 'Syrah', 'Pinot'],
      },
      {
        category: 'vintage_year',
        correctAnswer: '2018',
        distractors: ['2015', '2019', '2020'],
      },
    ],
  }));
  return dto;
}

describe('GameService', () => {
  let service: GameService;
  const HOST = 'host-socket-1';
  const P1 = 'participant-socket-1';
  const P2 = 'participant-socket-2';

  beforeEach(() => {
    service = new GameService(new PseudonymService());
  });

  // ─── createSession ─────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('returns a 4-digit numeric code', () => {
      const code = service.createSession(makeDto(), HOST);
      expect(code).toMatch(/^\d{4}$/);
    });

    it('builds a session with correct question prompts', () => {
      const code = service.createSession(makeDto(), HOST);
      const session = service.getSession(code)!;
      expect(session.wines[0].questions[0].category).toBe('color');
      expect(session.wines[0].questions[0].prompt).toBe(
        'What is the color of this wine?',
      );
    });

    it('stores 4 options per question (1 correct, 3 distractors)', () => {
      const code = service.createSession(makeDto(), HOST);
      const session = service.getSession(code)!;
      const opts = session.wines[0].questions[0].options;
      expect(opts).toHaveLength(4);
      expect(opts.filter((o) => o.correct)).toHaveLength(1);
      expect(opts.filter((o) => !o.correct)).toHaveLength(3);
    });
  });

  // ─── joinSession ───────────────────────────────────────────────────────────

  describe('joinSession', () => {
    it('assigns unique pseudonyms to participants', () => {
      const code = service.createSession(makeDto(), HOST);
      const r1 = service.joinSession(code, P1);
      const r2 = service.joinSession(code, P2);
      expect('error' in r1).toBe(false);
      expect('error' in r2).toBe(false);
      if (!('error' in r1) && !('error' in r2)) {
        expect(r1.pseudonym).not.toBe(r2.pseudonym);
      }
    });

    it('returns NOT_FOUND for unknown code', () => {
      const result = service.joinSession('9999', P1);
      expect('error' in result && result.error.code).toBe('NOT_FOUND');
    });

    it('rejects join after game started', () => {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      service.startGame(code);
      const result = service.joinSession(code, P2);
      expect('error' in result && result.error.code).toBe('ALREADY_STARTED');
    });

    it('rejects join when session is full (10 players)', () => {
      const code = service.createSession(makeDto(), HOST);
      for (let i = 0; i < 10; i++) {
        service.joinSession(code, `p-${i}`);
      }
      const result = service.joinSession(code, 'p-overflow');
      expect('error' in result && result.error.code).toBe('SESSION_FULL');
    });
  });

  // ─── startGame ─────────────────────────────────────────────────────────────

  describe('startGame', () => {
    it('returns the first question payload', () => {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      const payload = service.startGame(code) as QuestionPayload;
      expect(payload).not.toBeNull();
      expect(payload.questionIndex).toBe(0);
      expect(payload.roundIndex).toBe(0);
      expect(payload.options).toHaveLength(4);
    });

    it('returns null when called twice', () => {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      service.startGame(code);
      expect(service.startGame(code)).toBeNull();
    });
  });

  // ─── submitAnswer ──────────────────────────────────────────────────────────

  describe('submitAnswer', () => {
    function setup() {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      const q = service.startGame(code) as QuestionPayload;
      return { code, q };
    }

    it('records the answer and returns host update', () => {
      const { code, q } = setup();
      const result = service.submitAnswer(
        code,
        P1,
        q.questionId,
        q.options[0].id,
      );
      expect(result).not.toBeNull();
      expect(result!.hostUpdate.answeredCount).toBe(1);
    });

    it('enforces first-tap lock (second submit returns null)', () => {
      const { code, q } = setup();
      service.submitAnswer(code, P1, q.questionId, q.options[0].id);
      const second = service.submitAnswer(
        code,
        P1,
        q.questionId,
        q.options[1].id,
      );
      expect(second).toBeNull();
    });

    it('rejects submit when question is paused', () => {
      const { code, q } = setup();
      service.pauseGame(code);
      const result = service.submitAnswer(
        code,
        P1,
        q.questionId,
        q.options[0].id,
      );
      expect(result).toBeNull();
    });
  });

  // ─── revealAnswer ──────────────────────────────────────────────────────────

  describe('revealAnswer', () => {
    function setup() {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      service.joinSession(code, P2);
      const q = service.startGame(code) as QuestionPayload;
      return { code, q };
    }

    it('awards 100pts to the participant who chose the correct option', () => {
      const { code, q } = setup();
      const correctOption = q.options.find((o) => {
        const session = service.getSession(code)!;
        return session.wines[0].questions[0].options.find(
          (opt) => opt.id === o.id && opt.correct,
        );
      })!;
      service.submitAnswer(code, P1, q.questionId, correctOption.id);

      const result = service.revealAnswer(code)!;
      const p1Result = result.participantResults.get(P1)!;
      expect(p1Result.myPoints).toBe(100);
      expect(p1Result.myTotalScore).toBe(100);
    });

    it('awards 0pts to participant with wrong answer', () => {
      const { code, q } = setup();
      // Find a wrong option
      const session = service.getSession(code)!;
      const wrongOption = session.wines[0].questions[0].options.find(
        (o) => !o.correct,
      )!;
      service.submitAnswer(code, P2, q.questionId, wrongOption.id);

      const result = service.revealAnswer(code)!;
      const p2Result = result.participantResults.get(P2)!;
      expect(p2Result.myPoints).toBe(0);
    });

    it('awards 0pts to unanswered participant', () => {
      const { code } = setup();
      const result = service.revealAnswer(code)!;
      const p1Result = result.participantResults.get(P1)!;
      expect(p1Result.myPoints).toBe(0);
    });

    it('is idempotent (second call returns null)', () => {
      const { code } = setup();
      service.revealAnswer(code);
      expect(service.revealAnswer(code)).toBeNull();
    });
  });

  // ─── advanceQuestion ───────────────────────────────────────────────────────

  describe('advanceQuestion', () => {
    it('advances through all 4 questions then shows round leaderboard', () => {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      service.startGame(code);

      for (let q = 0; q < 4; q++) {
        service.revealAnswer(code);
        const result = service.advanceQuestion(code)!;
        if (q < 3) {
          expect(result.type).toBe('question');
        } else {
          expect(result.type).toBe('roundLeaderboard');
        }
      }
    });

    it('moves to next wine after round leaderboard', () => {
      const code = service.createSession(makeDto(2), HOST);
      service.joinSession(code, P1);
      service.startGame(code);

      // Complete first wine
      for (let q = 0; q < 4; q++) {
        service.revealAnswer(code);
        service.advanceQuestion(code);
      }
      // Now on round leaderboard for wine 1 → advance should start wine 2
      const result = service.advanceQuestion(code)!;
      expect(result.type).toBe('question');
      if (result.type === 'question') {
        expect(result.payload.roundIndex).toBe(1);
        expect(result.payload.questionIndex).toBe(0);
      }
    });

    it('returns final leaderboard after last wine round leaderboard', () => {
      const code = service.createSession(makeDto(1), HOST);
      service.joinSession(code, P1);
      service.startGame(code);

      for (let q = 0; q < 4; q++) {
        service.revealAnswer(code);
        service.advanceQuestion(code);
      }
      // Now on round leaderboard for the only wine → final
      const result = service.advanceQuestion(code)!;
      expect(result.type).toBe('finalLeaderboard');
    });
  });

  // ─── pause / resume ────────────────────────────────────────────────────────

  describe('pauseGame / resumeGame', () => {
    it('toggles phase correctly', () => {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      service.startGame(code);

      expect(service.pauseGame(code)).toBe(true);
      expect(service.getSession(code)!.phase).toBe('question_paused');

      expect(service.resumeGame(code)).toBe(true);
      expect(service.getSession(code)!.phase).toBe('question_open');
    });

    it('returns false when pausing a revealed question', () => {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      service.startGame(code);
      service.revealAnswer(code);
      expect(service.pauseGame(code)).toBe(false);
    });
  });

  // ─── disconnect handlers ───────────────────────────────────────────────────

  describe('handleHostDisconnect', () => {
    it('ends the session and returns code', () => {
      const code = service.createSession(makeDto(), HOST);
      const result = service.handleHostDisconnect(HOST)!;
      expect(result.code).toBe(code);
      expect(service.getSession(code)).toBeUndefined();
    });

    it('returns null for unknown socket', () => {
      expect(service.handleHostDisconnect('unknown')).toBeNull();
    });
  });

  describe('handleParticipantDisconnect', () => {
    it('marks participant as disconnected', () => {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      service.handleParticipantDisconnect(P1);
      expect(service.getCodeForParticipantSocket(P1)).toBeUndefined();
    });

    it('returns null for unknown socket', () => {
      expect(service.handleParticipantDisconnect('unknown')).toBeNull();
    });
  });

  // ─── endSession ────────────────────────────────────────────────────────────

  describe('endSession', () => {
    it('returns final rankings and cleans up', () => {
      const code = service.createSession(makeDto(), HOST);
      service.joinSession(code, P1);
      const result = service.endSession(code)!;
      expect(result.rankings).toBeInstanceOf(Array);
      expect(service.getSession(code)).toBeUndefined();
    });
  });
});
