'use client';

import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { DatePickerInput } from '@/shared/components/ui/date-picker-input';
import { CardDueBadge } from '@/modules/boards/components/card-due-badge.component';
import { getMessage } from '@/shared/i18n';

type CardDetailDueDateProps = {
  dueDate: string | null;
  onChange: (dueDate: string | null) => void;
};

/**
 * Seção de prazo do modal de detalhe: date picker + selo atrasado/hoje/futuro. Limpar o
 * prazo envia `dueDate: null`.
 */
export function CardDetailDueDate({ dueDate, onChange }: CardDetailDueDateProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {getMessage('cardDetail.due.title')}
      </p>

      <div className="flex items-center gap-2">
        <DatePickerInput
          value={dueDate ?? undefined}
          onChange={(value) => onChange(value)}
          placeholder={getMessage('cardDetail.due.placeholder')}
          className="w-auto"
        />
        {dueDate !== null ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={getMessage('cardDetail.due.clear')}
            onClick={() => onChange(null)}
            data-testid="card-detail-due-clear"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {dueDate !== null ? (
        <div className="text-xs">
          <CardDueBadge dueDate={dueDate} />
        </div>
      ) : null}
    </div>
  );
}
