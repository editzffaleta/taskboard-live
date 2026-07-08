import {
  DomainError,
  IntegerRule,
  MaxValueRule,
  MinValueRule,
  NotFoundError,
  PageResult,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Activity } from "../model";
import { ActivityRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";
import { CardRepository } from "../../card/provider";
import { ListRepository } from "../../list/provider";

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

export interface ListCardActivityIn {
  boardId: string;
  cardId: string;
  requesterId: string;
  page?: number;
  perPage?: number;
}

export interface ListCardActivityOut {
  activities: Activity[];
  page: number;
  perPage: number;
  total: number;
}

export class ListCardActivity
  implements UseCase<ListCardActivityIn, ListCardActivityOut>
{
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
  ) {}

  async execute(input: ListCardActivityIn): Promise<ListCardActivityOut> {
    const page = input.page ?? 1;
    const perPage = Math.min(input.perPage ?? DEFAULT_PER_PAGE, MAX_PER_PAGE);

    Validator.validate([
      {
        code: "listCardActivity.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listCardActivity.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listCardActivity.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listCardActivity.page",
        value: page,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(1)],
      },
      {
        code: "listCardActivity.perPage",
        value: perPage,
        rules: [
          new RequiredRule(),
          new IntegerRule(),
          new MinValueRule(1),
          new MaxValueRule(MAX_PER_PAGE),
        ],
      },
    ]);

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const card = await this.cardRepository.findById(input.cardId);

    if (!card) {
      throw new NotFoundError("card.not.found");
    }

    const list = await this.listRepository.findById(card.listId);

    if (!list || list.boardId !== input.boardId) {
      throw new NotFoundError("card.not.found");
    }

    const page_: PageResult<Activity> =
      await this.activityRepository.findAllByBoardId({
        boardId: input.boardId,
        cardId: input.cardId,
        page,
        perPage,
      });

    return {
      activities: page_.items,
      page: page_.page,
      perPage: page_.perPage,
      total: page_.total,
    };
  }
}
