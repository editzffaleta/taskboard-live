import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '../../db/db.module';
import { BoardController } from './board.controller';
import { ListController } from './list.controller';
import { BoardGateway } from './realtime/board.gateway';
import { PresenceTracker } from './realtime/presence.tracker';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { PrismaBoardRepository } from './board.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaMembershipRepository } from './membership.prisma';

@Module({
  imports: [DbModule, ConfigModule],
  controllers: [BoardController, ListController],
  providers: [
    PrismaBoardRepository,
    PrismaListRepository,
    PrismaMembershipRepository,
    BoardGateway,
    PresenceTracker,
    RealtimeEmitterImpl,
  ],
  exports: [
    PrismaBoardRepository,
    PrismaListRepository,
    PrismaMembershipRepository,
    RealtimeEmitterImpl,
  ],
})
export class BoardModule {}
