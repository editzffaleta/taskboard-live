'use client';

import type { KeyboardEvent } from 'react';
import { CardDueBadge } from '@/modules/boards/components/card-due-badge.component';
import { CardAssigneeAvatar } from '@/modules/boards/components/card-assignee-avatar.component';
import { LabelChip } from '@/modules/boards/components/label-chip.component';
import { getMessage } from '@/shared/i18n';
import type { FilteredCard } from '@/modules/boards/hooks/use-board-filters.hook';

type BoardViewListProps = {
  filteredCards: FilteredCard[];
  onOpenCard: (cardId: string) => void;
};

/**
 * Visão Lista: tabela semântica agrupando os cartões visíveis por lista de origem, colunas
 * Cartão/Lista/Responsáveis/Etiquetas/Prazo (`019`). Sem drag-and-drop — clique numa linha abre
 * o mesmo `CardDetailModal` de `018`.
 */
export function BoardViewList({ filteredCards, onOpenCard }: BoardViewListProps) {
  const sortedCards = [...filteredCards].sort((a, b) => {
    if (a.listTitle !== b.listTitle) return a.listTitle.localeCompare(b.listTitle);
    return a.position - b.position;
  });

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, cardId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenCard(cardId);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-4 md:p-6" data-testid="board-view-list">
      <div className="min-w-[720px] overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <table className="w-full border-collapse text-left">
          <colgroup>
            <col style={{ width: '40%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">{getMessage('boardViews.list.card')}</th>
              <th className="px-4 py-2.5">{getMessage('boardViews.list.list')}</th>
              <th className="px-4 py-2.5">{getMessage('boardViews.list.assignees')}</th>
              <th className="px-4 py-2.5">{getMessage('boardViews.list.labels')}</th>
              <th className="px-4 py-2.5">{getMessage('boardViews.list.dueDate')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedCards.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {getMessage('boardViews.emptyState')}
                </td>
              </tr>
            ) : (
              sortedCards.map((card) => (
                <tr
                  key={card.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => onOpenCard(card.id)}
                  onKeyDown={(event) => handleRowKeyDown(event, card.id)}
                  className="cursor-pointer border-b border-border text-[13.5px] last:border-b-0 hover:bg-muted/40"
                  data-testid="board-view-list-row"
                  data-card-id={card.id}
                >
                  <td className="truncate px-4 py-3 font-medium">{card.title}</td>
                  <td className="truncate px-4 py-3 text-[12.5px] text-muted-foreground">{card.listTitle}</td>
                  <td className="px-4 py-3">
                    <span className="flex -space-x-1.5">
                      {card.assignees.map((assignee) => (
                        <CardAssigneeAvatar
                          key={assignee.id}
                          id={assignee.id}
                          name={assignee.name}
                          className="border-2 border-background"
                        />
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {card.labels.map((label) => (
                        <LabelChip key={label.id} label={label} />
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                    {card.dueDate !== null ? <CardDueBadge dueDate={card.dueDate} /> : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
