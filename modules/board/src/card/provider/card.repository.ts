import { Card } from "../model";

export interface CardRepository {
  create(card: Card): Promise<Card>;
  findById(id: string): Promise<Card | null>;
  findAllByListId(listId: string): Promise<Card[]>;
  update(card: Card): Promise<Card>;
  /**
   * Atualiza a posicao de varios cartoes (de uma ou mais listas) em uma unica
   * operacao (transacao), evitando posicoes duplicadas ou com lacunas.
   */
  updatePositions(
    updates: { id: string; listId: string; position: number }[],
  ): Promise<void>;
  delete(id: string): Promise<void>;
  archive(id: string, archivedAt: Date): Promise<void>;
  restore(id: string): Promise<void>;
  findAllArchivedByBoardId(boardId: string): Promise<Card[]>;
  /**
   * Busca cartoes nao arquivados (nem a lista pai), dentro de `boardIds` (ja
   * restritos por membership no caso de uso `Search`), cujo `title` ou
   * `description` contem `query` (case-insensitive), limitado a `limit`
   * itens, hidratando `boardId`/`boardName`/`listTitle` (change `023`).
   */
  searchByBoardIds(
    boardIds: string[],
    query: string,
    limit: number,
  ): Promise<{ card: Card; boardId: string; boardName: string; listTitle: string }[]>;
}
