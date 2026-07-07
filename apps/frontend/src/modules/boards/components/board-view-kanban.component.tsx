'use client';

import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from '@/modules/boards/components/kanban-column.component';
import type { ListState, LabelColor, LabelState } from '@/modules/boards/types/board-state.type';

type BoardViewKanbanProps = {
  sortedLists: ListState[];
  visibleCardIds: Set<string>;
  onDragEnd: (result: DropResult) => void;
  onRenameList: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onCreateCard: (listId: string, title: string) => void;
  onRenameCard: (cardId: string, title: string) => void;
  onDeleteCard: (cardId: string) => void;
  boardLabels: LabelState[];
  onCreateLabel: (name: string, color: LabelColor) => void;
  onToggleLabel: (cardId: string, labelId: string, assigned: boolean) => void;
  onOpenCard: (cardId: string) => void;
  commentsCountByCardId: Record<string, number>;
};

/**
 * Extração do layout Kanban original (`DragDropContext`/`Droppable`/`KanbanColumn`), sem
 * mudança de comportamento de drag-and-drop — só uma casa para caber ao lado das visões
 * Lista/Calendário (`019`). Cartões fora de `visibleCardIds` são repassados com
 * `isFilteredOut` para o `KanbanColumn` atenuar sem esconder a coluna.
 */
export function BoardViewKanban({
  sortedLists,
  visibleCardIds,
  onDragEnd,
  onRenameList,
  onDeleteList,
  onCreateCard,
  onRenameCard,
  onDeleteCard,
  boardLabels,
  onCreateLabel,
  onToggleLabel,
  onOpenCard,
  commentsCountByCardId,
}: BoardViewKanbanProps) {
  return (
    <div className="min-h-0 flex-1 overflow-x-auto">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="LIST">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex h-full items-start gap-3.5 pb-2"
            >
              {sortedLists.map((list, index) => (
                <KanbanColumn
                  key={list.id}
                  list={list}
                  index={index}
                  visibleCardIds={visibleCardIds}
                  onRenameList={onRenameList}
                  onDeleteList={onDeleteList}
                  onCreateCard={onCreateCard}
                  onRenameCard={onRenameCard}
                  onDeleteCard={onDeleteCard}
                  boardLabels={boardLabels}
                  onCreateLabel={onCreateLabel}
                  onToggleLabel={onToggleLabel}
                  onOpenCard={onOpenCard}
                  commentsCountByCardId={commentsCountByCardId}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
