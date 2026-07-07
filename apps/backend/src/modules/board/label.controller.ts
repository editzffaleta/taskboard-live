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
  CreateLabel,
  DeleteLabel,
  ListLabels,
  UpdateLabel,
  type Label,
  type LabelColor,
} from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaLabelRepository } from './label.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';

type LabelResponse = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  createdAt: Date;
};

@Controller('boards/:boardId/labels')
export class LabelController {
  constructor(
    private readonly labelRepository: PrismaLabelRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
  ) {}

  @Get()
  async list(
    @Param('boardId') boardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<LabelResponse[]> {
    const useCase = new ListLabels(
      this.labelRepository,
      this.membershipRepository,
    );

    const { labels } = await useCase.execute({ boardId, requesterId });

    return labels.map((label) => this.toResponse(label));
  }

  @Post()
  @HttpCode(201)
  async create(
    @Param('boardId') boardId: string,
    @Body() body: { name: string; color: LabelColor },
    @CurrentUser('id') requesterId: string,
  ): Promise<LabelResponse> {
    const useCase = new CreateLabel(
      this.labelRepository,
      this.membershipRepository,
    );

    const { label } = await useCase.execute({
      boardId,
      requesterId,
      name: body.name,
      color: body.color,
    });

    this.realtimeEmitter.emitToBoard(boardId, 'label.created', {
      label: this.toResponse(label),
    });

    return this.toResponse(label);
  }

  @Patch(':id')
  async update(
    @Param('boardId') boardId: string,
    @Param('id') labelId: string,
    @Body() body: { name?: string; color?: LabelColor },
    @CurrentUser('id') requesterId: string,
  ): Promise<LabelResponse> {
    const useCase = new UpdateLabel(
      this.labelRepository,
      this.membershipRepository,
    );

    const { label } = await useCase.execute({
      boardId,
      labelId,
      requesterId,
      name: body.name,
      color: body.color,
    });

    this.realtimeEmitter.emitToBoard(boardId, 'label.updated', {
      label: this.toResponse(label),
    });

    return this.toResponse(label);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('boardId') boardId: string,
    @Param('id') labelId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new DeleteLabel(
      this.labelRepository,
      this.membershipRepository,
    );

    const { labelId: deletedLabelId } = await useCase.execute({
      boardId,
      labelId,
      requesterId,
    });

    this.realtimeEmitter.emitToBoard(boardId, 'label.deleted', {
      labelId: deletedLabelId,
    });
  }

  private toResponse(label: Label): LabelResponse {
    return {
      id: label.id,
      boardId: label.boardId,
      name: label.name,
      color: label.color,
      createdAt: label.createdAt,
    };
  }
}
