import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '../../db/db.module';
import { BoardController } from './board.controller';
import { ListController } from './list.controller';
import { CardController } from './card.controller';
import { BoardGateway } from './realtime/board.gateway';
import { PresenceTracker } from './realtime/presence.tracker';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { PrismaBoardRepository } from './board.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaCardRepository } from './card.prisma';
import { PrismaMembershipRepository } from './membership.prisma';

@Module({
  imports: [DbModule, ConfigModule],
  controllers: [BoardController, ListController, CardController],
  providers: [
    PrismaBoardRepository,
    PrismaListRepository,
    PrismaCardRepository,
    PrismaMembershipRepository,
    BoardGateway,
    PresenceTracker,
    RealtimeEmitterImpl,
  ],
  exports: [
    PrismaBoardRepository,
    PrismaListRepository,
    PrismaCardRepository,
    PrismaMembershipRepository,
    RealtimeEmitterImpl,
  ],
})
export class BoardModule {}
