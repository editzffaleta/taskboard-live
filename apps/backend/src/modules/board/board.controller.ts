import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ArchiveBoard,
  CreateBoard,
  DeleteBoard,
  GetBoardDetail,
  ListMyBoards,
  RenameBoard,
  RestoreBoard,
  type Board,
  type BoardDetail,
} from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaBoardRepository } from './board.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaCardRepository } from './card.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import {
  PrismaCardLabelRepository,
  PrismaLabelRepository,
} from './label.prisma';
import { PrismaChecklistItemRepository } from './checklist-item.prisma';
import { PrismaCardAssigneeRepository } from './card-assignee.prisma';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';

type BoardResponse = {
  id: string;
  name: string;
  ownerId: string;
  color: string | null;
  createdAt: Date;
};

type BoardDetailResponse = BoardDetail;

@Controller('boards')
export class BoardController {
  constructor(
    private readonly boardRepository: PrismaBoardRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly listRepository: PrismaListRepository,
    private readonly cardRepository: PrismaCardRepository,
    private readonly cardLabelRepository: PrismaCardLabelRepository,
    private readonly labelRepository: PrismaLabelRepository,
    private readonly checklistItemRepository: PrismaChecklistItemRepository,
    private readonly cardAssigneeRepository: PrismaCardAssigneeRepository,
    private readonly memberDirectory: MemberDirectoryAdapter,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body() body: { name: string },
    @CurrentUser('id') ownerId: string,
  ): Promise<BoardResponse> {
    const useCase = new CreateBoard(this.boardRepository);

    const { board } = await useCase.execute({
      name: body.name,
      ownerId,
    });

    return this.toResponse(board);
  }

  @Get()
  async listMine(@CurrentUser('id') userId: string): Promise<BoardResponse[]> {
    const useCase = new ListMyBoards(
      this.boardRepository,
      this.membershipRepository,
    );

    const { boards } = await useCase.execute({ userId });

    return boards.map((board) => this.toResponse(board));
  }

  @Get(':id')
  async getOne(
    @Param('id') boardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<BoardDetailResponse> {
    const useCase = new GetBoardDetail(
      this.boardRepository,
      this.membershipRepository,
      this.listRepository,
      this.cardRepository,
      this.cardLabelRepository,
      this.labelRepository,
      this.checklistItemRepository,
      this.cardAssigneeRepository,
      this.memberDirectory,
    );

    const { board } = await useCase.execute({ boardId, requesterId });

    return board;
  }

  @Patch(':id')
  async rename(
    @Param('id') boardId: string,
    @Body() body: { name?: string; color?: string },
    @CurrentUser('id') requesterId: string,
  ): Promise<BoardResponse> {
    const useCase = new RenameBoard(
      this.boardRepository,
      this.membershipRepository,
    );

    const { board } = await useCase.execute({
      boardId,
      requesterId,
      name: body.name,
      color: body.color,
    });

    const response = this.toResponse(board);

    this.realtimeEmitter.emitToBoard(boardId, 'board.updated', {
      board: response,
    });

    return response;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id') boardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new DeleteBoard(
      this.boardRepository,
      this.membershipRepository,
    );

    await useCase.execute({ boardId, requesterId });
  }

  @Post(':id/archive')
  @HttpCode(204)
  async archive(
    @Param('id') boardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new ArchiveBoard(
      this.boardRepository,
      this.membershipRepository,
    );

    await useCase.execute({ boardId, requesterId });
  }

  @Post(':id/restore')
  @HttpCode(204)
  async restore(
    @Param('id') boardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new RestoreBoard(
      this.boardRepository,
      this.membershipRepository,
    );

    await useCase.execute({ boardId, requesterId });
  }

  private toResponse(board: Board): BoardResponse {
    return {
      id: board.id,
      name: board.name,
      ownerId: board.ownerId,
      color: board.color,
      createdAt: board.createdAt,
    };
  }
}
