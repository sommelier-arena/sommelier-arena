import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { TimerService } from './timer.service';
import { PseudonymService } from './pseudonym.service';

@Module({
  providers: [GameGateway, GameService, TimerService, PseudonymService],
})
export class GameModule {}
