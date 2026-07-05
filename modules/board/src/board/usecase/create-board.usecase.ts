import {
  MaxLengthRule,
  MinLengthRule,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Board } from "../model";
import { BoardRepository } from "../provider";

export interface CreateBoardIn {
  name: string;
  ownerId: string;
}

export interface CreateBoardOut {
  board: Board;
}

export class CreateBoard implements UseCase<CreateBoardIn, CreateBoardOut> {
  constructor(private readonly boardRepository: BoardRepository) {}

  async execute(input: CreateBoardIn): Promise<CreateBoardOut> {
    Validator.validate([
      {
        code: "createBoard.name",
        value: input.name,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(120)],
      },
      {
        code: "createBoard.ownerId",
        value: input.ownerId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const { board } = await this.boardRepository.createWithOwnerMembership({
      name: input.name,
      ownerId: input.ownerId,
    });

    return { board };
  }
}
