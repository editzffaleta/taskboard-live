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

export interface DeleteChecklistItemIn {
  boardId: string;
  cardId: string;
  itemId: string;
  requesterId: string;
}

export interface DeleteChecklistItemOut {
  card: Card;
  checklist: ChecklistItem[];
}

export class DeleteChecklistItem
  implements UseCase<DeleteChecklistItemIn, DeleteChecklistItemOut>
{
  constructor(
    private readonly checklistItemRepository: ChecklistItemRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: DeleteChecklistItemIn): Promise<DeleteChecklistItemOut> {
    Validator.validate([
      {
        code: "deleteChecklistItem.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteChecklistItem.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteChecklistItem.itemId",
        value: input.itemId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteChecklistItem.requesterId",
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

    await this.checklistItemRepository.delete(item.id);

    const checklist = await this.checklistItemRepository.findAllByCardId(
      card.id,
    );

    return { card, checklist };
  }
}
