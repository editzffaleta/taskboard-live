'use client';

import { useState } from 'react';
import { Archive, Copy, MoveRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { CardDetailMoveDialog } from '@/modules/boards/components/card-detail-move-dialog.component';
import { getMessage } from '@/shared/i18n';

type CardDetailActionsProps = {
  cardId: string;
  currentListId: string;
  boardLists: { id: string; title: string }[];
  onMoveCard: (cardId: string, toListId: string) => void;
  onCopyCard: (cardId: string) => void;
  onArchiveCard: (cardId: string) => void;
};

/**
 * Seção "Ações" da barra lateral (`033`), na ordem do mockup: Mover (abre diálogo de lista
 * destino, `008`), Copiar (`031`) e Arquivar (handler já existente da `022`, só reposicionado).
 */
export function CardDetailActions({
  cardId,
  currentListId,
  boardLists,
  onMoveCard,
  onCopyCard,
  onArchiveCard,
}: CardDetailActionsProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {getMessage('cardDetail.sidebar.actions')}
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-start gap-2"
        onClick={() => setMoveDialogOpen(true)}
        data-testid="card-detail-action-move"
      >
        <MoveRight className="size-4" />
        {getMessage('cardDetail.actions.move')}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-start gap-2"
        onClick={() => onCopyCard(cardId)}
        data-testid="card-detail-action-copy"
      >
        <Copy className="size-4" />
        {getMessage('cardDetail.actions.copy')}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-start gap-2 text-muted-foreground"
        onClick={() => onArchiveCard(cardId)}
        data-testid="card-detail-archive-button"
      >
        <Archive className="size-4" />
        {getMessage('cardDetail.archive.button')}
      </Button>

      <CardDetailMoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        boardLists={boardLists}
        currentListId={currentListId}
        onConfirm={(toListId) => onMoveCard(cardId, toListId)}
      />
    </div>
  );
}
