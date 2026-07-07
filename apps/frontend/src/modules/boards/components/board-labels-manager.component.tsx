'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { getMessage } from '@/shared/i18n';
import {
  BoardsApiError,
  createLabel,
  deleteLabel,
  listLabels,
  updateLabel,
  type LabelDto,
} from '@/modules/boards/api/boards.api';
import { LABEL_COLORS, type LabelColor } from '@/modules/boards/types/board-state.type';
import { labelColorClasses, labelColorSwatchClass } from '@/modules/boards/util/label-color.util';

type BoardLabelsManagerProps = {
  boardId: string;
  token: string | null;
};

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }
  toast.error(getMessage('DEFAULT_API_ERROR'));
}

/**
 * Gestão completa de etiquetas do quadro (`020`): lista com criar, editar (renomear/recolorir)
 * e excluir, consumindo os mesmos endpoints já expostos pela `016`
 * (`GET/POST /boards/:boardId/labels`, `PATCH/DELETE /boards/:boardId/labels/:id`). A `016`
 * só entregou criação/atribuição rápida no popover do cartão — esta é a tela dedicada de
 * gestão, mantida sincronizada com o quadro ao vivo via os mesmos eventos
 * `label.created`/`label.updated`/`label.deleted` (nenhuma emissão nova necessária aqui).
 */
export function BoardLabelsManager({ boardId, token }: BoardLabelsManagerProps) {
  const [labels, setLabels] = useState<LabelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<LabelColor>('blue');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<LabelColor>('blue');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listLabels(token, boardId)
      .then((result) => {
        if (cancelled) return;
        setLabels(result);
      })
      .catch((error) => {
        if (cancelled) return;
        reportError(error);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, boardId]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || !token) return;

    setCreating(true);
    try {
      const created = await createLabel(token, boardId, trimmed, newColor);
      setLabels((current) => [...current, created]);
      setNewName('');
      setNewColor('blue');
    } catch (error) {
      reportError(error);
    } finally {
      setCreating(false);
    }
  }

  function startEditing(label: LabelDto) {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName('');
  }

  async function handleSaveEdit(labelId: string) {
    const trimmed = editName.trim();
    if (!trimmed || !token) return;

    setSavingId(labelId);
    try {
      const updated = await updateLabel(token, boardId, labelId, { name: trimmed, color: editColor });
      setLabels((current) => current.map((label) => (label.id === labelId ? updated : label)));
      setEditingId(null);
    } catch (error) {
      reportError(error);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(labelId: string) {
    if (!token) return;

    setSavingId(labelId);
    try {
      await deleteLabel(token, boardId, labelId);
      setLabels((current) => current.filter((label) => label.id !== labelId));
    } catch (error) {
      reportError(error);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="board-labels-manager">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {getMessage('boardSettings.labels.listTitle')}
        </p>
      </div>

      <ul className="flex flex-col gap-1" aria-busy={loading}>
        {labels.length === 0 && !loading ? (
          <li className="py-2 text-sm text-muted-foreground">{getMessage('labelPopover.emptyState')}</li>
        ) : (
          labels.map((label) => (
            <li
              key={label.id}
              className="flex items-center gap-2 border-b border-border/70 py-2"
              data-testid="board-labels-manager-row"
            >
              {editingId === label.id ? (
                <>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="h-8 flex-1"
                    data-testid="board-labels-manager-edit-name"
                  />
                  <div className="flex flex-wrap gap-1">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={getMessage(`labelColor.${color}`)}
                        aria-pressed={editColor === color}
                        onClick={() => setEditColor(color)}
                        className={`size-5 rounded-full border-2 transition-transform ${labelColorSwatchClass(color)} ${
                          editColor === color ? 'scale-110 border-foreground' : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingId === label.id}
                    onClick={() => handleSaveEdit(label.id)}
                    data-testid="board-labels-manager-save"
                  >
                    {getMessage('boardSettings.labels.save')}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={cancelEditing}>
                    {getMessage('boardSettings.labels.cancel')}
                  </Button>
                </>
              ) : (
                <>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${labelColorClasses(label.color)}`}>
                    {label.name}
                  </span>
                  <span className="flex-1" />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={getMessage('boardSettings.labels.edit')}
                    onClick={() => startEditing(label)}
                    data-testid="board-labels-manager-edit"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={getMessage('boardSettings.labels.delete')}
                    disabled={savingId === label.id}
                    onClick={() => handleDelete(label.id)}
                    data-testid="board-labels-manager-delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </li>
          ))
        )}
      </ul>

      <form onSubmit={handleCreate} className="flex flex-col gap-2 border-t border-border pt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {getMessage('labelPopover.createTitle')}
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={getMessage('labelPopover.namePlaceholder')}
            className="h-9 flex-1"
            data-testid="board-labels-manager-new-name"
          />
          <Button type="submit" size="sm" disabled={creating} data-testid="board-labels-manager-new-submit">
            <Plus className="size-4" />
            {getMessage('boardSettings.labels.create')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LABEL_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={getMessage(`labelColor.${color}`)}
              aria-pressed={newColor === color}
              onClick={() => setNewColor(color)}
              className={`size-6 rounded-full border-2 transition-transform ${labelColorSwatchClass(color)} ${
                newColor === color ? 'scale-110 border-foreground' : 'border-transparent'
              }`}
              data-testid={`board-labels-manager-new-color-${color}`}
            />
          ))}
        </div>
      </form>
    </div>
  );
}
