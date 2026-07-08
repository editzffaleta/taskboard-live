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
import { CardLabelRepository } from "../../label/provider";
import { ChecklistItem } from "../../checklist-item/model";
import { ChecklistItemRepository } from "../../checklist-item/provider";
import { CardAssigneeRepository } from "../../card-assignee/provider";

const COPY_SUFFIX = " (cópia)";

export interface DuplicateCardIn {
  boardId: string;
  cardId: string;
  requesterId: string;
  toListId?: string;
  copyAssignees?: boolean;
}

export interface DuplicateCardOut {
  card: Card;
}

export class DuplicateCard
  implements UseCase<DuplicateCardIn, DuplicateCardOut>
{
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly cardLabelRepository: CardLabelRepository,
    private readonly checklistItemRepository: ChecklistItemRepository,
    private readonly cardAssigneeRepository: CardAssigneeRepository,
  ) {}

  async execute(input: DuplicateCardIn): Promise<DuplicateCardOut> {
    Validator.validate([
      {
        code: "duplicateCard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "duplicateCard.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "duplicateCard.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "duplicateCard.toListId",
        value: input.toListId,
        rules: input.toListId === undefined ? [] : [new UuidRule()],
      },
    ]);

    const card = await this.cardRepository.findById(input.cardId);

    if (!card) {
      throw new NotFoundError("card.not.found");
    }

    const originList = await this.listRepository.findById(card.listId);

    if (!originList || originList.boardId !== input.boardId) {
      throw new NotFoundError("card.not.found");
    }

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const destinationListId = input.toListId ?? card.listId;
    const destinationList =
      destinationListId === card.listId
        ? originList
        : await this.listRepository.findById(destinationListId);

    if (!destinationList || destinationList.boardId !== input.boardId) {
      throw new NotFoundError("list.not.found");
    }

    const existingCards = await this.cardRepository.findAllByListId(
      destinationListId,
    );
    const position = existingCards.length;

    const copy = new Card({
      listId: destinationListId,
      title: `${card.title}${COPY_SUFFIX}`,
      description: card.description,
      position,
      dueDate: card.dueDate,
      cover: null,
    });
    copy.validate();

    const created = await this.cardRepository.create(copy);

    const labelIds = await this.cardLabelRepository.findAllByCardId(card.id);
    for (const labelId of labelIds) {
      await this.cardLabelRepository.assign(created.id, labelId);
    }

    const checklist = await this.checklistItemRepository.findAllByCardId(
      card.id,
    );
    for (const item of checklist) {
      const newItem = new ChecklistItem({
        cardId: created.id,
        text: item.text,
        done: item.done,
        position: item.position,
      });
      newItem.validate();
      await this.checklistItemRepository.create(newItem);
    }

    if (input.copyAssignees === true) {
      const assigneeIds = await this.cardAssigneeRepository.findAllByCardId(
        card.id,
      );
      for (const userId of assigneeIds) {
        await this.cardAssigneeRepository.assign(created.id, userId);
      }
    }

    return { card: created };
  }
}
