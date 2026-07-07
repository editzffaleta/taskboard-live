import { getMessage } from '@/shared/i18n';
import type { NotificationDto } from '@/modules/notifications/api/notifications.api';

/** Catálogo de `type` com rótulo i18n mapeado (ver `design.md` da 024). */
const KNOWN_NOTIFICATION_TYPES = new Set(['member.added.you', 'card.assigned.you', 'comment.added']);

export type NotificationIconKind = 'member' | 'assignment' | 'comment' | 'fallback';

/** Mapeia `type` para o ícone exibido no dropdown (visual inspirado no mockup `Notificacoes.dc.html`). */
export function resolveNotificationIcon(type: string): NotificationIconKind {
  switch (type) {
    case 'member.added.you':
      return 'member';
    case 'card.assigned.you':
      return 'assignment';
    case 'comment.added':
      return 'comment';
    default:
      return 'fallback';
  }
}

/**
 * Mapeia `type` para a chave i18n `notification.type.<type>`, interpolando os campos de
 * `data` relevantes para cada tipo, com fallback genérico (`notification.type.fallback`)
 * para tipos desconhecidos — mesmo princípio de `formatActivityLabel` (`011`).
 */
export function formatNotificationLabel(notification: NotificationDto): string {
  const data = notification.data ?? {};

  const params: Record<string, string> = {};
  if (typeof data.boardName === 'string') params.boardName = data.boardName;
  if (typeof data.cardTitle === 'string') params.cardTitle = data.cardTitle;
  if (typeof data.addedByName === 'string') params.addedByName = data.addedByName;
  if (typeof data.assignedByName === 'string') params.assignedByName = data.assignedByName;
  if (typeof data.authorName === 'string') params.authorName = data.authorName;

  if (KNOWN_NOTIFICATION_TYPES.has(notification.type)) {
    return getMessage(`notification.type.${notification.type}`, { params });
  }

  return getMessage('notification.type.fallback', { params });
}

/** Resolve a rota do recurso indicado pela notificação (deep-link `?card=` da `023`). */
export function resolveNotificationHref(notification: NotificationDto): string | null {
  const data = notification.data ?? {};
  const boardId = typeof data.boardId === 'string' ? data.boardId : null;
  if (!boardId) return null;

  const cardId = typeof data.cardId === 'string' ? data.cardId : null;
  return cardId ? `/boards/${boardId}?card=${cardId}` : `/boards/${boardId}`;
}
