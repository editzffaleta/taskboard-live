import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ArchiveCard,
  CreateCard,
  DeleteCard,
  EditCard,
  MoveCard,
  RestoreCard,
  SetCardDueDate,
  type Card,
} from '@taskboard/board';
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
import { ActivityRecorderImpl } from './activity-recorder.provider';
import { buildCardResponse, type CardResponse } from './card-response.util';

@Controller('boards/:boardId/cards')
export class CardController {
  constructor(
    private readonly cardRepository: PrismaCardRepository,
    private readonly listRepository: PrismaListRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly cardLabelRepository: PrismaCardLabelRepository,
    private readonly labelRepository: PrismaLabelRepository,
    private readonly checklistItemRepository: PrismaChecklistItemRepository,
    private readonly cardAssigneeRepository: PrismaCardAssigneeRepository,
    private readonly memberDirectory: MemberDirectoryAdapter,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
    private readonly activityRecorder: ActivityRecorderImpl,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Param('boardId') boardId: string,
    @Body() body: { listId: string; title: string },
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new CreateCard(
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      requesterId,
      listId: body.listId,
      title: body.title,
    });

    const response = await this.toResponse(card);

    this.realtimeEmitter.emitToBoard(boardId, 'card.created', {
      card: response,
    });

    await this.activityRecorder.record(boardId, requesterId, 'card.created', {
      cardId: card.id,
      listId: card.listId,
      title: card.title,
    });

    return response;
  }

  @Patch(':id')
  async edit(
    @Param('boardId') boardId: string,
    @Param('id') cardId: string,
    @Body() body: { title: string; description?: string | null },
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new EditCard(
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
      title: body.title,
      description: body.description,
    });

    const response = await this.toResponse(card);

    this.realtimeEmitter.emitToBoard(boardId, 'card.updated', {
      card: response,
    });

    await this.activityRecorder.record(boardId, requesterId, 'card.updated', {
      cardId: card.id,
      listId: card.listId,
      title: card.title,
    });

    return response;
  }

  @Patch(':id/due')
  async setDueDate(
    @Param('boardId') boardId: string,
    @Param('id') cardId: string,
    @Body() body: { dueDate: string | null },
    @CurrentUser('id') requesterId: string,
  ): Promise<CardResponse> {
    const useCase = new SetCardDueDate(
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
      dueDate: body.dueDate === null ? null : new Date(body.dueDate),
    });

    const response = await this.toResponse(card);

    this.realtimeEmitter.emitToBoard(boardId, 'card.updated', {
      card: response,
    });

    return response;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('boardId') boardId: string,
    @Param('id') cardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new DeleteCard(
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { listId, cardId: deletedCardId } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
    });

    this.realtimeEmitter.emitToBoard(boardId, 'card.deleted', {
      cardId: deletedCardId,
      listId,
    });

    await this.activityRecorder.record(boardId, requesterId, 'card.deleted', {
      cardId: deletedCardId,
      listId,
    });
  }

  @Post(':id/archive')
  @HttpCode(204)
  async archive(
    @Param('boardId') boardId: string,
    @Param('id') cardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new ArchiveCard(
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { listId, cardId: archivedCardId } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
    });

    this.realtimeEmitter.emitToBoard(boardId, 'card.deleted', {
      cardId: archivedCardId,
      listId,
    });
  }

  @Post(':id/restore')
  @HttpCode(204)
  async restore(
    @Param('boardId') boardId: string,
    @Param('id') cardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new RestoreCard(
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
    });

    const response = await this.toResponse(card);

    this.realtimeEmitter.emitToBoard(boardId, 'card.created', {
      card: response,
    });
  }

  @Patch(':id/move')
  async move(
    @Param('boardId') boardId: string,
    @Param('id') cardId: string,
    @Body() body: { toListId: string; position: number },
    @CurrentUser('id') requesterId: string,
  ): Promise<{
    cardId: string;
    fromListId: string;
    toListId: string;
    position: number;
  }> {
    const useCase = new MoveCard(
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { card, fromListId, toListId, position } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
      toListId: body.toListId,
      position: body.position,
    });

    const payload = {
      cardId: card.id,
      fromListId,
      toListId,
      position,
    };

    this.realtimeEmitter.emitToBoard(boardId, 'card.moved', payload);

    await this.activityRecorder.record(
      boardId,
      requesterId,
      'card.moved',
      payload,
    );

    return payload;
  }

  private toResponse(card: Card): Promise<CardResponse> {
    return buildCardResponse(
      card,
      this.cardLabelRepository,
      this.labelRepository,
      this.checklistItemRepository,
      this.cardAssigneeRepository,
      this.memberDirectory,
    );
  }
}
