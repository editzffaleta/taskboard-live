import {
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Board } from "../model";
import { BoardRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";
import { List } from "../../list/model";
import { ListRepository } from "../../list/provider";
import { Card } from "../../card/model";
import { CardRepository } from "../../card/provider";
import { CardLabelRepository, LabelRepository } from "../../label/provider";
import { Label } from "../../label/model";

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

export interface BoardDetailCard {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  labels: BoardDetailCardLabel[];
}

export interface BoardDetail {
  id: string;
  name: string;
  ownerId: string;
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
        createdAt: board.createdAt,
        lists: listsWithCards,
      },
    };
  }

  private async toListDetail(list: List): Promise<BoardDetailList> {
    const cards = await this.cardRepository.findAllByListId(list.id);
    const sortedCards = [...cards].sort((a, b) => a.position - b.position);

    const labelsByCardId = await this.cardLabelRepository.findAllByCardIds(
      sortedCards.map((card) => card.id),
    );
    const allLabels = await this.labelRepository.findAllByBoardId(
      list.boardId,
    );
    const labelById = new Map(allLabels.map((label) => [label.id, label]));

    return {
      id: list.id,
      boardId: list.boardId,
      title: list.title,
      position: list.position,
      cards: sortedCards.map((card) =>
        this.toCardDetail(card, labelsByCardId[card.id] ?? [], labelById),
      ),
    };
  }

  private toCardDetail(
    card: Card,
    labelIds: string[],
    labelById: Map<string, Label>,
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
    };
  }
}
