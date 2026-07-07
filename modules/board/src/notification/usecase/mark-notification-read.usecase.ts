import {
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Notification } from "../model";
import { NotificationRepository } from "../provider";

export interface MarkNotificationReadIn {
  notificationId: string;
  userId: string;
}

export interface MarkNotificationReadOut {
  notification: Notification;
}

export class MarkNotificationRead
  implements UseCase<MarkNotificationReadIn, MarkNotificationReadOut>
{
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    input: MarkNotificationReadIn,
  ): Promise<MarkNotificationReadOut> {
    Validator.validate([
      {
        code: "markNotificationRead.notificationId",
        value: input.notificationId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "markNotificationRead.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const notification = await this.notificationRepository.findById(
      input.notificationId,
    );

    if (!notification || notification.userId !== input.userId) {
      throw new NotFoundError("notification.not.found");
    }

    if (notification.readAt) {
      return { notification };
    }

    const updated = await this.notificationRepository.markRead(
      notification.id,
      new Date(),
    );

    return { notification: updated };
  }
}
