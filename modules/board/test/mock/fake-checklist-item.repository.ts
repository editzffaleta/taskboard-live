import { ChecklistItem } from "../../src/checklist-item/model";
import { ChecklistItemRepository } from "../../src/checklist-item/provider";

export class FakeChecklistItemRepository implements ChecklistItemRepository {
  readonly items: ChecklistItem[] = [];

  async create(item: ChecklistItem): Promise<ChecklistItem> {
    this.items.push(item);
    return item;
  }

  async findById(id: string): Promise<ChecklistItem | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findAllByCardId(cardId: string): Promise<ChecklistItem[]> {
    return this.items
      .filter((item) => item.cardId === cardId)
      .sort((a, b) => a.position - b.position);
  }

  async findAllByCardIds(
    cardIds: string[],
  ): Promise<Record<string, ChecklistItem[]>> {
    const result: Record<string, ChecklistItem[]> = {};
    for (const cardId of cardIds) {
      result[cardId] = await this.findAllByCardId(cardId);
    }
    return result;
  }

  async update(item: ChecklistItem): Promise<ChecklistItem> {
    const index = this.items.findIndex((it) => it.id === item.id);
    if (index >= 0) {
      this.items[index] = item;
    }
    return item;
  }

  async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }
}
