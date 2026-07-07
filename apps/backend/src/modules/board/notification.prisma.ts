import { Injectable } from '@nestjs/common';
import { PageResult } from '@taskboard/shared';
import {
  FindAllByUserIdParams,
  Notification,
  NotificationRepository,
} from '@taskboard/board';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';

type PersistedNotification = {
  id: string;
  userId: string;
  type: string;
  data: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(notification: Notification): Promise<Notification> {
    const created = await this.prisma.notification.create({
      data: this.toPersistence(notification),
    });

    return this.toDomain(created);
  }

  async findAllByUserId(
    params: FindAllByUserIdParams,
  ): Promise<PageResult<Notification>> {
    const { userId, page, perPage } = params;
    const skip = (page - 1) * perPage;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: items.map((item) => this.toDomain(item)),
      page,
      perPage,
      total,
    };
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    const found = await this.prisma.notification.findUnique({
      where: { id },
    });

    return found ? this.toDomain(found) : null;
  }

  async markRead(id: string, readAt: Date): Promise<Notification> {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt },
    });

    return this.toDomain(updated);
  }

  async markAllReadByUserId(userId: string, readAt: Date): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt },
    });
  }

  private toPersistence(notification: Notification) {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      data: notification.data as Prisma.InputJsonValue,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }

  private toDomain(raw: PersistedNotification): Notification {
    return new Notification({
      id: raw.id,
      createdAt: raw.createdAt,
      userId: raw.userId,
      type: raw.type,
      data: (raw.data ?? {}) as Record<string, unknown>,
      readAt: raw.readAt,
    });
  }
}
