import { Board } from "../../src/board/model";
import {
  BoardRepository,
  CreateBoardWithOwnerInput,
} from "../../src/board/provider";
import { Membership } from "../../src/membership/model";

export class FakeBoardRepository implements BoardRepository {
  readonly boards: Board[] = [];

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
    return this.boards.filter((board) => ids.includes(board.id));
  }
}
