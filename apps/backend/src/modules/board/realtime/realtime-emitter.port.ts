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
 */
export interface RealtimeEmitter {
  emitToBoard(boardId: string, event: string, payload: unknown): void;
}
