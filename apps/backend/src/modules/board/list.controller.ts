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
  CreateList,
  DeleteList,
  MoveList,
  RenameList,
  type List,
} from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaListRepository } from './list.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { ActivityRecorderImpl } from './activity-recorder.provider';

type ListResponse = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: Date;
};

@Controller()
export class ListController {
  constructor(
    private readonly listRepository: PrismaListRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
    private readonly activityRecorder: ActivityRecorderImpl,
  ) {}

  @Post('boards/:boardId/lists')
  @HttpCode(201)
  async create(
    @Param('boardId') boardId: string,
    @Body() body: { title: string },
    @CurrentUser('id') requesterId: string,
  ): Promise<ListResponse> {
    const useCase = new CreateList(
      this.listRepository,
      this.membershipRepository,
    );

    const { list } = await useCase.execute({
      boardId,
      requesterId,
      title: body.title,
    });

    this.realtimeEmitter.emitToBoard(
      boardId,
      'list.created',
      this.toResponse(list),
    );

    await this.activityRecorder.record(boardId, requesterId, 'list.created', {
      listId: list.id,
      title: list.title,
    });

    return this.toResponse(list);
  }

  @Patch('lists/:id')
  async rename(
    @Param('id') listId: string,
    @Body() body: { title: string },
    @CurrentUser('id') requesterId: string,
  ): Promise<ListResponse> {
    const useCase = new RenameList(
      this.listRepository,
      this.membershipRepository,
    );

    const { list } = await useCase.execute({
      listId,
      requesterId,
      title: body.title,
    });

    this.realtimeEmitter.emitToBoard(
      list.boardId,
      'list.updated',
      this.toResponse(list),
    );

    await this.activityRecorder.record(
      list.boardId,
      requesterId,
      'list.updated',
      { listId: list.id, title: list.title },
    );

    return this.toResponse(list);
  }

  @Delete('lists/:id')
  @HttpCode(204)
  async remove(
    @Param('id') listId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new DeleteList(
      this.listRepository,
      this.membershipRepository,
    );

    const { boardId, listId: deletedListId } = await useCase.execute({
      listId,
      requesterId,
    });

    this.realtimeEmitter.emitToBoard(boardId, 'list.deleted', {
      listId: deletedListId,
    });

    await this.activityRecorder.record(boardId, requesterId, 'list.deleted', {
      listId: deletedListId,
    });
  }

  @Patch('lists/:id/move')
  async move(
    @Param('id') listId: string,
    @Body() body: { position: number },
    @CurrentUser('id') requesterId: string,
  ): Promise<ListResponse[]> {
    const useCase = new MoveList(
      this.listRepository,
      this.membershipRepository,
    );

    const { lists } = await useCase.execute({
      listId,
      requesterId,
      position: body.position,
    });

    const boardId = lists[0]?.boardId;
    const response = lists.map((list) => this.toResponse(list));

    if (boardId) {
      this.realtimeEmitter.emitToBoard(boardId, 'list.moved', {
        lists: response,
      });

      await this.activityRecorder.record(boardId, requesterId, 'list.moved', {
        listId,
        position: body.position,
      });
    }

    return response;
  }

  private toResponse(list: List): ListResponse {
    return {
      id: list.id,
      boardId: list.boardId,
      title: list.title,
      position: list.position,
      createdAt: list.createdAt,
    };
  }
}
