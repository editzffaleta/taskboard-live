import { RequiredRule, UseCase, UuidRule, Validator } from "@taskboard/shared";
import { BoardRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";
import { ListRepository } from "../../list/provider";
import { CardRepository } from "../../card/provider";

export interface ListArchivedItemsIn {
  requesterId: string;
}

export interface ArchivedCardItem {
  id: string;
  title: string;
  archivedAt: string;
  boardId: string;
  boardName: string;
  listId: string;
  listTitle: string;
}

export interface ArchivedListItem {
  id: string;
  title: string;
  archivedAt: string;
  boardId: string;
  boardName: string;
  cardCount: number;
}

export interface ArchivedBoardItem {
  id: string;
  name: string;
  archivedAt: string;
  listCount: number;
  cardCount: number;
}

export interface ListArchivedItemsOut {
  cards: ArchivedCardItem[];
  lists: ArchivedListItem[];
  boards: ArchivedBoardItem[];
}

export class ListArchivedItems
  implements UseCase<ListArchivedItemsIn, ListArchivedItemsOut>
{
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly listRepository: ListRepository,
    private readonly cardRepository: CardRepository,
  ) {}

  async execute(input: ListArchivedItemsIn): Promise<ListArchivedItemsOut> {
    Validator.validate([
      {
        code: "listArchivedItems.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const memberships = await this.membershipRepository.listBoardsByUser(
      input.requesterId,
    );

    if (memberships.length === 0) {
      return { cards: [], lists: [], boards: [] };
    }

    const boardIds = memberships.map((membership) => membership.boardId);
    const activeBoards = await this.boardRepository.findManyByIds(boardIds);
    const archivedOwnedBoards =
      await this.boardRepository.findAllArchivedByOwnerId(input.requesterId);

    const boards: ArchivedBoardItem[] = await Promise.all(
      archivedOwnedBoards.map(async (board) => {
        const [lists, cards] = await Promise.all([
          this.listRepository.findAllByBoardId(board.id),
          this.cardRepository.findAllArchivedByBoardId(board.id),
        ]);

        return {
          id: board.id,
          name: board.name,
          archivedAt: board.archivedAt!.toISOString(),
          listCount: lists.length,
          cardCount: cards.length,
        };
      }),
    );

    const lists: ArchivedListItem[] = [];
    const cards: ArchivedCardItem[] = [];

    for (const board of activeBoards) {
      const archivedLists = await this.listRepository.findAllArchivedByBoardId(
        board.id,
      );

      for (const list of archivedLists) {
        const listCards = await this.cardRepository.findAllByListId(list.id);
        lists.push({
          id: list.id,
          title: list.title,
          archivedAt: list.archivedAt!.toISOString(),
          boardId: board.id,
          boardName: board.name,
          cardCount: listCards.length,
        });
      }

      const archivedCards = await this.cardRepository.findAllArchivedByBoardId(
        board.id,
      );

      for (const card of archivedCards) {
        const list = await this.listRepository.findById(card.listId);
        cards.push({
          id: card.id,
          title: card.title,
          archivedAt: card.archivedAt!.toISOString(),
          boardId: board.id,
          boardName: board.name,
          listId: card.listId,
          listTitle: list?.title ?? "",
        });
      }
    }

    return { cards, lists, boards };
  }
}
