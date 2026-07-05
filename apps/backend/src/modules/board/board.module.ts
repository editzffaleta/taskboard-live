import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '../../db/db.module';
import { BoardController } from './board.controller';
import { BoardGateway } from './realtime/board.gateway';
import { PresenceTracker } from './realtime/presence.tracker';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { PrismaBoardRepository } from './board.prisma';
import { PrismaMembershipRepository } from './membership.prisma';

@Module({
  imports: [DbModule, ConfigModule],
  controllers: [BoardController],
  providers: [
    PrismaBoardRepository,
    PrismaMembershipRepository,
    BoardGateway,
    PresenceTracker,
    RealtimeEmitterImpl,
  ],
  exports: [
    PrismaBoardRepository,
    PrismaMembershipRepository,
    RealtimeEmitterImpl,
  ],
})
export class BoardModule {}
