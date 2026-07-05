import {
  DomainError,
  MaxLengthRule,
  MinLengthRule,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { List } from "../model";
import { ListRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface CreateListIn {
  boardId: string;
  requesterId: string;
  title: string;
}

export interface CreateListOut {
  list: List;
}

export class CreateList implements UseCase<CreateListIn, CreateListOut> {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: CreateListIn): Promise<CreateListOut> {
    Validator.validate([
      {
        code: "createList.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "createList.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "createList.title",
        value: input.title,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(120)],
      },
    ]);

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const existingLists = await this.listRepository.findAllByBoardId(
      input.boardId,
    );

    const position = existingLists.length;

    const list = new List({
      boardId: input.boardId,
      title: input.title,
      position,
    });
    list.validate();

    const created = await this.listRepository.create(list);

    return { list: created };
  }
}
