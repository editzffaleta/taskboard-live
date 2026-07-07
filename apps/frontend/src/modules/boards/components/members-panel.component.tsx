'use client';

import { useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { StandardDialogContent } from '@/shared/components/ui/standard-dialog-content';
import { getMessage } from '@/shared/i18n';
import {
  addMember,
  listMembers,
  removeMember,
  type BoardMember,
} from '@/modules/boards/api/members.api';
import { BoardsApiError } from '@/modules/boards/api/boards.api';

type MembersPanelProps = {
  boardId: string;
  token: string | null;
  currentUserId: string | null;
  isOwner: boolean;
  members: BoardMember[];
  onMembersLoaded: (members: BoardMember[]) => void;
  onMemberRemoved: (userId: string) => void;
};

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }

  toast.error(getMessage('DEFAULT_API_ERROR'));
}

/**
 * Painel "Compartilhar" acessível pela toolbar do quadro: lista os membros atuais e,
 * para o owner, expõe convite por e-mail e remoção. A lista de membros é gerenciada pelo
 * `BoardView` (fonte de verdade única, atualizada também via `member.added` do socket).
 */
export function MembersPanel({
  boardId,
  token,
  currentUserId,
  isOwner,
  members,
  onMembersLoaded,
  onMemberRemoved,
}: MembersPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !token) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    listMembers(token, boardId)
      .then((result) => {
        if (cancelled) return;
        onMembersLoaded(result);
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
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token, boardId]);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !token) return;

    setInviting(true);

    try {
      const created = await addMember(token, boardId, trimmed);
      onMembersLoaded([...members.filter((member) => member.userId !== created.userId), created]);
      setEmail('');
      toast.success(getMessage('membersPanel.inviteSuccess'));
    } catch (error) {
      reportError(error);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!token) return;

    const confirmed = window.confirm(
      `${getMessage('membersPanel.removeConfirmTitle')}. ${getMessage('membersPanel.removeConfirmDescription')}`,
    );
    if (!confirmed) return;

    setRemovingUserId(userId);

    try {
      await removeMember(token, boardId, userId);
      onMemberRemoved(userId);
      toast.success(getMessage('membersPanel.removeSuccess'));
    } catch (error) {
      reportError(error);
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" data-testid="members-panel-trigger">
          <UserPlus className="size-4" />
          {getMessage('membersPanel.trigger')}
        </Button>
      </DialogTrigger>

      <StandardDialogContent
        title={getMessage('membersPanel.title')}
        description={getMessage('membersPanel.description')}
      >
        {isOwner ? (
          <form onSubmit={handleInvite} className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="members-panel-invite-email">{getMessage('membersPanel.inviteLabel')}</Label>
              <Input
                id="members-panel-invite-email"
                type="email"
                value={email}
                placeholder={getMessage('membersPanel.invitePlaceholder')}
                onChange={(event) => setEmail(event.target.value)}
                data-testid="members-panel-invite-email"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={inviting || !email.trim()}
              data-testid="members-panel-invite-submit"
            >
              {getMessage('membersPanel.inviteButton')}
            </Button>
          </form>
        ) : null}

        <ul className="space-y-2" aria-busy={loading}>
          {members.length === 0 ? (
            <li className="py-2 text-sm text-muted-foreground">{getMessage('membersPanel.emptyState')}</li>
          ) : (
            members
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2"
                  data-testid="members-panel-member"
                  data-member-email={member.email}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {member.name
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role === 'owner'
                        ? getMessage('membersPanel.roleOwner')
                        : getMessage('membersPanel.roleMember')}
                    </Badge>

                    {isOwner && member.role !== 'owner' && member.userId !== currentUserId ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={getMessage('membersPanel.removeButton')}
                        disabled={removingUserId === member.userId}
                        onClick={() => handleRemove(member.userId)}
                      >
                        <X className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))
          )}
        </ul>
      </StandardDialogContent>
    </Dialog>
  );
}
