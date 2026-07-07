import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { CardRepository } from "../provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface ArchiveCardIn {
  boardId: string;
  cardId: string;
  requesterId: string;
}

export interface ArchiveCardOut {
  boardId: string;
  listId: string;
  cardId: string;
}

export class ArchiveCard implements UseCase<ArchiveCardIn, ArchiveCardOut> {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ArchiveCardIn): Promise<ArchiveCardOut> {
    Validator.validate([
      {
        code: "archiveCard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "archiveCard.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "archiveCard.requesterId",
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

    if (card.archivedAt !== null) {
      throw new DomainError("card.already.archived", 400);
    }

    await this.cardRepository.archive(card.id, new Date());

    return { boardId: list.boardId, listId: card.listId, cardId: card.id };
  }
}
