import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '../../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { BoardController } from './board.controller';
import { ArchivedController } from './archived.controller';
import { SearchController } from './search.controller';
import { ListController } from './list.controller';
import { CardController } from './card.controller';
import { MembersController } from './members.controller';
import { ActivityController } from './activity.controller';
import { LabelController } from './label.controller';
import { CardLabelController } from './card-label.controller';
import { ChecklistController } from './checklist.controller';
import { CardAssigneeController } from './card-assignee.controller';
import { CommentController } from './comment.controller';
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
import {
  PrismaLabelRepository,
  PrismaCardLabelRepository,
} from './label.prisma';
import { PrismaChecklistItemRepository } from './checklist-item.prisma';
import { PrismaCardAssigneeRepository } from './card-assignee.prisma';
import { PrismaCommentRepository } from './comment.prisma';

@Module({
  imports: [DbModule, ConfigModule, forwardRef(() => AuthModule)],
  controllers: [
    BoardController,
    ArchivedController,
    SearchController,
    ListController,
    CardController,
    MembersController,
    ActivityController,
    LabelController,
    CardLabelController,
    ChecklistController,
    CardAssigneeController,
    CommentController,
  ],
  providers: [
    PrismaBoardRepository,
    PrismaListRepository,
    PrismaCardRepository,
    PrismaMembershipRepository,
    PrismaActivityRepository,
    PrismaLabelRepository,
    PrismaCardLabelRepository,
    PrismaChecklistItemRepository,
    PrismaCardAssigneeRepository,
    PrismaCommentRepository,
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
    PrismaLabelRepository,
    PrismaCardLabelRepository,
    PrismaChecklistItemRepository,
    PrismaCardAssigneeRepository,
    PrismaCommentRepository,
    RealtimeEmitterImpl,
    ActivityRecorderImpl,
  ],
})
export class BoardModule {}
