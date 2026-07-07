import { RequiredRule, UseCase, UuidRule, Validator } from "@taskboard/shared";
import { NotificationRepository } from "../provider";

export interface MarkAllNotificationsReadIn {
  userId: string;
}

export type MarkAllNotificationsReadOut = void;

export class MarkAllNotificationsRead
  implements
    UseCase<MarkAllNotificationsReadIn, MarkAllNotificationsReadOut>
{
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(input: MarkAllNotificationsReadIn): Promise<void> {
    Validator.validate([
      {
        code: "markAllNotificationsRead.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    await this.notificationRepository.markAllReadByUserId(
      input.userId,
      new Date(),
    );
  }
}
