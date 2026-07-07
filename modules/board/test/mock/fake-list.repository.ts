import { List } from "../../src/list/model";
import { ListRepository } from "../../src/list/provider";

export class FakeListRepository implements ListRepository {
  readonly lists: List[] = [];

  async create(list: List): Promise<List> {
    this.lists.push(list);
    return list;
  }

  async findById(id: string): Promise<List | null> {
    return this.lists.find((list) => list.id === id) ?? null;
  }

  async findAllByBoardId(boardId: string): Promise<List[]> {
    return this.lists
      .filter((list) => list.boardId === boardId && list.archivedAt === null)
      .sort((a, b) => a.position - b.position);
  }

  async update(list: List): Promise<List> {
    const index = this.lists.findIndex((item) => item.id === list.id);
    if (index >= 0) {
      this.lists[index] = list;
    }
    return list;
  }

  async updatePositions(
    updates: { id: string; position: number }[],
  ): Promise<void> {
    for (const update of updates) {
      const index = this.lists.findIndex((item) => item.id === update.id);
      if (index >= 0) {
        this.lists[index] = this.lists[index].clone({
          position: update.position,
        });
      }
    }
  }

  async delete(id: string): Promise<void> {
    const index = this.lists.findIndex((list) => list.id === id);
    if (index >= 0) {
      this.lists.splice(index, 1);
    }
  }

  async archive(id: string, archivedAt: Date): Promise<void> {
    const index = this.lists.findIndex((list) => list.id === id);
    if (index >= 0) {
      this.lists[index] = this.lists[index].clone({ archivedAt });
    }
  }

  async restore(id: string): Promise<void> {
    const index = this.lists.findIndex((list) => list.id === id);
    if (index >= 0) {
      this.lists[index] = this.lists[index].clone({ archivedAt: null });
    }
  }

  async findAllArchivedByBoardId(boardId: string): Promise<List[]> {
    return this.lists.filter(
      (list) => list.archivedAt !== null && list.boardId === boardId,
    );
  }
}
