import { RequiredRule, UseCase, UuidRule, Validator } from "@taskboard/shared";
import { NotificationRepository } from "../provider";

export interface CountUnreadNotificationsIn {
  userId: string;
}

export interface CountUnreadNotificationsOut {
  count: number;
}

export class CountUnreadNotifications
  implements
    UseCase<CountUnreadNotificationsIn, CountUnreadNotificationsOut>
{
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    input: CountUnreadNotificationsIn,
  ): Promise<CountUnreadNotificationsOut> {
    Validator.validate([
      {
        code: "countUnreadNotifications.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const count = await this.notificationRepository.countUnreadByUserId(
      input.userId,
    );

    return { count };
  }
}
