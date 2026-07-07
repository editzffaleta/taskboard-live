import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { List } from "../model";
import { ListRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface RestoreListIn {
  listId: string;
  requesterId: string;
}

export interface RestoreListOut {
  list: List;
}

export class RestoreList implements UseCase<RestoreListIn, RestoreListOut> {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: RestoreListIn): Promise<RestoreListOut> {
    Validator.validate([
      {
        code: "restoreList.listId",
        value: input.listId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "restoreList.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
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

    if (list.archivedAt === null) {
      throw new DomainError("list.not.archived", 400);
    }

    await this.listRepository.restore(list.id);

    const restored = await this.listRepository.findById(list.id);

    return { list: restored ?? list.clone({ archivedAt: null }) };
  }
}
