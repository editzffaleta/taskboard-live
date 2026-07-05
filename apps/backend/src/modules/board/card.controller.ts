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
  CreateCard,
  DeleteCard,
  EditCard,
  MoveCard,
  type Card,
} from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaCardRepository } from './card.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { ActivityRecorderImpl } from './activity-recorder.provider';

type CardResponse = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: Date;
};

@Controller('boards/:boardId/cards')
export class CardController {
  constructor(
    private readonly cardRepository: PrismaCardRepository,
    private readonly listRepository: PrismaListRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
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

    this.realtimeEmitter.emitToBoard(boardId, 'card.created', {
      card: this.toResponse(card),
    });

    await this.activityRecorder.record(boardId, requesterId, 'card.created', {
      cardId: card.id,
      listId: card.listId,
      title: card.title,
    });

    return this.toResponse(card);
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

    this.realtimeEmitter.emitToBoard(boardId, 'card.updated', {
      card: this.toResponse(card),
    });

    await this.activityRecorder.record(boardId, requesterId, 'card.updated', {
      cardId: card.id,
      listId: card.listId,
      title: card.title,
    });

    return this.toResponse(card);
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

  private toResponse(card: Card): CardResponse {
    return {
      id: card.id,
      listId: card.listId,
      title: card.title,
      description: card.description,
      position: card.position,
      createdAt: card.createdAt,
    };
  }
}
