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
import { Card } from "../model";
import { CardRepository } from "../provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface CreateCardIn {
  boardId: string;
  requesterId: string;
  listId: string;
  title: string;
}

export interface CreateCardOut {
  card: Card;
}

export class CreateCard implements UseCase<CreateCardIn, CreateCardOut> {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: CreateCardIn): Promise<CreateCardOut> {
    Validator.validate([
      {
        code: "createCard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "createCard.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "createCard.listId",
        value: input.listId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "createCard.title",
        value: input.title,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(120)],
      },
    ]);

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const list = await this.listRepository.findById(input.listId);

    if (!list || list.boardId !== input.boardId) {
      throw new NotFoundError("list.not.found");
    }

    const existingCards = await this.cardRepository.findAllByListId(
      input.listId,
    );

    const position = existingCards.length;

    const card = new Card({
      listId: input.listId,
      title: input.title,
      position,
    });
    card.validate();

    const created = await this.cardRepository.create(card);

    return { card: created };
  }
}
