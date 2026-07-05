import { Controller, Get, Param, Query } from '@nestjs/common';
import { Activity, ListActivity } from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaActivityRepository } from './activity.prisma';
import { PrismaMembershipRepository } from './membership.prisma';

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

@Controller('boards/:boardId/activity')
export class ActivityController {
  constructor(
    private readonly activityRepository: PrismaActivityRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
  ) {}

  @Get()
  async list(
    @Param('boardId') boardId: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser('id') requesterId: string,
  ): Promise<ActivityPageResponse> {
    const useCase = new ListActivity(
      this.activityRepository,
      this.membershipRepository,
    );

    const result = await useCase.execute({
      boardId,
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
