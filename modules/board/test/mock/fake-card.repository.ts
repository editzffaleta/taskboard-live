import { Card } from "../../src/card/model";
import { CardRepository } from "../../src/card/provider";

export class FakeCardRepository implements CardRepository {
  readonly cards: Card[] = [];

  async create(card: Card): Promise<Card> {
    this.cards.push(card);
    return card;
  }

  async findById(id: string): Promise<Card | null> {
    return this.cards.find((card) => card.id === id) ?? null;
  }

  async findAllByListId(listId: string): Promise<Card[]> {
    return this.cards
      .filter((card) => card.listId === listId)
      .sort((a, b) => a.position - b.position);
  }

  async update(card: Card): Promise<Card> {
    const index = this.cards.findIndex((item) => item.id === card.id);
    if (index >= 0) {
      this.cards[index] = card;
    }
    return card;
  }

  async updatePositions(
    updates: { id: string; listId: string; position: number }[],
  ): Promise<void> {
    for (const update of updates) {
      const index = this.cards.findIndex((item) => item.id === update.id);
      if (index >= 0) {
        this.cards[index] = this.cards[index].clone({
          listId: update.listId,
          position: update.position,
        });
      }
    }
  }

  async delete(id: string): Promise<void> {
    const index = this.cards.findIndex((card) => card.id === id);
    if (index >= 0) {
      this.cards.splice(index, 1);
    }
  }
}
