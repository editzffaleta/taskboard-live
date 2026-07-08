import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '../../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { BoardController } from './board.controller';
import { BoardTemplateController } from './board-template.controller';
import { ArchivedController } from './archived.controller';
import { SearchController } from './search.controller';
import { ListController } from './list.controller';
import { CardController } from './card.controller';
import { MembersController } from './members.controller';
import { InvitationsController } from './invitations.controller';
import { ActivityController } from './activity.controller';
import { CardActivityController } from './card-activity.controller';
import { LabelController } from './label.controller';
import { CardLabelController } from './card-label.controller';
import { ChecklistController } from './checklist.controller';
import { CardAssigneeController } from './card-assignee.controller';
import { CommentController } from './comment.controller';
import { NotificationController } from './notification.controller';
import { BoardGateway } from './realtime/board.gateway';
import { PresenceTracker } from './realtime/presence.tracker';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { PrismaBoardRepository } from './board.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaCardRepository } from './card.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { PrismaInvitationRepository } from './invitation.prisma';
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
import { PrismaNotificationRepository } from './notification.prisma';
import { NotificationRecorderImpl } from './notification-recorder.provider';

@Module({
  imports: [DbModule, ConfigModule, forwardRef(() => AuthModule)],
  controllers: [
    BoardController,
    BoardTemplateController,
    ArchivedController,
    SearchController,
    ListController,
    CardController,
    MembersController,
    InvitationsController,
    ActivityController,
    CardActivityController,
    LabelController,
    CardLabelController,
    ChecklistController,
    CardAssigneeController,
    CommentController,
    NotificationController,
  ],
  providers: [
    PrismaBoardRepository,
    PrismaListRepository,
    PrismaCardRepository,
    PrismaMembershipRepository,
    PrismaInvitationRepository,
    PrismaActivityRepository,
    PrismaLabelRepository,
    PrismaCardLabelRepository,
    PrismaChecklistItemRepository,
    PrismaCardAssigneeRepository,
    PrismaCommentRepository,
    PrismaNotificationRepository,
    MemberDirectoryAdapter,
    BoardGateway,
    PresenceTracker,
    RealtimeEmitterImpl,
    ActivityRecorderImpl,
    NotificationRecorderImpl,
  ],
  exports: [
    PrismaBoardRepository,
    PrismaListRepository,
    PrismaCardRepository,
    PrismaMembershipRepository,
    PrismaInvitationRepository,
    PrismaActivityRepository,
    PrismaLabelRepository,
    PrismaCardLabelRepository,
    PrismaChecklistItemRepository,
    PrismaCardAssigneeRepository,
    PrismaCommentRepository,
    PrismaNotificationRepository,
    RealtimeEmitterImpl,
    ActivityRecorderImpl,
    NotificationRecorderImpl,
  ],
})
export class BoardModule {}
