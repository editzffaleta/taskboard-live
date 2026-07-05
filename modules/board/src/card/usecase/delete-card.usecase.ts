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

export interface DeleteCardIn {
  boardId: string;
  cardId: string;
  requesterId: string;
}

export interface DeleteCardOut {
  boardId: string;
  listId: string;
  cardId: string;
}

export class DeleteCard implements UseCase<DeleteCardIn, DeleteCardOut> {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: DeleteCardIn): Promise<DeleteCardOut> {
    Validator.validate([
      {
        code: "deleteCard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteCard.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteCard.requesterId",
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

    await this.cardRepository.delete(input.cardId);

    const remaining = (
      await this.cardRepository.findAllByListId(card.listId)
    ).sort((a, b) => a.position - b.position);

    const renormalized = remaining.map((item, index) =>
      item.position === index ? item : item.clone({ position: index }),
    );

    if (renormalized.length > 0) {
      await this.cardRepository.updatePositions(
        renormalized.map((item) => ({
          id: item.id,
          listId: item.listId,
          position: item.position,
        })),
      );
    }

    return { boardId: list.boardId, listId: card.listId, cardId: card.id };
  }
}
