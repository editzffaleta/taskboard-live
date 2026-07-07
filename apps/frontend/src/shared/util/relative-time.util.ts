import { getMessage } from '@/shared/i18n';

/**
 * Formata o tempo relativo entre `isoDate` (ex.: `archivedAt`) e agora, em dias/semanas
 * (`022` — tela Arquivados). Cálculo manual, sem biblioteca nova, conforme `design.md`.
 */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const then = new Date(isoDate).getTime();
  const diffMs = now.getTime() - then;
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays <= 0) {
    return getMessage('archived.time.today');
  }

  if (diffDays < 7) {
    return diffDays === 1
      ? getMessage('archived.time.oneDay')
      : getMessage('archived.time.days', { params: { count: diffDays } });
  }

  const diffWeeks = Math.floor(diffDays / 7);
  return diffWeeks === 1
    ? getMessage('archived.time.oneWeek')
    : getMessage('archived.time.weeks', { params: { count: diffWeeks } });
}
