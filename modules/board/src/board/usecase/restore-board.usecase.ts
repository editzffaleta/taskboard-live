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

export interface RestoreBoardIn {
  boardId: string;
  requesterId: string;
}

export class RestoreBoard implements UseCase<RestoreBoardIn, void> {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: RestoreBoardIn): Promise<void> {
    Validator.validate([
      {
        code: "restoreBoard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "restoreBoard.requesterId",
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

    if (board.archivedAt === null) {
      throw new DomainError("board.not.archived", 400);
    }

    await this.boardRepository.restore(board.id);
  }
}
