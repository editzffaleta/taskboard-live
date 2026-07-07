import {
  DomainError,
  MinItemsRule,
  NotFoundError,
  RequiredRule,
  UniqueItemsRule,
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

export interface ReorderChecklistItemsIn {
  boardId: string;
  cardId: string;
  requesterId: string;
  itemIds: string[];
}

export interface ReorderChecklistItemsOut {
  card: Card;
  checklist: ChecklistItem[];
}

export class ReorderChecklistItems
  implements UseCase<ReorderChecklistItemsIn, ReorderChecklistItemsOut>
{
  constructor(
    private readonly checklistItemRepository: ChecklistItemRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(
    input: ReorderChecklistItemsIn,
  ): Promise<ReorderChecklistItemsOut> {
    Validator.validate([
      {
        code: "reorderChecklistItems.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "reorderChecklistItems.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "reorderChecklistItems.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "reorderChecklistItems.itemIds",
        value: input.itemIds,
        rules: [new RequiredRule(), new MinItemsRule(1), new UniqueItemsRule()],
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

    const existingIds = new Set(existingItems.map((item) => item.id));
    const allBelongToCard =
      input.itemIds.length === existingItems.length &&
      input.itemIds.every((id) => existingIds.has(id));

    if (!allBelongToCard) {
      throw new DomainError("checklistItem.reorder.invalid", 422);
    }

    for (let index = 0; index < input.itemIds.length; index += 1) {
      const item = existingItems.find((it) => it.id === input.itemIds[index]);
      if (item && item.position !== index) {
        const updated = item.clone({ position: index });
        updated.validate();
        await this.checklistItemRepository.update(updated);
      }
    }

    const checklist = await this.checklistItemRepository.findAllByCardId(
      card.id,
    );

    return { card, checklist };
  }
}
