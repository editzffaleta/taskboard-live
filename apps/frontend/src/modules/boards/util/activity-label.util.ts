import { getMessage } from '@/shared/i18n';
import type { Activity } from '@/modules/boards/api/activity.api';
import type { BoardMember } from '@/modules/boards/api/members.api';

/** Catálogo de `type` com rótulo i18n mapeado (ver `design.md` da 011). */
const KNOWN_ACTIVITY_TYPES = new Set([
  'list.created',
  'list.updated',
  'list.moved',
  'list.deleted',
  'card.created',
  'card.updated',
  'card.moved',
  'card.deleted',
  'member.added',
]);

function resolveActor(actorId: string, members: BoardMember[]): string {
  const member = members.find((candidate) => candidate.userId === actorId);
  return member?.name ?? getMessage('activityPanel.unknownActor');
}

/**
 * Mapeia `type` para a chave i18n `activity.type.<type>`, com fallback genérico
 * (`activity.type.fallback`) para tipos desconhecidos — evita quebra na UI quando um
 * novo `type` é introduzido sem tradução correspondente.
 */
export function formatActivityLabel(activity: Activity, members: BoardMember[]): string {
  const actor = resolveActor(activity.actorId, members);
  const data = activity.data ?? {};

  const params: Record<string, string> = { actor };
  if (typeof data.title === 'string') params.title = data.title;
  if (typeof data.name === 'string') params.name = data.name;

  if (KNOWN_ACTIVITY_TYPES.has(activity.type)) {
    return getMessage(`activity.type.${activity.type}`, { params });
  }

  return getMessage('activity.type.fallback', { params });
}

const RELATIVE_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.34524, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];

export function formatRelativeTime(isoDate: string, locale: string): string {
  const date = new Date(isoDate);
  let duration = (date.getTime() - Date.now()) / 1000;

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const division of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return formatter.format(Math.round(duration), 'years');
}
