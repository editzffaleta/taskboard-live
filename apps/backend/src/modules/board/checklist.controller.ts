import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  AddChecklistItem,
  DeleteChecklistItem,
  EditChecklistItem,
  ReorderChecklistItems,
  ToggleChecklistItem,
} from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaCardRepository } from './card.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { PrismaChecklistItemRepository } from './checklist-item.prisma';
import {
  PrismaCardLabelRepository,
  PrismaLabelRepository,
} from './label.prisma';
import { PrismaCardAssigneeRepository } from './card-assignee.prisma';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { buildCardResponse, type CardResponse } from './card-response.util';

@Controller('boards/:boardId/cards/:cardId/checklist')
export class ChecklistController {
  constructor(
    private readonly checklistItemRepository: PrismaChecklistItemRepository,
    private readonly cardRepository: PrismaCardRepository,
    private readonly listRepository: PrismaListRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly cardLabelRepository: PrismaCardLabelRepository,
    private readonly labelRepository: PrismaLabelRepository,
    private readonly cardAssigneeRepository: PrismaCardAssigneeRepository,
    private readonly memberDirectory: MemberDirectoryAdapter,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
  ) {}

  @Post()
  async add(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() body: { text: string },
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new AddChecklistItem(
      this.checklistItemRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
      text: body.text,
    });

    return this.emitAndRespond(boardId, card);
  }

  @Patch(':itemId')
  async toggle(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('itemId') itemId: string,
    @Body() body: { done: boolean },
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new ToggleChecklistItem(
      this.checklistItemRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      itemId,
      requesterId,
      done: body.done,
    });

    return this.emitAndRespond(boardId, card);
  }

  @Patch(':itemId/text')
  async editText(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('itemId') itemId: string,
    @Body() body: { text: string },
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new EditChecklistItem(
      this.checklistItemRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      itemId,
      requesterId,
      text: body.text,
    });

    return this.emitAndRespond(boardId, card);
  }

  @Delete(':itemId')
  async remove(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new DeleteChecklistItem(
      this.checklistItemRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      itemId,
      requesterId,
    });

    return this.emitAndRespond(boardId, card);
  }

  @Put('order')
  async reorder(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() body: { itemIds: string[] },
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new ReorderChecklistItems(
      this.checklistItemRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
      itemIds: body.itemIds,
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
