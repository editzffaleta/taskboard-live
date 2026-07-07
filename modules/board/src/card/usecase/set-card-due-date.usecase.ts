import {
  DateRule,
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

export interface SetCardDueDateIn {
  boardId: string;
  cardId: string;
  requesterId: string;
  dueDate: Date | null;
}

export interface SetCardDueDateOut {
  card: Card;
}

export class SetCardDueDate
  implements UseCase<SetCardDueDateIn, SetCardDueDateOut>
{
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: SetCardDueDateIn): Promise<SetCardDueDateOut> {
    Validator.validate([
      {
        code: "setCardDueDate.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "setCardDueDate.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "setCardDueDate.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "setCardDueDate.dueDate",
        value: input.dueDate,
        rules: input.dueDate === null ? [] : [new DateRule()],
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

    const edited = card.clone({ dueDate: input.dueDate });
    edited.validate();

    const updated = await this.cardRepository.update(edited);

    return { card: updated };
  }
}
