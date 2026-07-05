import {
  DomainError,
  MaxLengthRule,
  MinLengthRule,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { List } from "../model";
import { ListRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface RenameListIn {
  listId: string;
  requesterId: string;
  title: string;
}

export interface RenameListOut {
  list: List;
}

export class RenameList implements UseCase<RenameListIn, RenameListOut> {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: RenameListIn): Promise<RenameListOut> {
    Validator.validate([
      {
        code: "renameList.listId",
        value: input.listId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "renameList.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "renameList.title",
        value: input.title,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(120)],
      },
    ]);

    const list = await this.listRepository.findById(input.listId);

    if (!list) {
      throw new NotFoundError("list.not.found");
    }

    const membership = await this.membershipRepository.findByBoardAndUser(
      list.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const renamed = list.clone({ title: input.title });
    renamed.validate();

    const updated = await this.listRepository.update(renamed);

    return { list: updated };
  }
}
