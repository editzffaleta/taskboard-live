export interface CardAssigneeRepository {
  /**
   * Atribui o usuario ao cartao. Idempotente: se ja existir a associacao
   * (cardId, userId), nao deve criar duplicata nem lancar erro.
   */
  assign(cardId: string, userId: string): Promise<void>;
  /**
   * Remove a associacao, se existir. Idempotente: remover uma associacao
   * inexistente nao deve lancar erro.
   */
  unassign(cardId: string, userId: string): Promise<void>;
  findAllByCardId(cardId: string): Promise<string[]>;
  /**
   * Hidrata `assignees` de varios cartoes numa unica consulta (evita N+1).
   * Retorna um mapa cardId -> userIds.
   */
  findAllByCardIds(cardIds: string[]): Promise<Record<string, string[]>>;
}
