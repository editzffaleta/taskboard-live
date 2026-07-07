import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Card } from "../model";
import { CardRepository } from "../provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface RestoreCardIn {
  boardId: string;
  cardId: string;
  requesterId: string;
}

export interface RestoreCardOut {
  boardId: string;
  card: Card;
}

export class RestoreCard implements UseCase<RestoreCardIn, RestoreCardOut> {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: RestoreCardIn): Promise<RestoreCardOut> {
    Validator.validate([
      {
        code: "restoreCard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "restoreCard.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "restoreCard.requesterId",
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

    const membership = await this.membershipRepository.findByBoardAndUser(
      list.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    if (card.archivedAt === null) {
      throw new DomainError("card.not.archived", 400);
    }

    await this.cardRepository.restore(card.id);

    const restored = await this.cardRepository.findById(card.id);

    return { boardId: list.boardId, card: restored ?? card.clone({ archivedAt: null }) };
  }
}
