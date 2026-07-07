import type {
  Board,
  BoardRepository,
  CreateBoardWithOwnerInput,
  Membership,
} from "@taskboard/board";

export class FakeBoardRepository implements BoardRepository {
  readonly boards: Board[] = [];

  async createWithOwnerMembership(
    _input: CreateBoardWithOwnerInput,
  ): Promise<{ board: Board; membership: Membership }> {
    throw new Error("not implemented in fake used by auth tests");
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
