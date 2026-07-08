'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { getMessage } from '@/shared/i18n';

type CardDetailMoveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardLists: { id: string; title: string }[];
  currentListId: string;
  onConfirm: (toListId: string) => void;
};

/**
 * Diálogo simples de "Mover" (`033`): lista/`select` das listas do quadro, confirmar chama
 * `onConfirm(toListId)` (incluindo a lista atual, selecioná-la de novo é um no-op tolerado).
 */
export function CardDetailMoveDialog({
  open,
  onOpenChange,
  boardLists,
  currentListId,
  onConfirm,
}: CardDetailMoveDialogProps) {
  const [toListId, setToListId] = useState(currentListId);

  function handleConfirm() {
    onConfirm(toListId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="card-detail-move-dialog">
        <DialogTitle>{getMessage('cardDetail.moveDialog.title')}</DialogTitle>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {getMessage('cardDetail.moveDialog.listLabel')}
          </span>
          <select
            value={toListId}
            onChange={(event) => setToListId(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            data-testid="card-detail-move-dialog-select"
          >
            {boardLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {getMessage('cardDetail.moveDialog.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} data-testid="card-detail-move-dialog-confirm">
            {getMessage('cardDetail.moveDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
