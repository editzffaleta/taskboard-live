import {
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Board } from "../model";
import { BoardRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface GetBoardIn {
  boardId: string;
  requesterId: string;
}

export interface GetBoardOut {
  board: Board;
}

export class GetBoard implements UseCase<GetBoardIn, GetBoardOut> {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: GetBoardIn): Promise<GetBoardOut> {
    Validator.validate([
      {
        code: "getBoard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "getBoard.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new NotFoundError("board.not.found");
    }

    const board = await this.boardRepository.findById(input.boardId);

    if (!board) {
      throw new NotFoundError("board.not.found");
    }

    return { board };
  }
}
