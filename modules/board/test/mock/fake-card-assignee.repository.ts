import { CardAssigneeRepository } from "../../src/card-assignee/provider";

export class FakeCardAssigneeRepository implements CardAssigneeRepository {
  readonly links: { cardId: string; userId: string }[] = [];

  async assign(cardId: string, userId: string): Promise<void> {
    const exists = this.links.some(
      (link) => link.cardId === cardId && link.userId === userId,
    );
    if (!exists) {
      this.links.push({ cardId, userId });
    }
  }

  async unassign(cardId: string, userId: string): Promise<void> {
    const index = this.links.findIndex(
      (link) => link.cardId === cardId && link.userId === userId,
    );
    if (index >= 0) {
      this.links.splice(index, 1);
    }
  }

  async findAllByCardId(cardId: string): Promise<string[]> {
    return this.links
      .filter((link) => link.cardId === cardId)
      .map((link) => link.userId);
  }

  async findAllByCardIds(cardIds: string[]): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    for (const cardId of cardIds) {
      result[cardId] = this.links
        .filter((link) => link.cardId === cardId)
        .map((link) => link.userId);
    }
    return result;
  }
}
