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
  CreateBoard,
  DeleteBoard,
  GetBoardDetail,
  ListMyBoards,
  RenameBoard,
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

type BoardResponse = {
  id: string;
  name: string;
  ownerId: string;
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
    );

    const { board } = await useCase.execute({ boardId, requesterId });

    return board;
  }

  @Patch(':id')
  async rename(
    @Param('id') boardId: string,
    @Body() body: { name: string },
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
    });

    return this.toResponse(board);
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

  private toResponse(board: Board): BoardResponse {
    return {
      id: board.id,
      name: board.name,
      ownerId: board.ownerId,
      createdAt: board.createdAt,
    };
  }
}
