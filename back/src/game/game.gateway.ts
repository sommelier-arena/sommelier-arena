import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { TimerService } from './timer.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly timerService: TimerService,
  ) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  handleDisconnect(client: Socket): void {
    // Host disconnect → end session, notify participants
    const hostResult = this.gameService.handleHostDisconnect(client.id);
    if (hostResult) {
      this.timerService.clear(hostResult.code);
      this.server.to(hostResult.code).emit('session:ended');
      return;
    }

    // Participant disconnect → freeze score, update lobby if in waiting
    const pResult = this.gameService.handleParticipantDisconnect(client.id);
    if (pResult) {
      const session = this.gameService.getSession(pResult.code);
      if (session?.phase === 'waiting') {
        const participants = this.gameService.getLobbyParticipants(pResult.code);
        this.server
          .to(pResult.code)
          .emit('lobby:updated', { participants, count: participants.length });
      }
    }
  }

  // ─── Host events ───────────────────────────────────────────────────────────

  @SubscribeMessage('create_session')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  onCreateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CreateSessionDto,
  ): void {
    const code = this.gameService.createSession(dto, client.id);
    client.join(code);
    client.emit('session:created', { code });
  }

  @SubscribeMessage('host:start')
  onHostStart(@ConnectedSocket() client: Socket): void {
    const code = this.gameService.getCodeForHostSocket(client.id);
    if (!code) {
      client.emit('error', { message: 'No session found', code: 'NOT_FOUND' });
      return;
    }
    const session = this.gameService.getSession(code);
    if (!session || session.participants.size === 0) {
      client.emit('error', {
        message: 'No participants in lobby',
        code: 'NO_PARTICIPANTS',
      });
      return;
    }
    const payload = this.gameService.startGame(code);
    if (!payload) {
      client.emit('error', {
        message: 'Cannot start session',
        code: 'INVALID_STATE',
      });
      return;
    }
    this.server.to(code).emit('game:started');
    this.server.to(code).emit('game:question', payload);
    this.startQuestionTimer(code);
  }

  @SubscribeMessage('host:pause')
  onHostPause(@ConnectedSocket() client: Socket): void {
    const code = this.gameService.getCodeForHostSocket(client.id);
    if (!code) return;
    if (!this.gameService.pauseGame(code)) return;
    const remainingMs = this.timerService.pause(code);
    this.server.to(code).emit('game:timer_paused', { remainingMs });
  }

  @SubscribeMessage('host:resume')
  onHostResume(@ConnectedSocket() client: Socket): void {
    const code = this.gameService.getCodeForHostSocket(client.id);
    if (!code) return;
    if (!this.gameService.resumeGame(code)) return;
    const remainingMs = this.timerService.getRemainingMs(code);
    this.timerService.resume(
      code,
      (ms) => this.server.to(code).emit('game:timer_tick', { remainingMs: ms }),
      () => this.handleTimerExpiry(code),
    );
    this.server.to(code).emit('game:timer_resumed', { remainingMs });
  }

  @SubscribeMessage('host:reveal')
  onHostReveal(@ConnectedSocket() client: Socket): void {
    const code = this.gameService.getCodeForHostSocket(client.id);
    if (!code) return;
    this.timerService.clear(code);
    this.doReveal(code);
  }

  @SubscribeMessage('host:next')
  onHostNext(@ConnectedSocket() client: Socket): void {
    const code = this.gameService.getCodeForHostSocket(client.id);
    if (!code) return;
    const result = this.gameService.advanceQuestion(code);
    if (!result) return;
    this.handleAdvanceResult(code, result);
  }

  @SubscribeMessage('host:end')
  onHostEnd(@ConnectedSocket() client: Socket): void {
    const code = this.gameService.getCodeForHostSocket(client.id);
    if (!code) return;
    this.timerService.clear(code);
    const result = this.gameService.endSession(code);
    if (!result) return;
    this.server.to(code).emit('game:final_leaderboard', result);
  }

  // ─── Participant events ────────────────────────────────────────────────────

  @SubscribeMessage('join_session')
  onJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code: string },
  ): void {
    const result = this.gameService.joinSession(payload.code, client.id);
    if ('error' in result) {
      client.emit('error', result.error);
      return;
    }
    client.join(payload.code);
    client.emit('participant:joined', { pseudonym: result.pseudonym });
    this.server.to(payload.code).emit('lobby:updated', {
      participants: result.lobbyParticipants,
      count: result.lobbyParticipants.length,
    });
  }

  @SubscribeMessage('submit_answer')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  onSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubmitAnswerDto,
  ): void {
    const code = this.gameService.getCodeForParticipantSocket(client.id);
    if (!code) return;
    const result = this.gameService.submitAnswer(
      code,
      client.id,
      dto.questionId,
      dto.optionId,
    );
    if (!result) return;

    const session = this.gameService.getSession(code);
    if (session) {
      this.server
        .to(session.hostSocketId)
        .emit('game:participant_answered', result.hostUpdate);
    }
  }

  // ─── Privates ──────────────────────────────────────────────────────────────

  private startQuestionTimer(code: string): void {
    this.timerService.start(
      code,
      60_000,
      (remainingMs) =>
        this.server.to(code).emit('game:timer_tick', { remainingMs }),
      () => this.handleTimerExpiry(code),
    );
  }

  private handleTimerExpiry(code: string): void {
    this.doReveal(code);
  }

  private doReveal(code: string): void {
    const result = this.gameService.revealAnswer(code);
    if (!result) return;

    // Emit tailored payload to host
    const hostSocket = this.server.sockets.sockets.get(result.hostSocketId);
    if (hostSocket) {
      hostSocket.emit('game:answer_revealed', {
        correctOptionId: result.correctOptionId,
        results: result.hostResults,
      });
    }

    // Emit tailored payload to each connected participant
    result.participantResults.forEach((payload, socketId) => {
      const sock = this.server.sockets.sockets.get(socketId);
      if (sock) sock.emit('game:answer_revealed', payload);
    });
  }

  private handleAdvanceResult(
    code: string,
    result: import('./game.service').AdvanceResult,
  ): void {
    if (result.type === 'question') {
      this.server.to(code).emit('game:question', result.payload);
      this.startQuestionTimer(code);
    } else if (result.type === 'roundLeaderboard') {
      this.server.to(code).emit('game:round_leaderboard', result.payload);
    } else if (result.type === 'finalLeaderboard') {
      this.server.to(code).emit('game:final_leaderboard', result.payload);
    }
  }
}
