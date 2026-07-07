'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { LabelChip } from '@/modules/boards/components/label-chip.component';
import { LabelPopover } from '@/modules/boards/components/label-popover.component';
import { CardDueBadge } from '@/modules/boards/components/card-due-badge.component';
import { CardAssigneeAvatar } from '@/modules/boards/components/card-assignee-avatar.component';
import type { CardState, LabelColor, LabelState } from '@/modules/boards/types/board-state.type';

type KanbanCardProps = {
  card: CardState;
  index: number;
  onRename: (cardId: string, title: string) => void;
  onDelete: (cardId: string) => void;
  boardLabels: LabelState[];
  onCreateLabel: (name: string, color: LabelColor) => void;
  onToggleLabel: (cardId: string, labelId: string, assigned: boolean) => void;
  onOpen: (cardId: string) => void;
  commentsCount: number;
  /** Cartão fora do filtro ativo (`019`): permanece no DOM/`Droppable`, mas atenuado. */
  isFilteredOut?: boolean;
};

/**
 * Um cartão arrastável do quadro kanban, com título editável inline, chips de etiqueta,
 * popover de atribuição de etiquetas, badges reais (prazo/checklist/responsáveis/comentários)
 * e exclusão com confirmação simples. Clicar no corpo do cartão (fora do título em edição e
 * dos botões de ação) abre o modal de detalhe (`onOpen`).
 */
export function KanbanCard({
  card,
  index,
  onRename,
  onDelete,
  boardLabels,
  onCreateLabel,
  onToggleLabel,
  onOpen,
  commentsCount,
  isFilteredOut = false,
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

  const checklistDone = card.checklist.filter((item) => item.done).length;
  const checklistTotal = card.checklist.length;

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => {
            if (isEditing) return;
            onOpen(card.id);
          }}
          className={`group flex flex-col gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2.5 text-[13.5px] shadow-[0_1px_2px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
          } ${isFilteredOut ? 'pointer-events-none opacity-40' : ''}`}
          data-testid="kanban-card"
          data-card-id={card.id}
          data-card-title={card.title}
          data-filtered-out={isFilteredOut ? 'true' : 'false'}
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
                onClick={(event) => event.stopPropagation()}
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
              <button
                type="button"
                className="flex-1 text-left"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {card.title}
              </button>
            )}

            <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
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

          {card.dueDate !== null ||
          checklistTotal > 0 ||
          commentsCount > 0 ||
          card.assignees.length > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {card.dueDate !== null ? <CardDueBadge dueDate={card.dueDate} /> : null}
                {checklistTotal > 0 ? (
                  <span
                    className={`inline-flex items-center gap-1 ${
                      checklistDone === checklistTotal ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                    data-testid="kanban-card-checklist-progress"
                  >
                    ✓ {checklistDone}/{checklistTotal}
                  </span>
                ) : null}
                {commentsCount > 0 ? (
                  <span className="inline-flex items-center gap-1" data-testid="kanban-card-comments-count">
                    <MessageSquare className="size-3.5" />
                    {commentsCount}
                  </span>
                ) : null}
              </div>

              {card.assignees.length > 0 ? (
                <div className="flex -space-x-1.5" data-testid="kanban-card-assignees">
                  {card.assignees.map((assignee) => (
                    <CardAssigneeAvatar
                      key={assignee.id}
                      id={assignee.id}
                      name={assignee.name}
                      className="border-2 border-background"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </Draggable>
  );
}
