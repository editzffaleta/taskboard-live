import { RequiredRule, UseCase, UuidRule, Validator } from "@taskboard/shared";
import { Board } from "../model";
import { BoardRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface ListMyBoardsIn {
  userId: string;
}

export interface ListMyBoardsOut {
  boards: Board[];
}

export class ListMyBoards implements UseCase<ListMyBoardsIn, ListMyBoardsOut> {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ListMyBoardsIn): Promise<ListMyBoardsOut> {
    Validator.validate([
      {
        code: "listMyBoards.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const memberships = await this.membershipRepository.listBoardsByUser(
      input.userId,
    );

    if (memberships.length === 0) {
      return { boards: [] };
    }

    const boards = await this.boardRepository.findManyByIds(
      memberships.map((membership) => membership.boardId),
    );

    return { boards };
  }
}
