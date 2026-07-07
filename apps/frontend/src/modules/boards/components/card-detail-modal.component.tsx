'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Archive } from 'lucide-react';
import { LabelChip } from '@/modules/boards/components/label-chip.component';
import { LabelPopover } from '@/modules/boards/components/label-popover.component';
import { CardDetailDueDate } from '@/modules/boards/components/card-detail-due-date.component';
import { CardDetailAssignees } from '@/modules/boards/components/card-detail-assignees.component';
import { CardDetailChecklist } from '@/modules/boards/components/card-detail-checklist.component';
import { CardDetailComments } from '@/modules/boards/components/card-detail-comments.component';
import type { CommentDto } from '@/modules/boards/api/card-detail.api';
import type { CardState, LabelColor, LabelState } from '@/modules/boards/types/board-state.type';
import type { BoardMember } from '@/modules/boards/api/members.api';
import { getMessage } from '@/shared/i18n';

type CommentEvent =
  | { type: 'created'; comment: CommentDto }
  | { type: 'deleted'; commentId: string; cardId: string }
  | null;

type CardDetailModalProps = {
  card: CardState;
  boardId: string;
  token: string;
  boardLabels: LabelState[];
  members: BoardMember[];
  currentUserId: string | null;
  currentUserName: string;
  commentEvent: CommentEvent;
  onClose: () => void;
  onRenameTitle: (cardId: string, title: string) => void;
  onEditDescription: (cardId: string, description: string) => void;
  onCreateLabel: (name: string, color: LabelColor) => void;
  onToggleLabel: (cardId: string, labelId: string, assigned: boolean) => void;
  onSetDueDate: (cardId: string, dueDate: string | null) => void;
  onAssignUser: (cardId: string, userId: string) => void;
  onUnassignUser: (cardId: string, userId: string) => void;
  onAddChecklistItem: (cardId: string, text: string) => void;
  onToggleChecklistItem: (cardId: string, itemId: string, done: boolean) => void;
  onEditChecklistItem: (cardId: string, itemId: string, text: string) => void;
  onDeleteChecklistItem: (cardId: string, itemId: string) => void;
  onReorderChecklistItems: (cardId: string, itemIds: string[]) => void;
  onCommentsCountHydrated: (cardId: string, total: number) => void;
  onArchiveCard: (cardId: string) => void;
};

/**
 * Shell do modal de detalhe do cartão, reproduzindo fielmente o layout do mockup: título
 * editável, descrição, etiquetas, prazo, responsáveis, checklist e abas
 * "Detalhes"/"Comentários". Fecha em overlay click ou `Esc` (comportamento nativo do
 * `Dialog` do Radix, via `shared/components/ui/dialog`).
 */
export function CardDetailModal({
  card,
  boardId,
  token,
  boardLabels,
  members,
  currentUserId,
  currentUserName,
  commentEvent,
  onClose,
  onRenameTitle,
  onEditDescription,
  onCreateLabel,
  onToggleLabel,
  onSetDueDate,
  onAssignUser,
  onUnassignUser,
  onAddChecklistItem,
  onToggleChecklistItem,
  onEditChecklistItem,
  onDeleteChecklistItem,
  onReorderChecklistItems,
  onCommentsCountHydrated,
  onArchiveCard,
}: CardDetailModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  function commitTitle() {
    setIsEditingTitle(false);
    const trimmed = title.trim();
    if (!trimmed || trimmed === card.title) {
      setTitle(card.title);
      return;
    }
    onRenameTitle(card.id, trimmed);
  }

  function commitDescription() {
    if (description === (card.description ?? '')) return;
    onEditDescription(card.id, description);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[88vh] w-[min(940px,96vw)] max-w-none flex-col overflow-hidden p-0"
        data-testid="card-detail-modal"
      >
        <div className="h-1.5 shrink-0 bg-primary" />

        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden md:flex-row">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <DialogTitle asChild>
              {isEditingTitle ? (
                <Input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitTitle();
                    if (event.key === 'Escape') {
                      setTitle(card.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="h-10 text-xl font-bold"
                  data-testid="card-detail-title-input"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="text-left text-xl font-bold leading-snug tracking-tight"
                  data-testid="card-detail-title"
                >
                  {card.title}
                </button>
              )}
            </DialogTitle>

            <div className="mt-6 flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {getMessage('cardDetail.description.title')}
              </p>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={commitDescription}
                placeholder={getMessage('cardDetail.description.placeholder')}
                data-testid="card-detail-description"
              />
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {getMessage('cardDetail.labels.title')}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {card.labels.map((label) => (
                  <LabelChip key={label.id} label={label} />
                ))}
                <LabelPopover
                  cardId={card.id}
                  cardLabels={card.labels}
                  boardLabels={boardLabels}
                  onCreateLabel={onCreateLabel}
                  onToggleLabel={onToggleLabel}
                />
              </div>
            </div>

            <div className="mt-6">
              <CardDetailChecklist
                checklist={card.checklist}
                onAddItem={(text) => onAddChecklistItem(card.id, text)}
                onToggleItem={(itemId, done) => onToggleChecklistItem(card.id, itemId, done)}
                onEditItem={(itemId, text) => onEditChecklistItem(card.id, itemId, text)}
                onDeleteItem={(itemId) => onDeleteChecklistItem(card.id, itemId)}
                onReorderItems={(itemIds) => onReorderChecklistItems(card.id, itemIds)}
              />
            </div>

            <Tabs defaultValue="comments" className="mt-6">
              <TabsList>
                <TabsTrigger value="comments" data-testid="card-detail-tab-comments">
                  {getMessage('cardDetail.tabs.comments')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments">
                <CardDetailComments
                  token={token}
                  boardId={boardId}
                  cardId={card.id}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  commentEvent={commentEvent}
                  onCommentsCountHydrated={onCommentsCountHydrated}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-t border-border bg-muted/30 px-5 py-5 md:w-60 md:border-l md:border-t-0">
            <CardDetailAssignees
              assignees={card.assignees}
              members={members}
              onAssign={(userId) => onAssignUser(card.id, userId)}
              onUnassign={(userId) => onUnassignUser(card.id, userId)}
            />

            <CardDetailDueDate dueDate={card.dueDate} onChange={(dueDate) => onSetDueDate(card.id, dueDate)} />

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-auto justify-start gap-2 text-muted-foreground"
              onClick={() => onArchiveCard(card.id)}
              data-testid="card-detail-archive-button"
            >
              <Archive className="size-4" />
              {getMessage('cardDetail.archive.button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
