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
import { Board } from "../model";
import { BoardRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface RenameBoardIn {
  boardId: string;
  requesterId: string;
  name: string;
}

export interface RenameBoardOut {
  board: Board;
}

export class RenameBoard implements UseCase<RenameBoardIn, RenameBoardOut> {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: RenameBoardIn): Promise<RenameBoardOut> {
    Validator.validate([
      {
        code: "renameBoard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "renameBoard.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "renameBoard.name",
        value: input.name,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(120)],
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

    const renamed = board.clone({ name: input.name });
    renamed.validate();

    const updated = await this.boardRepository.update(renamed);

    return { board: updated };
  }
}
