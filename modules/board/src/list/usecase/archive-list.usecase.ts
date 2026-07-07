import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { ListRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface ArchiveListIn {
  listId: string;
  requesterId: string;
}

export interface ArchiveListOut {
  boardId: string;
  listId: string;
}

export class ArchiveList implements UseCase<ArchiveListIn, ArchiveListOut> {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ArchiveListIn): Promise<ArchiveListOut> {
    Validator.validate([
      {
        code: "archiveList.listId",
        value: input.listId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "archiveList.requesterId",
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

    if (list.archivedAt !== null) {
      throw new DomainError("list.already.archived", 400);
    }

    await this.listRepository.archive(list.id, new Date());

    return { boardId: list.boardId, listId: list.id };
  }
}
