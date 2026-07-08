'use client';

import { CheckSquare, ImagePlus, Paperclip } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { CardDetailCoverPicker } from '@/modules/boards/components/card-detail-cover-picker.component';
import type { LabelColor } from '@/modules/boards/types/board-state.type';
import { getMessage } from '@/shared/i18n';

type CardDetailAddToCardProps = {
  onFocusChecklist: () => void;
  onRequestAttach: () => void;
  onSetCardCover: (color: LabelColor | null) => void;
};

/**
 * Seção "Adicionar ao cartão" da barra lateral (`033`), na ordem do mockup: Checklist (foca o
 * campo de novo item), Anexo (dispara o seletor de arquivo já existente da `032`) e Capa (abre
 * o popover de cor, `031`) — nenhum dos três duplica lógica já existente.
 */
export function CardDetailAddToCard({
  onFocusChecklist,
  onRequestAttach,
  onSetCardCover,
}: CardDetailAddToCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {getMessage('cardDetail.sidebar.addToCard')}
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-start gap-2"
        onClick={onFocusChecklist}
        data-testid="card-detail-add-checklist"
      >
        <CheckSquare className="size-4" />
        {getMessage('cardDetail.addToCard.checklist')}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-start gap-2"
        onClick={onRequestAttach}
        data-testid="card-detail-add-attachment"
      >
        <Paperclip className="size-4" />
        {getMessage('cardDetail.addToCard.attachment')}
      </Button>

      <CardDetailCoverPicker onSelect={onSetCardCover}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start gap-2"
          data-testid="card-detail-add-cover"
        >
          <ImagePlus className="size-4" />
          {getMessage('cardDetail.addToCard.cover')}
        </Button>
      </CardDetailCoverPicker>
    </div>
  );
}
