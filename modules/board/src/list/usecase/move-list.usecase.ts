import {
  DomainError,
  IntegerRule,
  MinValueRule,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { List } from "../model";
import { ListRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface MoveListIn {
  listId: string;
  requesterId: string;
  position: number;
}

export interface MoveListOut {
  lists: List[];
}

export class MoveList implements UseCase<MoveListIn, MoveListOut> {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: MoveListIn): Promise<MoveListOut> {
    Validator.validate([
      {
        code: "moveList.listId",
        value: input.listId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "moveList.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "moveList.position",
        value: input.position,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(0)],
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

    const boardLists = await this.listRepository.findAllByBoardId(
      list.boardId,
    );

    const ordered = [...boardLists].sort((a, b) => a.position - b.position);
    const withoutMoved = ordered.filter((item) => item.id !== list.id);

    const clampedPosition = Math.min(
      Math.max(input.position, 0),
      withoutMoved.length,
    );

    const reordered = [
      ...withoutMoved.slice(0, clampedPosition),
      list,
      ...withoutMoved.slice(clampedPosition),
    ];

    const renormalized = reordered.map((item, index) =>
      item.position === index ? item : item.clone({ position: index }),
    );

    renormalized.forEach((item) => item.validate());

    await this.listRepository.updatePositions(
      renormalized.map((item) => ({ id: item.id, position: item.position })),
    );

    return { lists: renormalized };
  }
}
