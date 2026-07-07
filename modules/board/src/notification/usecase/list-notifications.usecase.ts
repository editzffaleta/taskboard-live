import {
  IntegerRule,
  MaxValueRule,
  MinValueRule,
  PageResult,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Notification } from "../model";
import { NotificationRepository } from "../provider";

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

export interface ListNotificationsIn {
  userId: string;
  page?: number;
  perPage?: number;
}

export interface ListNotificationsOut {
  notifications: Notification[];
  page: number;
  perPage: number;
  total: number;
}

export class ListNotifications
  implements UseCase<ListNotificationsIn, ListNotificationsOut>
{
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(input: ListNotificationsIn): Promise<ListNotificationsOut> {
    const page = input.page ?? 1;
    const perPage = Math.min(input.perPage ?? DEFAULT_PER_PAGE, MAX_PER_PAGE);

    Validator.validate([
      {
        code: "listNotifications.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listNotifications.page",
        value: page,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(1)],
      },
      {
        code: "listNotifications.perPage",
        value: perPage,
        rules: [
          new RequiredRule(),
          new IntegerRule(),
          new MinValueRule(1),
          new MaxValueRule(MAX_PER_PAGE),
        ],
      },
    ]);

    const result: PageResult<Notification> =
      await this.notificationRepository.findAllByUserId({
        userId: input.userId,
        page,
        perPage,
      });

    return {
      notifications: result.items,
      page: result.page,
      perPage: result.perPage,
      total: result.total,
    };
  }
}
