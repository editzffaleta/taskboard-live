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
}
