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

export interface DeleteBoardIn {
  boardId: string;
  requesterId: string;
}

export class DeleteBoard implements UseCase<DeleteBoardIn, void> {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: DeleteBoardIn): Promise<void> {
    Validator.validate([
      {
        code: "deleteBoard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteBoard.requesterId",
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

    await this.boardRepository.delete(input.boardId);
  }
}
