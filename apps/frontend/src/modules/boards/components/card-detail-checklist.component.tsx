'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import type { ChecklistItemState } from '@/modules/boards/types/board-state.type';
import { getMessage } from '@/shared/i18n';

type CardDetailChecklistProps = {
  checklist: ChecklistItemState[];
  onAddItem: (text: string) => void;
  onToggleItem: (itemId: string, done: boolean) => void;
  onEditItem: (itemId: string, text: string) => void;
  onDeleteItem: (itemId: string) => void;
  onReorderItems: (itemIds: string[]) => void;
};

/** Handle exposto via `ref` para o atalho "Checklist" da seção "Adicionar ao cartão" (`033`). */
export type CardDetailChecklistHandle = {
  focusNewItemInput: () => void;
};

/**
 * Seção de checklist do modal de detalhe: barra de progresso (`done/total`, só renderiza se
 * `total > 0`), lista de itens com toggle/editar/excluir e reordenação via `@hello-pangea/dnd`.
 */
export const CardDetailChecklist = forwardRef<CardDetailChecklistHandle, CardDetailChecklistProps>(
  function CardDetailChecklist(
    { checklist, onAddItem, onToggleItem, onEditItem, onDeleteItem, onReorderItems },
    ref,
  ) {
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const newItemInputRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(ref, () => ({
    focusNewItemInput: () => newItemInputRef.current?.focus(),
  }));

  const sorted = [...checklist].sort((a, b) => a.position - b.position);
  const done = sorted.filter((item) => item.done).length;
  const total = sorted.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;

    onAddItem(trimmed);
    setNewItemText('');
  }

  function startEdit(item: ChecklistItemState) {
    setEditingItemId(item.id);
    setEditingText(item.text);
  }

  function commitEdit() {
    const trimmed = editingText.trim();
    if (editingItemId && trimmed) {
      onEditItem(editingItemId, trimmed);
    }
    setEditingItemId(null);
    setEditingText('');
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    onReorderItems(reordered.map((item) => item.id));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {getMessage('cardDetail.checklist.title')}
        </p>
        {total > 0 ? (
          <span className="text-xs font-semibold text-muted-foreground">
            {done}/{total}
          </span>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="flex items-center gap-2">
          <span className="w-9 text-[11px] font-semibold text-muted-foreground">{percent}%</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="card-detail-checklist" type="CHECKLIST_ITEM">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-1">
              {sorted.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted"
                      data-testid="card-detail-checklist-item"
                      data-item-id={item.id}
                    >
                      <span
                        {...dragProvided.dragHandleProps}
                        className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100"
                      >
                        <GripVertical className="size-4" />
                      </span>

                      <Checkbox
                        checked={item.done}
                        onCheckedChange={() => onToggleItem(item.id, !item.done)}
                        data-testid={`card-detail-checklist-toggle-${item.id}`}
                      />

                      {editingItemId === item.id ? (
                        <Input
                          autoFocus
                          value={editingText}
                          onChange={(event) => setEditingText(event.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') commitEdit();
                            if (event.key === 'Escape') {
                              setEditingItemId(null);
                              setEditingText('');
                            }
                          }}
                          className="h-7 flex-1"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className={`flex-1 text-left text-sm ${item.done ? 'text-muted-foreground line-through' : ''}`}
                        >
                          {item.text}
                        </button>
                      )}

                      <button
                        type="button"
                        aria-label={getMessage('cardDetail.checklist.deleteItem')}
                        onClick={() => onDeleteItem(item.id)}
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          ref={newItemInputRef}
          value={newItemText}
          onChange={(event) => setNewItemText(event.target.value)}
          placeholder={getMessage('cardDetail.checklist.addPlaceholder')}
          className="h-8"
          data-testid="card-detail-checklist-new-item"
        />
        <Button type="submit" size="sm" variant="secondary" data-testid="card-detail-checklist-add">
          <Plus className="size-4" />
          {getMessage('cardDetail.checklist.addButton')}
        </Button>
      </form>
    </div>
  );
  },
);
