import { classifyDueDate } from '@/modules/boards/util/due-date.util';
import type { CardState } from '@/modules/boards/types/board-state.type';
import type { BoardFilterState, DueFilter } from '@/modules/boards/types/board-filter.type';

function toCivilDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Remove diacríticos e normaliza para minúsculas — usado na busca textual por título, sem
 * depender de `Intl` pesado.
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Verifica se um `dueDate` satisfaz uma opção de filtro de prazo (`late`/`today`/`next7days`/
 * `none`). Reaproveita `classifyDueDate` (`018`) para as classificações base; `next7days` é
 * `upcoming` com diferença de 1 a 7 dias civis; `none` é `dueDate === null`.
 */
export function matchesDue(dueDate: string | null, due: DueFilter, now: Date = new Date()): boolean {
  if (due === 'none') return dueDate === null;

  const status = classifyDueDate(dueDate, now);
  if (due === 'late') return status === 'late';
  if (due === 'today') return status === 'today';

  // 'next7days'
  if (status !== 'upcoming' || !dueDate) return false;
  const today = toCivilDate(now);
  const target = toCivilDate(new Date(dueDate));
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 1 && diffDays <= 7;
}

/**
 * Predicado puro de filtragem: E lógico entre categorias (etiqueta/responsável/prazo/busca),
 * OU lógico dentro de cada categoria. Categorias vazias não restringem nada.
 */
export function matchesFilter(card: CardState, filters: BoardFilterState, now: Date = new Date()): boolean {
  if (filters.labelIds.length > 0 && !card.labels.some((label) => filters.labelIds.includes(label.id))) {
    return false;
  }

  if (
    filters.assigneeIds.length > 0 &&
    !card.assignees.some((assignee) => filters.assigneeIds.includes(assignee.id))
  ) {
    return false;
  }

  if (filters.due.length > 0 && !filters.due.some((due) => matchesDue(card.dueDate, due, now))) {
    return false;
  }

  if (filters.search.trim() !== '' && !normalize(card.title).includes(normalize(filters.search))) {
    return false;
  }

  return true;
}

/** Conta categorias de filtro ativas (uma por grupo, não por item individual). */
export function countActiveFilters(filters: BoardFilterState): number {
  let count = 0;
  if (filters.labelIds.length > 0) count += 1;
  if (filters.assigneeIds.length > 0) count += 1;
  if (filters.due.length > 0) count += 1;
  if (filters.search.trim() !== '') count += 1;
  return count;
}
