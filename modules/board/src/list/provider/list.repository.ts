import { List } from "../model";

export interface ListRepository {
  create(list: List): Promise<List>;
  findById(id: string): Promise<List | null>;
  findAllByBoardId(boardId: string): Promise<List[]>;
  update(list: List): Promise<List>;
  /**
   * Atualiza a posicao de varias listas do mesmo quadro em uma unica
   * operacao (transacao), evitando posicoes duplicadas ou com lacunas.
   */
  updatePositions(
    updates: { id: string; position: number }[],
  ): Promise<void>;
  /**
   * Exclui a lista. A exclusao dos cartoes associados a ela e
   * responsabilidade da constraint de FK (`onDelete: Cascade` de
   * `Card.listId`, definida pela change 008) — nao e feita aqui.
   */
  delete(id: string): Promise<void>;
}
