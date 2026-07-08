'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Button } from '@/shared/components/ui/button';
import { LABEL_COLORS, type LabelColor } from '@/modules/boards/types/board-state.type';
import { labelColorSwatchClass } from '@/modules/boards/util/label-color.util';
import { getMessage } from '@/shared/i18n';

type CardDetailCoverPickerProps = {
  onSelect: (color: LabelColor | null) => void;
  children: React.ReactNode;
};

/**
 * Popover de seleção de cor da capa (`033`), reaproveitando a paleta fechada `LABEL_COLORS`
 * (mesmo mapeamento de `label-popover.component.tsx`/`016`). Sem input livre de cor — só as 7
 * cores da paleta e a opção "Nenhuma" para limpar.
 */
export function CardDetailCoverPicker({ onSelect, children }: CardDetailCoverPickerProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(color: LabelColor | null) {
    onSelect(color);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent className="flex flex-col gap-3" data-testid="card-detail-cover-picker">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {getMessage('cardDetail.cover.title')}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {LABEL_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={getMessage(`labelColor.${color}`)}
              onClick={() => handleSelect(color)}
              className={`size-8 rounded-md border-2 border-transparent transition-transform hover:scale-105 ${labelColorSwatchClass(color)}`}
              data-testid={`card-detail-cover-color-${color}`}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleSelect(null)}
          data-testid="card-detail-cover-none"
        >
          {getMessage('cardDetail.cover.none')}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
