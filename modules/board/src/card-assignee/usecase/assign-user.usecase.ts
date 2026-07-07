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

export interface AssignUserIn {
  boardId: string;
  cardId: string;
  userId: string;
  requesterId: string;
}

export interface AssignUserOut {
  card: Card;
  assigneeIds: string[];
}

export class AssignUser implements UseCase<AssignUserIn, AssignUserOut> {
  constructor(
    private readonly cardAssigneeRepository: CardAssigneeRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: AssignUserIn): Promise<AssignUserOut> {
    Validator.validate([
      {
        code: "assignUser.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "assignUser.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "assignUser.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "assignUser.requesterId",
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

    const targetMembership = await this.membershipRepository.findByBoardAndUser(
      list.boardId,
      input.userId,
    );

    if (!targetMembership) {
      throw new DomainError("board.member.required", 422);
    }

    await this.cardAssigneeRepository.assign(card.id, input.userId);

    const assigneeIds = await this.cardAssigneeRepository.findAllByCardId(
      card.id,
    );

    return { card, assigneeIds };
  }
}
