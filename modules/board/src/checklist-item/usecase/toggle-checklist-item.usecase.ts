import {
  DomainError,
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

export interface ToggleChecklistItemIn {
  boardId: string;
  cardId: string;
  itemId: string;
  requesterId: string;
  done: boolean;
}

export interface ToggleChecklistItemOut {
  card: Card;
  checklist: ChecklistItem[];
}

export class ToggleChecklistItem
  implements UseCase<ToggleChecklistItemIn, ToggleChecklistItemOut>
{
  constructor(
    private readonly checklistItemRepository: ChecklistItemRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ToggleChecklistItemIn): Promise<ToggleChecklistItemOut> {
    Validator.validate([
      {
        code: "toggleChecklistItem.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "toggleChecklistItem.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "toggleChecklistItem.itemId",
        value: input.itemId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "toggleChecklistItem.requesterId",
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

    const item = await this.checklistItemRepository.findById(input.itemId);

    if (!item || item.cardId !== card.id) {
      throw new NotFoundError("checklistItem.not.found");
    }

    const updatedItem = item.clone({ done: input.done });
    updatedItem.validate();
    await this.checklistItemRepository.update(updatedItem);

    const checklist = await this.checklistItemRepository.findAllByCardId(
      card.id,
    );

    return { card, checklist };
  }
}
