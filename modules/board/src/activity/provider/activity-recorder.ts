/**
 * Porta de gravação de atividade do quadro. Implementação concreta persiste a
 * `Activity` e emite `activity.created` via `RealtimeEmitter` (definida na
 * change `006`). A trilha de atividade é auxiliar: falha ao gravar nunca deve
 * propagar exceção para quem chama `record`.
 *
 * Catálogo de `type` (ver também `activity.entity.ts`): `card.created`,
 * `card.updated`, `card.moved`, `card.deleted`, `list.created`,
 * `list.updated`, `list.moved`, `list.deleted`, `member.added`.
 */
export interface ActivityRecorder {
  record(
    boardId: string,
    actorId: string,
    type: string,
    data: Record<string, unknown>,
  ): Promise<void>;
}
