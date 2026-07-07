/** Situação de prazo usada no filtro (independente da classificação visual do badge). */
export type DueFilter = 'late' | 'today' | 'next7days' | 'none';

/** Visão ativa do quadro (kanban é a padrão, inalterada em layout). */
export type BoardViewMode = 'kanban' | 'lista' | 'calendario';

/**
 * Estado de filtro do quadro: cada categoria é combinada com OU internamente e com E entre
 * categorias diferentes (ver `board-filter.util.ts`/`design.md` da `019`).
 */
export type BoardFilterState = {
  labelIds: string[];
  assigneeIds: string[];
  due: DueFilter[];
  search: string;
};

export const EMPTY_BOARD_FILTER: BoardFilterState = {
  labelIds: [],
  assigneeIds: [],
  due: [],
  search: '',
};
