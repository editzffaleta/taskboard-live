import { CardLabelRepository } from "../../src/label/provider";

export class FakeCardLabelRepository implements CardLabelRepository {
  readonly links: { cardId: string; labelId: string }[] = [];

  async assign(cardId: string, labelId: string): Promise<void> {
    const exists = this.links.some(
      (link) => link.cardId === cardId && link.labelId === labelId,
    );
    if (!exists) {
      this.links.push({ cardId, labelId });
    }
  }

  async unassign(cardId: string, labelId: string): Promise<void> {
    const index = this.links.findIndex(
      (link) => link.cardId === cardId && link.labelId === labelId,
    );
    if (index >= 0) {
      this.links.splice(index, 1);
    }
  }

  async findAllByCardId(cardId: string): Promise<string[]> {
    return this.links
      .filter((link) => link.cardId === cardId)
      .map((link) => link.labelId);
  }

  async findAllByCardIds(cardIds: string[]): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    for (const cardId of cardIds) {
      result[cardId] = this.links
        .filter((link) => link.cardId === cardId)
        .map((link) => link.labelId);
    }
    return result;
  }
}
