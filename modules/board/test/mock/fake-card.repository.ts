import { Card } from "../../src/card/model";
import { CardRepository } from "../../src/card/provider";

export class FakeCardRepository implements CardRepository {
  readonly cards: Card[] = [];
  /**
   * Associacao listId -> boardId usada apenas por `findAllArchivedByBoardId`
   * (o dominio de `Card` nao guarda `boardId` diretamente; a implementacao
   * Prisma resolve isso via join com `List`). Testes que exercitam esse
   * metodo devem popular via `registerListBoard`.
   */
  private readonly boardIdByListId = new Map<string, string>();
  /**
   * Detalhes (`boardName`/`listTitle`) usados apenas por `searchByBoardIds`,
   * que hidrata contexto do resultado sem depender de outro repositório
   * (change `023`).
   */
  private readonly listDetailsByListId = new Map<
    string,
    { boardName: string; listTitle: string }
  >();

  registerListBoard(
    listId: string,
    boardId: string,
    listDetails?: { boardName: string; listTitle: string },
  ): void {
    this.boardIdByListId.set(listId, boardId);
    if (listDetails) {
      this.listDetailsByListId.set(listId, listDetails);
    }
  }

  async create(card: Card): Promise<Card> {
    this.cards.push(card);
    return card;
  }

  async findById(id: string): Promise<Card | null> {
    return this.cards.find((card) => card.id === id) ?? null;
  }

  async findAllByListId(listId: string): Promise<Card[]> {
    return this.cards
      .filter((card) => card.listId === listId && card.archivedAt === null)
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

  async archive(id: string, archivedAt: Date): Promise<void> {
    const index = this.cards.findIndex((card) => card.id === id);
    if (index >= 0) {
      this.cards[index] = this.cards[index].clone({ archivedAt });
    }
  }

  async restore(id: string): Promise<void> {
    const index = this.cards.findIndex((card) => card.id === id);
    if (index >= 0) {
      this.cards[index] = this.cards[index].clone({ archivedAt: null });
    }
  }

  async findAllArchivedByBoardId(boardId: string): Promise<Card[]> {
    return this.cards.filter(
      (card) =>
        card.archivedAt !== null &&
        this.boardIdByListId.get(card.listId) === boardId,
    );
  }

  async searchByBoardIds(
    boardIds: string[],
    query: string,
    limit: number,
  ): Promise<
    { card: Card; boardId: string; boardName: string; listTitle: string }[]
  > {
    const normalizedQuery = query.toLowerCase();

    return this.cards
      .filter((card) => {
        const boardId = this.boardIdByListId.get(card.listId);
        if (!boardId || card.archivedAt !== null) {
          return false;
        }
        if (!boardIds.includes(boardId)) {
          return false;
        }
        const titleMatch = card.title.toLowerCase().includes(normalizedQuery);
        const descriptionMatch = (card.description ?? "")
          .toLowerCase()
          .includes(normalizedQuery);
        return titleMatch || descriptionMatch;
      })
      .slice(0, limit)
      .map((card) => {
        const boardId = this.boardIdByListId.get(card.listId)!;
        const details = this.listDetailsByListId.get(card.listId);
        return {
          card,
          boardId,
          boardName: details?.boardName ?? "",
          listTitle: details?.listTitle ?? "",
        };
      });
  }
}
