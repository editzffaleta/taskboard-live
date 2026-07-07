import { Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { AssignLabel, UnassignLabel } from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaCardRepository } from './card.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import {
  PrismaCardLabelRepository,
  PrismaLabelRepository,
} from './label.prisma';
import { PrismaChecklistItemRepository } from './checklist-item.prisma';
import { PrismaCardAssigneeRepository } from './card-assignee.prisma';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { buildCardResponse, type CardResponse } from './card-response.util';

@Controller('boards/:boardId/cards/:cardId/labels')
export class CardLabelController {
  constructor(
    private readonly cardLabelRepository: PrismaCardLabelRepository,
    private readonly labelRepository: PrismaLabelRepository,
    private readonly cardRepository: PrismaCardRepository,
    private readonly listRepository: PrismaListRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly checklistItemRepository: PrismaChecklistItemRepository,
    private readonly cardAssigneeRepository: PrismaCardAssigneeRepository,
    private readonly memberDirectory: MemberDirectoryAdapter,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
  ) {}

  @Put(':labelId')
  async assign(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('labelId') labelId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new AssignLabel(
      this.cardLabelRepository,
      this.labelRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      labelId,
      requesterId,
    });

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

  @Delete(':labelId')
  @HttpCode(204)
  async unassign(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('labelId') labelId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new UnassignLabel(
      this.cardLabelRepository,
      this.labelRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      labelId,
      requesterId,
    });

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
  }
}
