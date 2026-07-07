'use client';

import { Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { CardAssigneeAvatar } from '@/modules/boards/components/card-assignee-avatar.component';
import type { AssigneeState } from '@/modules/boards/types/board-state.type';
import type { BoardMember } from '@/modules/boards/api/members.api';
import { getMessage } from '@/shared/i18n';

type CardDetailAssigneesProps = {
  assignees: AssigneeState[];
  members: BoardMember[];
  onAssign: (userId: string) => void;
  onUnassign: (userId: string) => void;
};

/**
 * Seção de responsáveis do modal de detalhe: avatares atuais + popover de seleção a partir
 * dos membros do quadro (`BoardView.members`, sem nova busca HTTP), mesmo padrão visual do
 * `LabelPopover`.
 */
export function CardDetailAssignees({ assignees, members, onAssign, onUnassign }: CardDetailAssigneesProps) {
  const assignedIds = new Set(assignees.map((assignee) => assignee.id));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {getMessage('cardDetail.assignees.title')}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {assignees.map((assignee) => (
          <CardAssigneeAvatar key={assignee.id} id={assignee.id} name={assignee.name} className="size-8 text-xs" />
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={getMessage('cardDetail.assignees.addButton')}
              className="inline-flex size-8 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
              data-testid="card-detail-assignees-trigger"
            >
              <Plus className="size-4" />
            </button>
          </PopoverTrigger>

          <PopoverContent className="flex flex-col gap-2" data-testid="card-detail-assignees-content">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {getMessage('cardDetail.assignees.popoverTitle')}
            </p>

            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">{getMessage('cardDetail.assignees.emptyState')}</p>
            ) : (
              members
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((member) => {
                  const assigned = assignedIds.has(member.userId);
                  return (
                    <label
                      key={member.userId}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted"
                    >
                      <Checkbox
                        checked={assigned}
                        onCheckedChange={() => (assigned ? onUnassign(member.userId) : onAssign(member.userId))}
                        data-testid={`card-detail-assignee-checkbox-${member.userId}`}
                      />
                      <span className="text-sm">{member.name}</span>
                    </label>
                  );
                })
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
