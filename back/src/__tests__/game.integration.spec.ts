import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { AddressInfo } from 'net';
import { io as ioClient, type Socket } from 'socket.io-client';
import { AppModule } from '../app.module';

// Real HTTP+WS server — allow more time
jest.setTimeout(20_000);

const WINES_PAYLOAD = {
  wines: [
    {
      name: 'Château Test',
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
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function waitFor<T>(socket: Socket, event: string, ms = 5_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`Timeout waiting for "${event}"`)),
      ms,
    );
    socket.once(event, (data: T) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

function whenConnected(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }
    const t = setTimeout(
      () => reject(new Error('Socket connection timeout')),
      3_000,
    );
    socket.once('connect', () => {
      clearTimeout(t);
      resolve();
    });
    socket.once('connect_error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Game Integration', () => {
  let app: INestApplication;
  let port: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableCors({ origin: '*' });
    await app.listen(0); // listen on a random free port
    port = (app.getHttpServer().address() as AddressInfo).port;
  });

  afterAll(async () => {
    await app.close();
  });

  function connect(): Socket {
    return ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }

  // ── 1. Session creation ────────────────────────────────────────────────────

  describe('create_session', () => {
    it('emits session:created with a 4-digit code', async () => {
      const host = connect();
      await whenConnected(host);

      const p = waitFor<{ code: string }>(host, 'session:created');
      host.emit('create_session', WINES_PAYLOAD);
      const { code } = await p;

      expect(code).toMatch(/^\d{4}$/);
      host.disconnect();
    });
  });

  // ── 2. Join ────────────────────────────────────────────────────────────────

  describe('join_session', () => {
    it('returns NOT_FOUND for unknown code', async () => {
      const p = connect();
      await whenConnected(p);

      const err = waitFor<{ code: string }>(p, 'error');
      p.emit('join_session', { code: '0000' });
      const { code } = await err;

      expect(code).toBe('NOT_FOUND');
      p.disconnect();
    });

    it('assigns distinct pseudonyms to two participants', async () => {
      const host = connect();
      const p1 = connect();
      const p2 = connect();
      await Promise.all([whenConnected(host), whenConnected(p1), whenConnected(p2)]);

      const created = waitFor<{ code: string }>(host, 'session:created');
      host.emit('create_session', WINES_PAYLOAD);
      const { code } = await created;

      const j1 = waitFor<{ pseudonym: string }>(p1, 'participant:joined');
      p1.emit('join_session', { code });
      const { pseudonym: pn1 } = await j1;

      const j2 = waitFor<{ pseudonym: string }>(p2, 'participant:joined');
      p2.emit('join_session', { code });
      const { pseudonym: pn2 } = await j2;

      expect(pn1).not.toBe(pn2);
      [host, p1, p2].forEach((s) => s.disconnect());
    });

    it('rejects join after game has started', async () => {
      const host = connect();
      const p1 = connect();
      const late = connect();
      await Promise.all([whenConnected(host), whenConnected(p1), whenConnected(late)]);

      const created = waitFor<{ code: string }>(host, 'session:created');
      host.emit('create_session', WINES_PAYLOAD);
      const { code } = await created;

      p1.emit('join_session', { code });
      await waitFor(p1, 'participant:joined');

      // Start the game
      host.emit('host:start');
      await waitFor(host, 'game:question');

      // Late joiner should be rejected
      const err = waitFor<{ code: string }>(late, 'error');
      late.emit('join_session', { code });
      const { code: errCode } = await err;

      expect(errCode).toBe('ALREADY_STARTED');
      [host, p1, late].forEach((s) => s.disconnect());
    });
  });

  // ── 3. Full game flow (1 wine × 4 questions) ──────────────────────────────

  describe('full game flow', () => {
    it('runs from lobby through final leaderboard', async () => {
      const host = connect();
      const p1 = connect();
      const p2 = connect();
      await Promise.all([whenConnected(host), whenConnected(p1), whenConnected(p2)]);

      // Create session
      host.emit('create_session', WINES_PAYLOAD);
      const { code } = await waitFor<{ code: string }>(host, 'session:created');

      // Both participants join
      p1.emit('join_session', { code });
      await waitFor(p1, 'participant:joined');
      p2.emit('join_session', { code });
      await waitFor(p2, 'participant:joined');

      // Start → Q1 broadcast to all
      const q1OnHost = waitFor<any>(host, 'game:question');
      const q1OnP1 = waitFor<any>(p1, 'game:question');
      host.emit('host:start');
      const [q1] = await Promise.all([q1OnHost, q1OnP1]);

      expect(q1.questionIndex).toBe(0);
      expect(q1.roundIndex).toBe(0);
      expect(q1.options).toHaveLength(4);
      expect(q1.timerMs).toBe(60_000);

      // P1 answers correctly (options[0] = correctAnswer from fixture)
      const answered = waitFor<any>(host, 'game:participant_answered');
      p1.emit('submit_answer', {
        questionId: q1.questionId,
        optionId: q1.options[0].id,
      });
      const stat = await answered;
      expect(stat.answeredCount).toBe(1);
      expect(stat.totalCount).toBe(2);

      // Host reveals Q1
      const hostReveal = waitFor<any>(host, 'game:answer_revealed');
      const p1Reveal = waitFor<any>(p1, 'game:answer_revealed');
      host.emit('host:reveal');
      const [hr, pr] = await Promise.all([hostReveal, p1Reveal]);

      expect(hr.correctOptionId).toBe(q1.options[0].id);
      expect(pr.myPoints).toBe(100);
      expect(pr.myTotalScore).toBe(100);

      // Q2–Q4: advance and reveal (no answers → 0 pts)
      for (let i = 1; i < 4; i++) {
        const nextQ = waitFor<any>(host, 'game:question');
        host.emit('host:next');
        const q = await nextQ;
        expect(q.questionIndex).toBe(i);

        host.emit('host:reveal');
        await waitFor(host, 'game:answer_revealed');
      }

      // After Q4 revealed: host:next → round leaderboard
      const rlb = waitFor<any>(host, 'game:round_leaderboard');
      host.emit('host:next');
      const rlbData = await rlb;

      expect(rlbData.roundIndex).toBe(0);
      expect(rlbData.rankings).toHaveLength(2);

      // After last wine's round leaderboard: host:next → final leaderboard
      const flbOnHost = waitFor<any>(host, 'game:final_leaderboard');
      const flbOnP1 = waitFor<any>(p1, 'game:final_leaderboard');
      host.emit('host:next');
      const [hf] = await Promise.all([flbOnHost, flbOnP1]);

      expect(hf.rankings).toHaveLength(2);
      // P1 answered Q1 correctly (+100), all others 0 → P1 is ranked first
      expect(hf.rankings[0].score).toBe(100);

      [host, p1, p2].forEach((s) => s.disconnect());
    });
  });

  // ── 4. Host disconnect ────────────────────────────────────────────────────

  describe('host disconnect', () => {
    it('emits session:ended to all participants', async () => {
      const host = connect();
      const p1 = connect();
      await Promise.all([whenConnected(host), whenConnected(p1)]);

      host.emit('create_session', WINES_PAYLOAD);
      const { code } = await waitFor<{ code: string }>(host, 'session:created');

      p1.emit('join_session', { code });
      await waitFor(p1, 'participant:joined');

      const ended = waitFor(p1, 'session:ended');
      host.disconnect();
      await ended;

      p1.disconnect();
    });
  });

  // ── 5. Pause / Resume ─────────────────────────────────────────────────────

  describe('pause and resume', () => {
    it('preserves remaining time across pause/resume', async () => {
      const host = connect();
      const p1 = connect();
      await Promise.all([whenConnected(host), whenConnected(p1)]);

      host.emit('create_session', WINES_PAYLOAD);
      const { code } = await waitFor<{ code: string }>(host, 'session:created');

      p1.emit('join_session', { code });
      await waitFor(p1, 'participant:joined');

      host.emit('host:start');
      await waitFor(host, 'game:question');

      // Pause
      const paused = waitFor<{ remainingMs: number }>(host, 'game:timer_paused');
      host.emit('host:pause');
      const { remainingMs: pausedAt } = await paused;

      expect(pausedAt).toBeGreaterThan(0);
      expect(pausedAt).toBeLessThanOrEqual(60_000);

      // Resume must broadcast the same remainingMs
      const resumed = waitFor<{ remainingMs: number }>(host, 'game:timer_resumed');
      host.emit('host:resume');
      const { remainingMs: resumedAt } = await resumed;

      expect(resumedAt).toBe(pausedAt);

      [host, p1].forEach((s) => s.disconnect());
    });
  });

  // ── 6. Answer lock (first tap is final) ──────────────────────────────────

  describe('answer lock', () => {
    it('ignores a second submit from the same participant', async () => {
      const host = connect();
      const p1 = connect();
      await Promise.all([whenConnected(host), whenConnected(p1)]);

      host.emit('create_session', WINES_PAYLOAD);
      const { code } = await waitFor<{ code: string }>(host, 'session:created');

      p1.emit('join_session', { code });
      await waitFor(p1, 'participant:joined');

      host.emit('host:start');
      const q = await waitFor<any>(p1, 'game:question');

      // First answer (correct)
      const first = waitFor<any>(host, 'game:participant_answered');
      p1.emit('submit_answer', {
        questionId: q.questionId,
        optionId: q.options[0].id,
      });
      await first;

      // Second answer — must NOT trigger another game:participant_answered
      let secondFired = false;
      host.once('game:participant_answered', () => {
        secondFired = true;
      });
      p1.emit('submit_answer', {
        questionId: q.questionId,
        optionId: q.options[1].id,
      });
      await new Promise((r) => setTimeout(r, 400));
      expect(secondFired).toBe(false);

      // Reveal — P1's first (correct) answer counted → +100
      host.emit('host:reveal');
      const reveal = await waitFor<any>(host, 'game:answer_revealed');
      const p1Result = reveal.results.find(
        (r: { pseudonym: string }) => r.pseudonym !== null,
      );
      expect(p1Result.points).toBe(100);

      [host, p1].forEach((s) => s.disconnect());
    });
  });

  // ── 7. host:end from mid-game ─────────────────────────────────────────────

  describe('host:end', () => {
    it('immediately pushes final leaderboard to all participants', async () => {
      const host = connect();
      const p1 = connect();
      await Promise.all([whenConnected(host), whenConnected(p1)]);

      host.emit('create_session', WINES_PAYLOAD);
      const { code } = await waitFor<{ code: string }>(host, 'session:created');

      p1.emit('join_session', { code });
      await waitFor(p1, 'participant:joined');

      host.emit('host:start');
      await waitFor(host, 'game:question');

      // End mid-question
      const hostFinal = waitFor<any>(host, 'game:final_leaderboard');
      const p1Final = waitFor<any>(p1, 'game:final_leaderboard');
      host.emit('host:end');

      const [hf, pf] = await Promise.all([hostFinal, p1Final]);
      expect(hf.rankings).toHaveLength(1);
      expect(pf.rankings).toHaveLength(1);

      [host, p1].forEach((s) => s.disconnect());
    });
  });
});
