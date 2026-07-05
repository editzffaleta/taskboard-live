import { Injectable } from '@nestjs/common';
import { PageResult } from '@taskboard/shared';
import {
  Activity,
  ActivityRepository,
  FindAllByBoardIdParams,
} from '@taskboard/board';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';

type PersistedActivity = {
  id: string;
  boardId: string;
  actorId: string;
  type: string;
  data: Prisma.JsonValue;
  createdAt: Date;
};

@Injectable()
export class PrismaActivityRepository implements ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(activity: Activity): Promise<Activity> {
    const created = await this.prisma.activity.create({
      data: this.toPersistence(activity),
    });

    return this.toDomain(created);
  }

  async findAllByBoardId(
    params: FindAllByBoardIdParams,
  ): Promise<PageResult<Activity>> {
    const { boardId, page, perPage } = params;
    const skip = (page - 1) * perPage;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where: { boardId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.activity.count({ where: { boardId } }),
    ]);

    return {
      items: items.map((item) => this.toDomain(item)),
      page,
      perPage,
      total,
    };
  }

  private toPersistence(activity: Activity) {
    return {
      id: activity.id,
      boardId: activity.boardId,
      actorId: activity.actorId,
      type: activity.type,
      data: activity.data as Prisma.InputJsonValue,
      createdAt: activity.createdAt,
    };
  }

  private toDomain(raw: PersistedActivity): Activity {
    return new Activity({
      id: raw.id,
      createdAt: raw.createdAt,
      boardId: raw.boardId,
      actorId: raw.actorId,
      type: raw.type,
      data: (raw.data ?? {}) as Record<string, unknown>,
    });
  }
}
