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
import { NotFoundError } from "@taskboard/shared";
import { Activity } from "../model";
import { ActivityRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

export interface ListActivityIn {
  boardId: string;
  requesterId: string;
  page?: number;
  perPage?: number;
}

export interface ListActivityOut {
  activities: Activity[];
  page: number;
  perPage: number;
  total: number;
}

export class ListActivity implements UseCase<ListActivityIn, ListActivityOut> {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ListActivityIn): Promise<ListActivityOut> {
    const page = input.page ?? 1;
    const perPage = Math.min(input.perPage ?? DEFAULT_PER_PAGE, MAX_PER_PAGE);

    Validator.validate([
      {
        code: "listActivity.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listActivity.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listActivity.page",
        value: page,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(1)],
      },
      {
        code: "listActivity.perPage",
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
      throw new NotFoundError("board.not.found");
    }

    const page_ = await this.activityRepository.findAllByBoardId({
      boardId: input.boardId,
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
