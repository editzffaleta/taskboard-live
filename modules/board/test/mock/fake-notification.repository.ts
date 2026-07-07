import { PageResult } from "@taskboard/shared";
import { Notification } from "../../src/notification/model";
import {
  FindAllByUserIdParams,
  NotificationRepository,
} from "../../src/notification/provider";

export class FakeNotificationRepository implements NotificationRepository {
  readonly notifications: Notification[] = [];

  async create(notification: Notification): Promise<Notification> {
    this.notifications.push(notification);
    return notification;
  }

  async findAllByUserId(
    params: FindAllByUserIdParams,
  ): Promise<PageResult<Notification>> {
    const all = this.notifications
      .filter((notification) => notification.userId === params.userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (params.page - 1) * params.perPage;
    const items = all.slice(start, start + params.perPage);

    return {
      items,
      page: params.page,
      perPage: params.perPage,
      total: all.length,
    };
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return this.notifications.filter(
      (notification) => notification.userId === userId && !notification.readAt,
    ).length;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.find((notification) => notification.id === id) ?? null;
  }

  async markRead(id: string, readAt: Date): Promise<Notification> {
    const index = this.notifications.findIndex(
      (notification) => notification.id === id,
    );
    const updated = this.notifications[index].markRead(readAt);
    this.notifications[index] = updated;
    return updated;
  }

  async markAllReadByUserId(userId: string, readAt: Date): Promise<void> {
    for (let index = 0; index < this.notifications.length; index += 1) {
      const notification = this.notifications[index];
      if (notification.userId === userId && !notification.readAt) {
        this.notifications[index] = notification.markRead(readAt);
      }
    }
  }
}
