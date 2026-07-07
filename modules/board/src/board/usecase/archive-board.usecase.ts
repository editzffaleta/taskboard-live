import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { BoardRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface ArchiveBoardIn {
  boardId: string;
  requesterId: string;
}

export class ArchiveBoard implements UseCase<ArchiveBoardIn, void> {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ArchiveBoardIn): Promise<void> {
    Validator.validate([
      {
        code: "archiveBoard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "archiveBoard.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const board = await this.boardRepository.findById(input.boardId);

    if (!board) {
      throw new NotFoundError("board.not.found");
    }

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership || membership.role !== "owner") {
      throw new DomainError("board.owner.required", 403);
    }

    if (board.archivedAt !== null) {
      throw new DomainError("board.already.archived", 400);
    }

    await this.boardRepository.archive(board.id, new Date());
  }
}
