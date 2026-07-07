import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { CardAssigneeRepository } from "../provider";
import { Card } from "../../card/model";
import { CardRepository } from "../../card/provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface UnassignUserIn {
  boardId: string;
  cardId: string;
  userId: string;
  requesterId: string;
}

export interface UnassignUserOut {
  card: Card;
  assigneeIds: string[];
}

export class UnassignUser implements UseCase<UnassignUserIn, UnassignUserOut> {
  constructor(
    private readonly cardAssigneeRepository: CardAssigneeRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: UnassignUserIn): Promise<UnassignUserOut> {
    Validator.validate([
      {
        code: "unassignUser.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "unassignUser.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "unassignUser.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "unassignUser.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const card = await this.cardRepository.findById(input.cardId);

    if (!card) {
      throw new NotFoundError("card.not.found");
    }

    const list = await this.listRepository.findById(card.listId);

    if (!list || list.boardId !== input.boardId) {
      throw new NotFoundError("card.not.found");
    }

    const requesterMembership =
      await this.membershipRepository.findByBoardAndUser(
        list.boardId,
        input.requesterId,
      );

    if (!requesterMembership) {
      throw new DomainError("board.member.required", 403);
    }

    await this.cardAssigneeRepository.unassign(card.id, input.userId);

    const assigneeIds = await this.cardAssigneeRepository.findAllByCardId(
      card.id,
    );

    return { card, assigneeIds };
  }
}
