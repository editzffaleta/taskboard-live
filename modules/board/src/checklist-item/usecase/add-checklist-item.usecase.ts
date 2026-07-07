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
import { ChecklistItem } from "../model";
import { ChecklistItemRepository } from "../provider";
import { Card } from "../../card/model";
import { CardRepository } from "../../card/provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface AddChecklistItemIn {
  boardId: string;
  cardId: string;
  requesterId: string;
  text: string;
}

export interface AddChecklistItemOut {
  card: Card;
  checklist: ChecklistItem[];
}

export class AddChecklistItem
  implements UseCase<AddChecklistItemIn, AddChecklistItemOut>
{
  constructor(
    private readonly checklistItemRepository: ChecklistItemRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: AddChecklistItemIn): Promise<AddChecklistItemOut> {
    Validator.validate([
      {
        code: "addChecklistItem.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addChecklistItem.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addChecklistItem.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addChecklistItem.text",
        value: input.text,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(240)],
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

    const existingItems = await this.checklistItemRepository.findAllByCardId(
      card.id,
    );
    const position =
      existingItems.length === 0
        ? 0
        : Math.max(...existingItems.map((item) => item.position)) + 1;

    const item = new ChecklistItem({
      cardId: card.id,
      text: input.text,
      position,
    });
    item.validate();

    await this.checklistItemRepository.create(item);
    const checklist = await this.checklistItemRepository.findAllByCardId(
      card.id,
    );

    return { card, checklist };
  }
}
