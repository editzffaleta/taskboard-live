import { Controller, Delete, Param, Put } from '@nestjs/common';
import { AssignUser, UnassignUser } from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaCardRepository } from './card.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { PrismaCardAssigneeRepository } from './card-assignee.prisma';
import {
  PrismaCardLabelRepository,
  PrismaLabelRepository,
} from './label.prisma';
import { PrismaChecklistItemRepository } from './checklist-item.prisma';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { NotificationRecorderImpl } from './notification-recorder.provider';
import { buildCardResponse, type CardResponse } from './card-response.util';

@Controller('boards/:boardId/cards/:cardId/assignees')
export class CardAssigneeController {
  constructor(
    private readonly cardAssigneeRepository: PrismaCardAssigneeRepository,
    private readonly cardRepository: PrismaCardRepository,
    private readonly listRepository: PrismaListRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly cardLabelRepository: PrismaCardLabelRepository,
    private readonly labelRepository: PrismaLabelRepository,
    private readonly checklistItemRepository: PrismaChecklistItemRepository,
    private readonly memberDirectory: MemberDirectoryAdapter,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
    private readonly notificationRecorder: NotificationRecorderImpl,
  ) {}

  @Put(':userId')
  async assign(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('userId') userId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new AssignUser(
      this.cardAssigneeRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      userId,
      requesterId,
    });

    const response = await this.emitAndRespond(boardId, card);

    if (userId !== requesterId) {
      const assignedBy = await this.memberDirectory.findById(requesterId);

      await this.notificationRecorder.record(userId, 'card.assigned.you', {
        boardId,
        cardId,
        cardTitle: response.title,
        assignedByName: assignedBy?.name ?? '',
      });
    }

    return response;
  }

  @Delete(':userId')
  async unassign(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('userId') userId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new UnassignUser(
      this.cardAssigneeRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      userId,
      requesterId,
    });

    return this.emitAndRespond(boardId, card);
  }

  private async emitAndRespond(
    boardId: string,
    card: Parameters<typeof buildCardResponse>[0],
  ): Promise<CardResponse> {
    const response = await buildCardResponse(
      card,
      this.cardLabelRepository,
      this.labelRepository,
      this.checklistItemRepository,
      this.cardAssigneeRepository,
      this.memberDirectory,
    );

    this.realtimeEmitter.emitToBoard(boardId, 'card.updated', {
      card: response,
    });

    return response;
  }
}
