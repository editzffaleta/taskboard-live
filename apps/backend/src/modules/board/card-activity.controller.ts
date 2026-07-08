import { Controller, Get, Param, Query } from '@nestjs/common';
import { Activity, ListCardActivity } from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaActivityRepository } from './activity.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { PrismaCardRepository } from './card.prisma';
import { PrismaListRepository } from './list.prisma';

type ActivityResponse = {
  id: string;
  boardId: string;
  actorId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
};

type ActivityPageResponse = {
  items: ActivityResponse[];
  page: number;
  perPage: number;
  total: number;
};

@Controller('boards/:boardId/cards/:cardId/activity')
export class CardActivityController {
  constructor(
    private readonly activityRepository: PrismaActivityRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly cardRepository: PrismaCardRepository,
    private readonly listRepository: PrismaListRepository,
  ) {}

  @Get()
  async list(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser('id') requesterId: string,
  ): Promise<ActivityPageResponse> {
    const useCase = new ListCardActivity(
      this.activityRepository,
      this.membershipRepository,
      this.cardRepository,
      this.listRepository,
    );

    const result = await useCase.execute({
      boardId,
      cardId,
      requesterId,
      page: page ? Number(page) : undefined,
      perPage: limit ? Number(limit) : undefined,
    });

    return {
      items: result.activities.map((activity) => this.toResponse(activity)),
      page: result.page,
      perPage: result.perPage,
      total: result.total,
    };
  }

  private toResponse(activity: Activity): ActivityResponse {
    return {
      id: activity.id,
      boardId: activity.boardId,
      actorId: activity.actorId,
      type: activity.type,
      data: activity.data,
      createdAt: activity.createdAt,
    };
  }
}
