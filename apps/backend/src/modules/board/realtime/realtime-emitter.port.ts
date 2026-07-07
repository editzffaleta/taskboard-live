/**
 * Porta de emissão de eventos de tempo real para os membros conectados a um quadro.
 *
 * Catálogo de eventos suportado (documentado aqui, emitidos pelas changes donas de cada
 * recurso após seus casos de uso terem sucesso):
 * - `card.created`
 * - `card.updated`
 * - `card.moved` (`{ cardId, fromListId, toListId, position }`)
 * - `card.deleted`
 * - `list.created`
 * - `list.updated`
 * - `list.moved`
 * - `list.deleted`
 * - `member.added`
 * - `activity.created`
 * - `presence.update` (único evento efetivamente emitido pela infraestrutura desta change)
 * - `notification.created` (emitido via `emitToUser`, change `024`)
 */
export interface RealtimeEmitter {
  emitToBoard(boardId: string, event: string, payload: unknown): void;
  /**
   * Emite um evento para a sala individual `user:{userId}` (entrada
   * automática no handshake autenticado do `BoardGateway`, sem checagem de
   * membership — a sala é do próprio usuário). Introduzida pela change `024`
   * para o canal de notificações.
   */
  emitToUser(userId: string, event: string, payload: unknown): void;
}
