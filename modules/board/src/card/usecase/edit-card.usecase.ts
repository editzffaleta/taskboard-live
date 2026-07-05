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

export interface EditCardIn {
  boardId: string;
  cardId: string;
  requesterId: string;
  title: string;
  description?: string | null;
}

export interface EditCardOut {
  card: Card;
}

export class EditCard implements UseCase<EditCardIn, EditCardOut> {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: EditCardIn): Promise<EditCardOut> {
    Validator.validate([
      {
        code: "editCard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "editCard.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "editCard.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "editCard.title",
        value: input.title,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(120)],
      },
      {
        code: "editCard.description",
        value: input.description ?? null,
        rules:
          input.description === undefined || input.description === null
            ? []
            : [new MaxLengthRule(2000)],
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

    const edited = card.clone({
      title: input.title,
      description: input.description ?? null,
    });
    edited.validate();

    const updated = await this.cardRepository.update(edited);

    return { card: updated };
  }
}
