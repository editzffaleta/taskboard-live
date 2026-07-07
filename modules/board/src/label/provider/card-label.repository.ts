export interface CardLabelRepository {
  /**
   * Associa a etiqueta ao cartao. Idempotente: se ja existir a
   * associacao (cardId, labelId), nao deve criar duplicata nem lancar erro.
   */
  assign(cardId: string, labelId: string): Promise<void>;
  /**
   * Remove a associacao, se existir. Idempotente: remover uma associacao
   * inexistente nao deve lancar erro.
   */
  unassign(cardId: string, labelId: string): Promise<void>;
  findAllByCardId(cardId: string): Promise<string[]>;
  /**
   * Hidrata `labels` de varios cartoes numa unica consulta (evita N+1).
   * Retorna um mapa cardId -> labelIds.
   */
  findAllByCardIds(cardIds: string[]): Promise<Record<string, string[]>>;
}
