'use client';

import { useState } from 'react';
import { Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { getMessage } from '@/shared/i18n';
import {
  LABEL_COLORS,
  type LabelColor,
  type LabelState,
} from '@/modules/boards/types/board-state.type';
import { labelColorClasses, labelColorSwatchClass } from '@/modules/boards/util/label-color.util';

type LabelPopoverProps = {
  cardId: string;
  cardLabels: LabelState[];
  boardLabels: LabelState[];
  onCreateLabel: (name: string, color: LabelColor) => void;
  onToggleLabel: (cardId: string, labelId: string, assigned: boolean) => void;
};

/**
 * Popover mínimo de etiquetas acessível a partir do cartão: lista as etiquetas do quadro com
 * checkbox de atribuído/não atribuído e um campo de criação rápida (nome + cor). A gestão
 * completa (renomear/recolorir/excluir etiqueta) fica para a tela de "Configurações do Quadro"
 * (change `020`) — aqui só criação e atribuição.
 */
export function LabelPopover({
  cardId,
  cardLabels,
  boardLabels,
  onCreateLabel,
  onToggleLabel,
}: LabelPopoverProps) {
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState<LabelColor>('blue');

  const assignedIds = new Set(cardLabels.map((label) => label.id));

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newLabelName.trim();
    if (!trimmed) return;

    onCreateLabel(trimmed, newLabelColor);
    setNewLabelName('');
    setNewLabelColor('blue');
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={getMessage('labelPopover.trigger')}
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          data-testid="label-popover-trigger"
        >
          <Tag className="size-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="flex flex-col gap-3" data-testid="label-popover-content">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {getMessage('labelPopover.title')}
        </p>

        <div className="flex flex-col gap-1.5">
          {boardLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground">{getMessage('labelPopover.emptyState')}</p>
          ) : (
            boardLabels.map((label) => {
              const assigned = assignedIds.has(label.id);
              return (
                <label
                  key={label.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted"
                >
                  <Checkbox
                    checked={assigned}
                    onCheckedChange={() => onToggleLabel(cardId, label.id, assigned)}
                    data-testid={`label-checkbox-${label.id}`}
                  />
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${labelColorClasses(label.color)}`}
                  >
                    {label.name}
                  </span>
                </label>
              );
            })
          )}
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {getMessage('labelPopover.createTitle')}
          </p>

          <Input
            value={newLabelName}
            onChange={(event) => setNewLabelName(event.target.value)}
            placeholder={getMessage('labelPopover.namePlaceholder')}
            className="h-8"
            data-testid="new-label-name"
          />

          <div className="flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={getMessage(`labelColor.${color}`)}
                aria-pressed={newLabelColor === color}
                onClick={() => setNewLabelColor(color)}
                className={`size-6 rounded-full border-2 transition-transform ${labelColorSwatchClass(color)} ${
                  newLabelColor === color ? 'scale-110 border-foreground' : 'border-transparent'
                }`}
                data-testid={`new-label-color-${color}`}
              />
            ))}
          </div>

          <Button type="submit" size="sm" data-testid="new-label-submit">
            {getMessage('labelPopover.createButton')}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
