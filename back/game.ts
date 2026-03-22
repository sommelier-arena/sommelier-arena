import type * as Party from 'partykit/server';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionPhase =
  | 'waiting'
  | 'question_open'
  | 'question_paused'
  | 'question_revealed'
  | 'round_leaderboard'
  | 'ended';

export type QuestionCategory =
  | 'color'
  | 'country'
  | 'grape_variety'
  | 'vintage_year'
  | 'wine_name';

export interface AnswerOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  category: QuestionCategory;
  prompt: string;
  options: AnswerOption[];
}

export interface Wine {
  id: string;
  name: string;
  questions: Question[];
}

export interface Participant {
  id: string;
  socketId: string;
  pseudonym: string;
  score: number;
  connected: boolean;
  answeredQuestions: Set<string>;
}

export interface ParticipantAnswer {
  optionId: string;
  correct: boolean;
  points: number;
}

export interface SessionListEntry {
  code: string;
  title: string;
  createdAt: string;
  status: 'waiting' | 'active' | 'ended';
  participantCount: number;
  finalRankings?: { pseudonym: string; score: number }[];
}

export interface SavedState {
  wines: Wine[];
  phase: SessionPhase;
  timerSeconds: number;
  currentRound: number;
  currentQuestion: number;
  hostId: string;
  sessionTitle: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PLAYERS = 10;

const CATEGORY_PROMPTS: Record<QuestionCategory, string> = {
  color: 'What is the color of this wine?',
  country: 'From which country or region does this wine come?',
  grape_variety: 'What is the grape variety of this wine?',
  vintage_year: 'What is the vintage year of this wine?',
  wine_name: 'What is the name of this wine?',
};

const ADJECTIVES = [
  'Tannic', 'Fruity', 'Oaky', 'Crisp', 'Bold',
  'Silky', 'Robust', 'Floral', 'Velvety', 'Mineral',
  'Earthy', 'Smoky', 'Spicy', 'Vivid', 'Amber',
  'Peaty', 'Briny', 'Zesty', 'Plummy', 'Mellow',
];

const NOUNS = [
  'Falcon', 'Barrel', 'Vine', 'Cork', 'Cellar',
  'Magnum', 'Chateau', 'Bouquet', 'Tannin', 'Grape',
  'Carafe', 'Terroir', 'Decanter', 'Cuvee', 'Goblet',
  'Riesling', 'Claret', 'Merlot', 'Shiraz', 'Pinot',
];

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Pseudonym generator ──────────────────────────────────────────────────────

function generatePseudonym(usedPseudonyms: Set<string>): string {
  for (let i = 0; i < 400; i++) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const candidate = `${adj}${noun}`;
    if (!usedPseudonyms.has(candidate)) return candidate;
  }
  return `Wine${Math.floor(Math.random() * 9000) + 1000}`;
}

// ─── GameSession Durable Object ───────────────────────────────────────────────

export default class GameSession implements Party.Server {
  // ── In-memory state (restored from disk in onStart) ──────────────────────
  wines: Wine[] = [];
  phase: SessionPhase = 'waiting';
  timerSeconds = 60;
  timerRemainingMs = 60_000;
  currentRound = 0;
  currentQuestion = 0;
  hostId: string | null = null;
  sessionTitle = '';
  createdAt = '';
  hostConnectionId: string | null = null;
  activeTimer: ReturnType<typeof setInterval> | null = null;

  // Keyed by rejoinToken
  participants = new Map<string, Participant>();
  // Keyed by `${participantId}:${questionId}`
  inFlightAnswers = new Map<string, string>();

  constructor(readonly room: Party.Room) {}

  // ── Restore persisted state when DO wakes ────────────────────────────────

  async onStart() {
    const state = await this.room.storage.get<SavedState>('state');
    if (state) {
      this.wines = state.wines;
      this.phase = state.phase;
      this.timerSeconds = state.timerSeconds;
      this.currentRound = state.currentRound;
      this.currentQuestion = state.currentQuestion;
      this.hostId = state.hostId;
      this.sessionTitle = state.sessionTitle;
      this.createdAt = state.createdAt;
    }

    // Restore participants from disk
    const allKeys = await this.room.storage.list<Participant>();
    for (const [key, value] of allKeys) {
      if (key.startsWith('participant:')) {
        const rejoinToken = key.slice('participant:'.length);
        this.participants.set(rejoinToken, {
          ...value,
          socketId: '', // will be re-assigned on reconnect
          connected: false,
          answeredQuestions: new Set(Array.isArray((value as any).answeredQuestions)
            ? (value as any).answeredQuestions
            : []),
        });
      }
    }
  }

  // ── New connection ────────────────────────────────────────────────────────

  onConnect(conn: Party.Connection) {
    // Send current state snapshot to new connection so they can decide next step
    conn.send(JSON.stringify({
      type: 'server:state_snapshot',
      phase: this.phase,
      code: this.room.id,
    }));
  }

  // ── Message dispatcher ────────────────────────────────────────────────────

  async onMessage(message: string, sender: Party.Connection) {
    let event: { type: string; [key: string]: unknown };
    try {
      event = JSON.parse(message);
    } catch {
      return;
    }

    switch (event.type) {
      case 'create_session':
        await this.handleCreateSession(event, sender);
        break;
      case 'rejoin_host':
        await this.handleRejoinHost(event, sender);
        break;
      case 'join_session':
        await this.handleJoinSession(event, sender);
        break;
      case 'rejoin_session':
        await this.handleRejoinSession(event, sender);
        break;
      case 'host:start':
        await this.handleHostStart(sender);
        break;
      case 'host:pause':
        this.handleHostPause(sender);
        break;
      case 'host:resume':
        await this.handleHostResume(sender);
        break;
      case 'host:reveal':
        await this.handleHostReveal(sender);
        break;
      case 'host:next':
        await this.handleHostNext(sender);
        break;
      case 'host:end':
        await this.handleHostEnd(sender);
        break;
      case 'submit_answer':
        this.handleSubmitAnswer(event, sender);
        break;
    }
  }

  // ── Connection closed ─────────────────────────────────────────────────────

  onClose(conn: Party.Connection) {
    if (conn.id === this.hostConnectionId) {
      this.hostConnectionId = null;
      // Host disconnected — if game was active, end it gracefully so
      // participants receive final scores before the session:ended message.
      if (this.phase !== 'waiting' && this.phase !== 'ended') {
        this.clearTimer();
        void this.endGame();
      }
      return;
    }

    // Participant disconnected — mark as disconnected, freeze score
    for (const [, participant] of this.participants) {
      if (participant.socketId === conn.id) {
        participant.connected = false;
        // Notify lobby if still in waiting phase
        if (this.phase === 'waiting') {
          this.broadcast('lobby:updated', {
            participants: this.getLobbyParticipants(),
            count: this.participants.size,
          });
        }
        break;
      }
    }
  }

  // ── Alarm: authoritative timer expiry ────────────────────────────────────

  async alarm() {
    await this.handleTimerExpiry();
  }

  // ─── Event handlers ───────────────────────────────────────────────────────

  private async handleCreateSession(
    event: Record<string, unknown>,
    sender: Party.Connection,
  ) {
    if (this.wines.length > 0) {
      // Session already exists — re-attach if same hostId
      const existingHostId = await this.room.storage.get<string>('hostId');
      if (existingHostId && existingHostId === event.hostId) {
        this.hostConnectionId = sender.id;
        sender.send(JSON.stringify({
          type: 'session:created',
          code: this.room.id,
          hostId: existingHostId,
        }));
      } else {
        sender.send(JSON.stringify({
          type: 'error',
          message: 'Session code already in use',
          code: 'CODE_TAKEN',
        }));
      }
      return;
    }

    const wines = event.wines as Array<{
      name: string;
      questions: Array<{
        category: QuestionCategory;
        correctAnswer: string;
        distractors: [string, string, string];
      }>;
    }>;

    const timerSeconds = typeof event.timerSeconds === 'number'
      ? Math.max(15, Math.min(120, event.timerSeconds))
      : 60;

    const hostId = (event.hostId as string) || this.generateHostId();
    const title = (event.title as string) || wines[0]?.name || 'Wine Night';

    this.wines = wines.map((wineDto) => ({
      id: uuidv4(),
      name: wineDto.name,
      questions: wineDto.questions.map((qDto) => {
        const options: AnswerOption[] = shuffle([
          { id: uuidv4(), text: qDto.correctAnswer, correct: true },
          ...qDto.distractors.map((text) => ({
            id: uuidv4(),
            text,
            correct: false,
          })),
        ]);
        return {
          id: uuidv4(),
          category: qDto.category,
          prompt: CATEGORY_PROMPTS[qDto.category],
          options,
        };
      }),
    }));

    this.timerSeconds = timerSeconds;
    this.timerRemainingMs = timerSeconds * 1000;
    this.hostId = hostId;
    this.sessionTitle = title;
    this.createdAt = new Date().toISOString();
    this.hostConnectionId = sender.id;

    await this.saveState();
    await this.room.storage.put('hostId', hostId);

    // Update KV session index
    await this.upsertKvSession({ status: 'waiting' });

    sender.send(JSON.stringify({
      type: 'session:created',
      code: this.room.id,
      hostId,
    }));
  }

  private async handleRejoinHost(
    event: Record<string, unknown>,
    sender: Party.Connection,
  ) {
    const storedHostId = await this.room.storage.get<string>('hostId');
    if (!storedHostId || storedHostId !== event.hostId) {
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Invalid host ID',
        code: 'INVALID_HOST_ID',
      }));
      return;
    }

    this.hostConnectionId = sender.id;
    sender.send(JSON.stringify({
      type: 'host:state_snapshot',
      phase: this.phase,
      code: this.room.id,
      hostId: storedHostId,
      wines: this.wines,
      participants: this.getLobbyParticipants(),
      timerSeconds: this.timerSeconds,
      currentRound: this.currentRound,
      currentQuestion: this.currentQuestion,
      question: this.phase === 'question_open' || this.phase === 'question_paused' || this.phase === 'question_revealed'
        ? this.buildQuestionPayload()
        : null,
      rankings: this.buildRankings(),
    }));
  }

  private async handleJoinSession(
    event: Record<string, unknown>,
    sender: Party.Connection,
  ) {
    if (this.phase !== 'waiting') {
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Game already started',
        code: 'GAME_STARTED',
      }));
      return;
    }
    if (this.participants.size >= MAX_PLAYERS) {
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Session is full',
        code: 'SESSION_FULL',
      }));
      return;
    }

    const usedPseudonyms = new Set(
      Array.from(this.participants.values()).map((p) => p.pseudonym),
    );
    const pseudonym = generatePseudonym(usedPseudonyms);
    const rejoinToken = uuidv4();

    const participant: Participant = {
      id: uuidv4(),
      socketId: sender.id,
      pseudonym,
      score: 0,
      connected: true,
      answeredQuestions: new Set(),
    };

    this.participants.set(rejoinToken, participant);

    // Persist to DO storage
    await this.room.storage.put(`participant:${rejoinToken}`, {
      id: participant.id,
      pseudonym: participant.pseudonym,
      score: participant.score,
      connected: participant.connected,
      answeredQuestions: [],
    });

    sender.send(JSON.stringify({
      type: 'participant:joined',
      pseudonym,
      rejoinToken,
    }));

    this.broadcast('lobby:updated', {
      participants: this.getLobbyParticipants(),
      count: this.participants.size,
    });
  }

  private async handleRejoinSession(
    event: Record<string, unknown>,
    sender: Party.Connection,
  ) {
    const rejoinToken = event.rejoinToken as string;
    const participant = this.participants.get(rejoinToken);

    if (!participant) {
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Invalid rejoin token',
        code: 'INVALID_TOKEN',
      }));
      return;
    }

    participant.socketId = sender.id;
    participant.connected = true;

    sender.send(JSON.stringify({
      type: 'participant:state_snapshot',
      pseudonym: participant.pseudonym,
      score: participant.score,
      phase: this.phase,
      question: this.phase === 'question_open' || this.phase === 'question_paused'
        ? this.buildQuestionPayload()
        : null,
    }));

    if (this.phase === 'waiting') {
      this.broadcast('lobby:updated', {
        participants: this.getLobbyParticipants(),
        count: this.participants.size,
      });
    }
  }

  private async handleHostStart(sender: Party.Connection) {
    if (sender.id !== this.hostConnectionId) return;
    if (this.phase !== 'waiting') return;
    if (this.participants.size === 0) {
      sender.send(JSON.stringify({
        type: 'error',
        message: 'No participants in lobby',
        code: 'NO_PARTICIPANTS',
      }));
      return;
    }

    this.phase = 'question_open';
    this.currentRound = 0;
    this.currentQuestion = 0;
    await this.saveState();
    await this.upsertKvSession({ status: 'active' });

    this.broadcast('game:started', {});
    await this.broadcastQuestion();
  }

  private handleHostPause(sender: Party.Connection) {
    if (sender.id !== this.hostConnectionId) return;
    if (this.phase !== 'question_open') return;

    this.clearTimer();
    this.phase = 'question_paused';

    this.room.broadcast(JSON.stringify({
      type: 'game:timer_paused',
      remainingMs: this.timerRemainingMs,
    }));
  }

  private async handleHostResume(sender: Party.Connection) {
    if (sender.id !== this.hostConnectionId) return;
    if (this.phase !== 'question_paused') return;

    this.phase = 'question_open';
    await this.startTimer();

    this.room.broadcast(JSON.stringify({
      type: 'game:timer_resumed',
      remainingMs: this.timerRemainingMs,
    }));
  }

  private async handleHostReveal(sender: Party.Connection) {
    if (sender.id !== this.hostConnectionId) return;
    if (this.phase !== 'question_open' && this.phase !== 'question_paused') return;

    this.clearTimer();
    this.phase = 'question_revealed';

    const question = this.wines[this.currentRound].questions[this.currentQuestion];
    const correctOption = question.options.find((o) => o.correct)!;

    // Score and persist final answers
    const hostResults: { pseudonym: string; points: number; totalScore: number }[] = [];
    for (const [, participant] of this.participants) {
      const inFlightKey = `${participant.id}:${question.id}`;
      const answeredOptionId = this.inFlightAnswers.get(inFlightKey) ?? null;
      const isCorrect = answeredOptionId === correctOption.id;
      const points = answeredOptionId !== null ? (isCorrect ? 100 : 0) : 0;
      participant.score += points;

      // Persist final answer to disk
      await this.room.storage.put(`response:${participant.id}:${question.id}`, {
        optionId: answeredOptionId,
        correct: isCorrect,
        points,
      });

      hostResults.push({
        pseudonym: participant.pseudonym,
        points,
        totalScore: participant.score,
      });

      // Send per-participant result
      const conn = this.room.getConnection(participant.socketId);
      if (conn) {
        conn.send(JSON.stringify({
          type: 'game:answer_revealed',
          correctOptionId: correctOption.id,
          myPoints: points,
          myTotalScore: participant.score,
        }));
      }
    }

    await this.saveState();

    // Send host result
    const hostConn = this.hostConnectionId
      ? this.room.getConnection(this.hostConnectionId)
      : null;
    hostConn?.send(JSON.stringify({
      type: 'game:answer_revealed',
      correctOptionId: correctOption.id,
      results: hostResults,
    }));
  }

  private async handleHostNext(sender: Party.Connection) {
    if (sender.id !== this.hostConnectionId) return;
    if (this.phase !== 'question_revealed' && this.phase !== 'round_leaderboard') return;

    const wine = this.wines[this.currentRound];
    const isLastQuestion = this.currentQuestion >= wine.questions.length - 1;
    const isLastWine = this.currentRound >= this.wines.length - 1;

    if (this.phase === 'round_leaderboard') {
      if (isLastWine) {
        await this.endGame();
      } else {
        this.currentRound++;
        this.currentQuestion = 0;
        this.phase = 'question_open';
        await this.saveState();
        await this.broadcastQuestion();
      }
      return;
    }

    // From question_revealed
    if (isLastQuestion) {
      this.phase = 'round_leaderboard';
      await this.saveState();
      this.broadcast('game:round_leaderboard', {
        rankings: this.buildRankings(),
        roundIndex: this.currentRound,
        totalRounds: this.wines.length,
      });
    } else {
      this.currentQuestion++;
      this.phase = 'question_open';
      await this.saveState();
      await this.broadcastQuestion();
    }
  }

  private async handleHostEnd(sender: Party.Connection) {
    if (sender.id !== this.hostConnectionId) return;
    await this.endGame();
  }

  private handleSubmitAnswer(
    event: Record<string, unknown>,
    sender: Party.Connection,
  ) {
    const { questionId, optionId } = event as { questionId: string; optionId: string };
    if (this.phase !== 'question_open' && this.phase !== 'question_paused') return;

    // Find participant by socketId
    let participant: Participant | null = null;
    for (const [, p] of this.participants) {
      if (p.socketId === sender.id) {
        participant = p;
        break;
      }
    }
    if (!participant) return;

    const inFlightKey = `${participant.id}:${questionId}`;
    const isFirstAnswer = !this.inFlightAnswers.has(inFlightKey);

    // Overwrite (no lock)
    this.inFlightAnswers.set(inFlightKey, optionId);

    // answeredCount increments only on first answer
    const answeredCount = isFirstAnswer
      ? (participant.answeredQuestions.add(questionId), Array.from(this.participants.values()).filter(
          (p) => p.answeredQuestions.has(questionId),
        ).length)
      : Array.from(this.participants.values()).filter(
          (p) => p.answeredQuestions.has(questionId),
        ).length;

    const hostConn = this.hostConnectionId
      ? this.room.getConnection(this.hostConnectionId)
      : null;
    hostConn?.send(JSON.stringify({
      type: 'game:participant_answered',
      pseudonym: participant.pseudonym,
      answeredCount,
      totalCount: this.participants.size,
    }));
  }

  // ─── Timer helpers ────────────────────────────────────────────────────────

  private async startTimer() {
    this.clearTimer();
    this.timerRemainingMs = this.timerRemainingMs > 0
      ? this.timerRemainingMs
      : this.timerSeconds * 1000;

    // RAM layer: visual countdown every second
    this.activeTimer = setInterval(() => {
      this.timerRemainingMs = Math.max(0, this.timerRemainingMs - 1000);
      this.room.broadcast(JSON.stringify({
        type: 'game:timer_tick',
        remainingMs: this.timerRemainingMs,
      }));
    }, 1000);

    // Disk layer: authoritative alarm (survives DO eviction)
    await this.room.storage.setAlarm(Date.now() + this.timerRemainingMs);
  }

  private clearTimer() {
    if (this.activeTimer !== null) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
  }

  private async handleTimerExpiry() {
    if (this.phase !== 'question_open') return;
    // Treat as host clicking reveal
    this.clearTimer();
    this.phase = 'question_revealed';

    const question = this.wines[this.currentRound].questions[this.currentQuestion];
    const correctOption = question.options.find((o) => o.correct)!;

    const hostResults: { pseudonym: string; points: number; totalScore: number }[] = [];
    for (const [, participant] of this.participants) {
      const inFlightKey = `${participant.id}:${question.id}`;
      const answeredOptionId = this.inFlightAnswers.get(inFlightKey) ?? null;
      const isCorrect = answeredOptionId === correctOption.id;
      const points = answeredOptionId !== null ? (isCorrect ? 100 : 0) : 0;
      participant.score += points;

      await this.room.storage.put(`response:${participant.id}:${question.id}`, {
        optionId: answeredOptionId,
        correct: isCorrect,
        points,
      });

      hostResults.push({ pseudonym: participant.pseudonym, points, totalScore: participant.score });

      const conn = this.room.getConnection(participant.socketId);
      conn?.send(JSON.stringify({
        type: 'game:answer_revealed',
        correctOptionId: correctOption.id,
        myPoints: points,
        myTotalScore: participant.score,
      }));
    }

    await this.saveState();

    const hostConn = this.hostConnectionId ? this.room.getConnection(this.hostConnectionId) : null;
    hostConn?.send(JSON.stringify({
      type: 'game:answer_revealed',
      correctOptionId: correctOption.id,
      results: hostResults,
    }));
  }

  // ─── Broadcast helpers ────────────────────────────────────────────────────

  private async broadcastQuestion() {
    this.timerRemainingMs = this.timerSeconds * 1000;
    const payload = this.buildQuestionPayload();
    this.room.broadcast(JSON.stringify({ type: 'game:question', ...payload }));
    await this.startTimer();
  }

  private buildQuestionPayload() {
    const wine = this.wines[this.currentRound];
    const question = wine.questions[this.currentQuestion];
    return {
      questionId: question.id,
      questionIndex: this.currentQuestion,
      totalQuestions: wine.questions.length,
      roundIndex: this.currentRound,
      totalRounds: this.wines.length,
      category: question.category,
      prompt: question.prompt,
      options: question.options.map((o) => ({ id: o.id, text: o.text })),
      timerMs: this.timerSeconds * 1000,
    };
  }

  broadcast(type: string, data: object, exclude?: string[]) {
    this.room.broadcast(JSON.stringify({ type, ...data }), exclude);
  }

  // ─── End game ─────────────────────────────────────────────────────────────

  private async endGame() {
    this.clearTimer();
    this.phase = 'ended';
    const rankings = this.buildRankings();

    await this.saveState();
    await this.upsertKvSession({
      status: 'ended',
      finalRankings: rankings,
    });

    this.broadcast('game:final_leaderboard', { rankings });
    this.broadcast('session:ended', {});
  }

  // ─── Persistence helpers ──────────────────────────────────────────────────

  private async saveState() {
    await this.room.storage.put<SavedState>('state', {
      wines: this.wines,
      phase: this.phase,
      timerSeconds: this.timerSeconds,
      currentRound: this.currentRound,
      currentQuestion: this.currentQuestion,
      hostId: this.hostId ?? '',
      sessionTitle: this.sessionTitle,
      createdAt: this.createdAt,
    });
  }

  private async upsertKvSession(update: {
    status?: 'waiting' | 'active' | 'ended';
    finalRankings?: { pseudonym: string; score: number }[];
  }) {
    if (!this.hostId) return;
    const kvKey = `host:${this.hostId}`;
    try {
      const existing = (await this.room.context.bindings.HOSTS_KV.get(
        kvKey,
        'json',
      ) as SessionListEntry[] | null) ?? [];

      const sessionEntry: SessionListEntry = {
        code: this.room.id,
        title: this.sessionTitle,
        createdAt: this.createdAt,
        status: update.status ?? 'waiting',
        participantCount: this.participants.size,
        ...(update.finalRankings ? { finalRankings: update.finalRankings } : {}),
      };

      const idx = existing.findIndex((s) => s.code === this.room.id);
      if (idx >= 0) {
        existing[idx] = sessionEntry;
      } else {
        existing.push(sessionEntry);
      }

      await this.room.context.bindings.HOSTS_KV.put(kvKey, JSON.stringify(existing));
    } catch {
      // KV not available in local dev without binding — fail silently
    }
  }

  // ─── Misc helpers ─────────────────────────────────────────────────────────

  private getLobbyParticipants(): string[] {
    return Array.from(this.participants.values())
      .filter((p) => p.connected)
      .map((p) => p.pseudonym);
  }

  private buildRankings(): { pseudonym: string; score: number }[] {
    return Array.from(this.participants.values())
      .map((p) => ({ pseudonym: p.pseudonym, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }

  private generateHostId(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj.toUpperCase()}-${noun.toUpperCase()}`;
  }
}
