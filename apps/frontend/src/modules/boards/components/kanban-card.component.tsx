'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Trash2 } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { LabelChip } from '@/modules/boards/components/label-chip.component';
import { LabelPopover } from '@/modules/boards/components/label-popover.component';
import type { CardState, LabelColor, LabelState } from '@/modules/boards/types/board-state.type';

type KanbanCardProps = {
  card: CardState;
  index: number;
  onRename: (cardId: string, title: string) => void;
  onDelete: (cardId: string) => void;
  boardLabels: LabelState[];
  onCreateLabel: (name: string, color: LabelColor) => void;
  onToggleLabel: (cardId: string, labelId: string, assigned: boolean) => void;
};

/**
 * Um cartão arrastável do quadro kanban, com título editável inline, chips de etiqueta,
 * popover de atribuição de etiquetas e exclusão com confirmação simples.
 */
export function KanbanCard({
  card,
  index,
  onRename,
  onDelete,
  boardLabels,
  onCreateLabel,
  onToggleLabel,
}: KanbanCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);

  function commitRename() {
    const trimmed = title.trim();
    setIsEditing(false);

    if (!trimmed || trimmed === card.title) {
      setTitle(card.title);
      return;
    }

    onRename(card.id, trimmed);
  }

  function handleDelete() {
    if (window.confirm('Excluir este cartão?')) {
      onDelete(card.id);
    }
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group flex flex-col gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2.5 text-[13.5px] shadow-[0_1px_2px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
          }`}
          data-testid="kanban-card"
          data-card-id={card.id}
          data-card-title={card.title}
        >
          {card.labels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" data-testid="kanban-card-labels">
              {card.labels.map((label) => (
                <LabelChip key={label.id} label={label} />
              ))}
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-2">
            {isEditing ? (
              <Input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitRename();
                  if (event.key === 'Escape') {
                    setTitle(card.title);
                    setIsEditing(false);
                  }
                }}
                className="h-8"
              />
            ) : (
              <button type="button" className="flex-1 text-left" onClick={() => setIsEditing(true)}>
                {card.title}
              </button>
            )}

            <div className="flex items-center gap-1">
              <LabelPopover
                cardId={card.id}
                cardLabels={card.labels}
                boardLabels={boardLabels}
                onCreateLabel={onCreateLabel}
                onToggleLabel={onToggleLabel}
              />

              <button
                type="button"
                aria-label="Excluir cartão"
                onClick={handleDelete}
                className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
