import {
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CountUnreadNotifications,
  ListNotifications,
  MarkAllNotificationsRead,
  MarkNotificationRead,
  Notification,
} from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaNotificationRepository } from './notification.prisma';

type NotificationResponse = {
  id: string;
  userId: string;
  type: string;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
};

type NotificationPageResponse = {
  items: NotificationResponse[];
  page: number;
  perPage: number;
  total: number;
};

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationRepository: PrismaNotificationRepository,
  ) {}

  @Get()
  async list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser('id') requesterId: string,
  ): Promise<NotificationPageResponse> {
    const useCase = new ListNotifications(this.notificationRepository);

    const result = await useCase.execute({
      userId: requesterId,
      page: page ? Number(page) : undefined,
      perPage: limit ? Number(limit) : undefined,
    });

    return {
      items: result.notifications.map((notification) =>
        this.toResponse(notification),
      ),
      page: result.page,
      perPage: result.perPage,
      total: result.total,
    };
  }

  @Get('unread-count')
  async unreadCount(
    @CurrentUser('id') requesterId: string,
  ): Promise<{ count: number }> {
    const useCase = new CountUnreadNotifications(this.notificationRepository);

    return useCase.execute({ userId: requesterId });
  }

  @Patch(':id/read')
  async markRead(
    @Param('id') id: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<NotificationResponse> {
    const useCase = new MarkNotificationRead(this.notificationRepository);

    const { notification } = await useCase.execute({
      notificationId: id,
      userId: requesterId,
    });

    return this.toResponse(notification);
  }

  @Post('read-all')
  @HttpCode(204)
  async markAllRead(@CurrentUser('id') requesterId: string): Promise<void> {
    const useCase = new MarkAllNotificationsRead(this.notificationRepository);

    await useCase.execute({ userId: requesterId });
  }

  private toResponse(notification: Notification): NotificationResponse {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      data: notification.data,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
