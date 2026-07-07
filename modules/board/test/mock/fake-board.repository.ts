import { Board } from "../../src/board/model";
import {
  BoardRepository,
  CreateBoardFromTemplateInput,
  CreateBoardWithOwnerInput,
} from "../../src/board/provider";
import { Membership } from "../../src/membership/model";
import { List } from "../../src/list/model";
import { Card } from "../../src/card/model";

export class FakeBoardRepository implements BoardRepository {
  readonly boards: Board[] = [];
  readonly lists: List[] = [];
  readonly cards: Card[] = [];

  constructor(private readonly memberships: Membership[] = []) {}

  async createWithOwnerMembership(
    input: CreateBoardWithOwnerInput,
  ): Promise<{ board: Board; membership: Membership }> {
    const board = new Board({ name: input.name, ownerId: input.ownerId });
    board.validate();

    const membership = new Membership({
      boardId: board.id,
      userId: input.ownerId,
      role: "owner",
    });
    membership.validate();

    this.boards.push(board);
    this.memberships.push(membership);

    return { board, membership };
  }

  async createFromTemplate(
    input: CreateBoardFromTemplateInput,
  ): Promise<{
    board: Board;
    membership: Membership;
    lists: List[];
    cards: Card[];
  }> {
    const board = new Board({ name: input.name, ownerId: input.ownerId });
    board.validate();

    const membership = new Membership({
      boardId: board.id,
      userId: input.ownerId,
      role: "owner",
    });
    membership.validate();

    const createdLists: List[] = [];
    const createdCards: Card[] = [];

    input.lists.forEach((listInput, listIndex) => {
      const list = new List({
        boardId: board.id,
        title: listInput.title,
        position: listIndex,
      });
      list.validate();
      createdLists.push(list);

      listInput.cards.forEach((cardInput, cardIndex) => {
        const card = new Card({
          listId: list.id,
          title: cardInput.title,
          position: cardIndex,
        });
        card.validate();
        createdCards.push(card);
      });
    });

    this.boards.push(board);
    this.memberships.push(membership);
    this.lists.push(...createdLists);
    this.cards.push(...createdCards);

    return { board, membership, lists: createdLists, cards: createdCards };
  }

  async update(entity: Board): Promise<Board> {
    const index = this.boards.findIndex((board) => board.id === entity.id);
    if (index >= 0) {
      this.boards[index] = entity;
    }
    return entity;
  }

  async delete(id: string): Promise<void> {
    const index = this.boards.findIndex((board) => board.id === id);
    if (index >= 0) {
      this.boards.splice(index, 1);
    }
  }

  async findById(id: string): Promise<Board | null> {
    return this.boards.find((board) => board.id === id) ?? null;
  }

  async findManyByIds(ids: string[]): Promise<Board[]> {
    return this.boards.filter(
      (board) => ids.includes(board.id) && board.archivedAt === null,
    );
  }

  async archive(id: string, archivedAt: Date): Promise<void> {
    const index = this.boards.findIndex((board) => board.id === id);
    if (index >= 0) {
      this.boards[index] = this.boards[index].clone({ archivedAt });
    }
  }

  async restore(id: string): Promise<void> {
    const index = this.boards.findIndex((board) => board.id === id);
    if (index >= 0) {
      this.boards[index] = this.boards[index].clone({ archivedAt: null });
    }
  }

  async findAllArchivedByOwnerId(ownerId: string): Promise<Board[]> {
    return this.boards.filter(
      (board) => board.archivedAt !== null && board.ownerId === ownerId,
    );
  }

  async searchByIds(
    ids: string[],
    query: string,
    limit: number,
  ): Promise<Board[]> {
    const normalizedQuery = query.toLowerCase();
    return this.boards
      .filter(
        (board) =>
          ids.includes(board.id) &&
          board.archivedAt === null &&
          board.name.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, limit);
  }
}
