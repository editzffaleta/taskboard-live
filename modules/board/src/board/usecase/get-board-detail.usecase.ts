import {
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Board } from "../model";
import { BoardRepository } from "../provider";
import { MembershipRepository, MemberDirectory } from "../../membership/provider";
import { List } from "../../list/model";
import { ListRepository } from "../../list/provider";
import { Card } from "../../card/model";
import { CardRepository } from "../../card/provider";
import { CardLabelRepository, LabelRepository } from "../../label/provider";
import { Label } from "../../label/model";
import { ChecklistItemRepository } from "../../checklist-item/provider";
import { CardAssigneeRepository } from "../../card-assignee/provider";

export interface GetBoardDetailIn {
  boardId: string;
  requesterId: string;
}

export interface BoardDetailList {
  id: string;
  boardId: string;
  title: string;
  position: number;
  cards: BoardDetailCard[];
}

export interface BoardDetailCardLabel {
  id: string;
  name: string;
  color: string;
}

export interface BoardDetailCardAssignee {
  id: string;
  name: string;
}

export interface BoardDetailChecklistItem {
  id: string;
  text: string;
  done: boolean;
  position: number;
}

export interface BoardDetailCard {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  labels: BoardDetailCardLabel[];
  dueDate: string | null;
  assignees: BoardDetailCardAssignee[];
  checklist: BoardDetailChecklistItem[];
}

export interface BoardDetail {
  id: string;
  name: string;
  ownerId: string;
  color: string | null;
  createdAt: Date;
  lists: BoardDetailList[];
}

export interface GetBoardDetailOut {
  board: BoardDetail;
}

export class GetBoardDetail
  implements UseCase<GetBoardDetailIn, GetBoardDetailOut>
{
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly listRepository: ListRepository,
    private readonly cardRepository: CardRepository,
    private readonly cardLabelRepository: CardLabelRepository,
    private readonly labelRepository: LabelRepository,
    private readonly checklistItemRepository: ChecklistItemRepository,
    private readonly cardAssigneeRepository: CardAssigneeRepository,
    private readonly memberDirectory: MemberDirectory,
  ) {}

  async execute(input: GetBoardDetailIn): Promise<GetBoardDetailOut> {
    Validator.validate([
      {
        code: "getBoardDetail.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "getBoardDetail.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new NotFoundError("board.not.found");
    }

    const board = await this.boardRepository.findById(input.boardId);

    if (!board) {
      throw new NotFoundError("board.not.found");
    }

    const lists = await this.listRepository.findAllByBoardId(board.id);
    const sortedLists = [...lists].sort((a, b) => a.position - b.position);

    const listsWithCards = await Promise.all(
      sortedLists.map((list) => this.toListDetail(list)),
    );

    return {
      board: {
        id: board.id,
        name: board.name,
        ownerId: board.ownerId,
        color: board.color,
        createdAt: board.createdAt,
        lists: listsWithCards,
      },
    };
  }

  private async toListDetail(list: List): Promise<BoardDetailList> {
    const cards = await this.cardRepository.findAllByListId(list.id);
    const sortedCards = [...cards].sort((a, b) => a.position - b.position);
    const cardIds = sortedCards.map((card) => card.id);

    const labelsByCardId = await this.cardLabelRepository.findAllByCardIds(
      cardIds,
    );
    const allLabels = await this.labelRepository.findAllByBoardId(
      list.boardId,
    );
    const labelById = new Map(allLabels.map((label) => [label.id, label]));

    const checklistByCardId = await this.checklistItemRepository.findAllByCardIds(
      cardIds,
    );
    const assigneeIdsByCardId = await this.cardAssigneeRepository.findAllByCardIds(
      cardIds,
    );
    const allAssigneeIds = Array.from(
      new Set(Object.values(assigneeIdsByCardId).flat()),
    );
    const assigneeById = await this.resolveAssignees(allAssigneeIds);

    return {
      id: list.id,
      boardId: list.boardId,
      title: list.title,
      position: list.position,
      cards: sortedCards.map((card) =>
        this.toCardDetail(
          card,
          labelsByCardId[card.id] ?? [],
          labelById,
          checklistByCardId[card.id] ?? [],
          assigneeIdsByCardId[card.id] ?? [],
          assigneeById,
        ),
      ),
    };
  }

  private async resolveAssignees(
    userIds: string[],
  ): Promise<Map<string, BoardDetailCardAssignee>> {
    const entries = await Promise.all(
      userIds.map(async (userId) => {
        const user = await this.memberDirectory.findById(userId);
        return user ? ([userId, { id: user.id, name: user.name }] as const) : null;
      }),
    );

    return new Map(
      entries.filter(
        (entry): entry is readonly [string, BoardDetailCardAssignee] =>
          entry !== null,
      ),
    );
  }

  private toCardDetail(
    card: Card,
    labelIds: string[],
    labelById: Map<string, Label>,
    checklist: { id: string; text: string; done: boolean; position: number }[],
    assigneeIds: string[],
    assigneeById: Map<string, BoardDetailCardAssignee>,
  ): BoardDetailCard {
    return {
      id: card.id,
      listId: card.listId,
      title: card.title,
      description: card.description,
      position: card.position,
      labels: labelIds
        .map((labelId) => labelById.get(labelId))
        .filter((label): label is NonNullable<typeof label> => label !== undefined)
        .map((label) => ({ id: label.id, name: label.name, color: label.color })),
      dueDate: card.dueDate ? card.dueDate.toISOString() : null,
      assignees: assigneeIds
        .map((userId) => assigneeById.get(userId))
        .filter(
          (assignee): assignee is BoardDetailCardAssignee =>
            assignee !== undefined,
        ),
      checklist: [...checklist]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          text: item.text,
          done: item.done,
          position: item.position,
        })),
    };
  }
}
