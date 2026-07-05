'use client';

import { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { KanbanCard } from '@/modules/boards/components/kanban-card.component';
import type { ListState } from '@/modules/boards/types/board-state.type';

type KanbanColumnProps = {
  list: ListState;
  index: number;
  onRenameList: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onCreateCard: (listId: string, title: string) => void;
  onRenameCard: (cardId: string, title: string) => void;
  onDeleteCard: (cardId: string) => void;
};

/**
 * Uma coluna (lista) do quadro: título editável inline, cartões arrastáveis e input de
 * novo cartão no fim.
 */
export function KanbanColumn({
  list,
  index,
  onRenameList,
  onDeleteList,
  onCreateCard,
  onRenameCard,
  onDeleteCard,
}: KanbanColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  function commitRename() {
    const trimmed = title.trim();
    setIsEditingTitle(false);

    if (!trimmed || trimmed === list.title) {
      setTitle(list.title);
      return;
    }

    onRenameList(list.id, trimmed);
  }

  function handleDeleteList() {
    if (window.confirm(`Excluir a lista "${list.title}" e todos os seus cartões?`)) {
      onDeleteList(list.id);
    }
  }

  function handleCreateCard(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;

    onCreateCard(list.id, trimmed);
    setNewCardTitle('');
    setIsAddingCard(false);
  }

  const sortedCards = [...list.cards].sort((a, b) => a.position - b.position);

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex w-72 shrink-0 flex-col rounded-lg border border-border/70 bg-muted/40"
          data-testid="kanban-column"
          data-list-id={list.id}
          data-list-title={list.title}
        >
          <div
            {...provided.dragHandleProps}
            className="group flex items-center justify-between gap-2 px-3 py-2"
          >
            {isEditingTitle ? (
              <Input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitRename();
                  if (event.key === 'Escape') {
                    setTitle(list.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="h-8"
              />
            ) : (
              <button
                type="button"
                className="flex-1 text-left text-sm font-semibold"
                onClick={() => setIsEditingTitle(true)}
              >
                {list.title}
              </button>
            )}

            <button
              type="button"
              aria-label="Excluir lista"
              onClick={handleDeleteList}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <Droppable droppableId={list.id} type="CARD">
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={`flex min-h-16 flex-1 flex-col gap-2 px-2 pb-2 ${
                  dropSnapshot.isDraggingOver ? 'bg-primary/5' : ''
                }`}
              >
                {sortedCards.map((card, cardIndex) => (
                  <KanbanCard
                    key={card.id}
                    card={card}
                    index={cardIndex}
                    onRename={onRenameCard}
                    onDelete={onDeleteCard}
                  />
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          <div className="px-2 pb-2">
            {isAddingCard ? (
              <form onSubmit={handleCreateCard} className="flex flex-col gap-2">
                <Input
                  autoFocus
                  value={newCardTitle}
                  placeholder="Título do cartão"
                  onChange={(event) => setNewCardTitle(event.target.value)}
                  onBlur={() => {
                    if (!newCardTitle.trim()) setIsAddingCard(false);
                  }}
                  className="h-8"
                  data-testid="new-card-title"
                />
                <Button type="submit" size="sm" data-testid="new-card-submit">
                  Adicionar cartão
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setIsAddingCard(true)}
                data-testid="new-card-trigger"
              >
                <Plus className="size-4" />
                Novo cartão
              </Button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
