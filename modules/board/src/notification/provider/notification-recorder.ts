/**
 * Porta de gravação de notificação por usuário. Implementação concreta
 * persiste a `Notification` e emite `notification.created` via
 * `RealtimeEmitter.emitToUser` (extensão da `006` feita na change `024`). A
 * notificação é auxiliar: falha ao gravar nunca deve propagar exceção para
 * quem chama `record`.
 *
 * Catálogo de `type` (ver também `notification.entity.ts`):
 * - `member.added.you`  -> { boardId, boardName, addedByName }
 * - `card.assigned.you` -> { boardId, cardId, cardTitle, assignedByName }
 * - `comment.added`     -> { boardId, cardId, cardTitle, commentId, authorName, excerpt }
 */
export interface NotificationRecorder {
  record(
    userId: string,
    type: string,
    data: Record<string, unknown>,
  ): Promise<void>;
}
