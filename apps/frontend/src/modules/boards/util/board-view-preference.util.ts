import { EMPTY_BOARD_FILTER, type BoardFilterState, type BoardViewMode } from '@/modules/boards/types/board-filter.type';

export type BoardViewPreference = {
  filters: BoardFilterState;
  activeView: BoardViewMode;
};

const DEFAULT_PREFERENCE: BoardViewPreference = {
  filters: EMPTY_BOARD_FILTER,
  activeView: 'kanban',
};

function storageKey(boardId: string): string {
  return `taskboard:board-view:${boardId}`;
}

function isBoardViewMode(value: unknown): value is BoardViewMode {
  return value === 'kanban' || value === 'lista' || value === 'calendario';
}

function isBoardFilterState(value: unknown): value is BoardFilterState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.labelIds) &&
    Array.isArray(candidate.assigneeIds) &&
    Array.isArray(candidate.due) &&
    typeof candidate.search === 'string'
  );
}

/**
 * Lê a preferência de visão/filtro por quadro do `localStorage`. Nunca lança: qualquer erro
 * (SSR, modo anônimo, quota, JSON inválido) cai no padrão (`kanban`, filtros vazios).
 */
export function loadBoardViewPreference(boardId: string): BoardViewPreference {
  try {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCE;

    const raw = window.localStorage.getItem(storageKey(boardId));
    if (!raw) return DEFAULT_PREFERENCE;

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCE;

    const candidate = parsed as Record<string, unknown>;
    const activeView = isBoardViewMode(candidate.activeView) ? candidate.activeView : 'kanban';
    const filters = isBoardFilterState(candidate.filters) ? candidate.filters : EMPTY_BOARD_FILTER;

    return { activeView, filters };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/** Persiste a preferência de visão/filtro por quadro. Nunca lança. */
export function saveBoardViewPreference(boardId: string, value: BoardViewPreference): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey(boardId), JSON.stringify(value));
  } catch {
    // Silencioso: modo anônimo/quota não pode quebrar a UI.
  }
}
