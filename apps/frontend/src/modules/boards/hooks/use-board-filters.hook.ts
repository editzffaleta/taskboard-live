import { useMemo } from 'react';
import { matchesFilter } from '@/modules/boards/util/board-filter.util';
import type { BoardState, CardState } from '@/modules/boards/types/board-state.type';
import type { BoardFilterState } from '@/modules/boards/types/board-filter.type';

export type FilteredCard = CardState & { listId: string; listTitle: string };

export type UseBoardFiltersResult = {
  /** Ids dos cartões que satisfazem o filtro — usado pela visão Kanban para atenuar o resto. */
  visibleCardIds: Set<string>;
  /** Cartões visíveis já achatados, com a lista de origem anexada — usado por Lista/Calendário. */
  filteredCards: FilteredCard[];
};

/**
 * Deriva, a partir do `BoardState` (já reconciliado ao vivo pelo socket) e do filtro ativo, o
 * conjunto de cartões visíveis. Um hook só, reaproveitado pelas três visões — nenhum estado
 * intermediário "congelado": recalcula a cada render de `board`/`filters`.
 */
export function useBoardFilters(board: BoardState, filters: BoardFilterState): UseBoardFiltersResult {
  return useMemo(() => {
    const filteredCards: FilteredCard[] = [];
    const visibleCardIds = new Set<string>();

    for (const list of board.lists) {
      for (const card of list.cards) {
        if (matchesFilter(card, filters)) {
          visibleCardIds.add(card.id);
          filteredCards.push({ ...card, listId: list.id, listTitle: list.title });
        }
      }
    }

    return { visibleCardIds, filteredCards };
  }, [board, filters]);
}
