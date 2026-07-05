import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '../../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { BoardController } from './board.controller';
import { ListController } from './list.controller';
import { CardController } from './card.controller';
import { MembersController } from './members.controller';
import { ActivityController } from './activity.controller';
import { BoardGateway } from './realtime/board.gateway';
import { PresenceTracker } from './realtime/presence.tracker';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { PrismaBoardRepository } from './board.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaCardRepository } from './card.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { PrismaActivityRepository } from './activity.prisma';
import { ActivityRecorderImpl } from './activity-recorder.provider';
import { MemberDirectoryAdapter } from './member-directory.provider';

@Module({
  imports: [DbModule, ConfigModule, AuthModule],
  controllers: [
    BoardController,
    ListController,
    CardController,
    MembersController,
    ActivityController,
  ],
  providers: [
    PrismaBoardRepository,
    PrismaListRepository,
    PrismaCardRepository,
    PrismaMembershipRepository,
    PrismaActivityRepository,
    MemberDirectoryAdapter,
    BoardGateway,
    PresenceTracker,
    RealtimeEmitterImpl,
    ActivityRecorderImpl,
  ],
  exports: [
    PrismaBoardRepository,
    PrismaListRepository,
    PrismaCardRepository,
    PrismaMembershipRepository,
    PrismaActivityRepository,
    RealtimeEmitterImpl,
    ActivityRecorderImpl,
  ],
})
export class BoardModule {}
