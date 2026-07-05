'use client';

import { useState } from 'react';
import { Plus, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { BoardPresence } from '@/modules/boards/components/board-presence.component';
import { MembersPanel } from '@/modules/boards/components/members-panel.component';
import { ActivityPanel } from '@/modules/boards/components/activity-panel.component';
import type { BoardMember } from '@/modules/boards/api/members.api';
import type { Activity } from '@/modules/boards/api/activity.api';
import type { PresenceUser } from '@/hooks/use-board-socket';

type ActivityPageResult = { items: Activity[]; hasMore: boolean };

type BoardToolbarProps = {
  boardId: string;
  boardName: string;
  connected: boolean;
  presenceUsers: PresenceUser[];
  onCreateList: (title: string) => void;
  token: string | null;
  currentUserId: string | null;
  isOwner: boolean;
  members: BoardMember[];
  onMembersLoaded: (members: BoardMember[]) => void;
  onMemberRemoved: (userId: string) => void;
  activities: Activity[];
  onActivitiesLoaded: (page: ActivityPageResult) => void;
  onActivitiesLoadMore: (page: ActivityPageResult) => void;
};

/**
 * Cabeçalho do quadro: nome, criação de nova lista, presença, painel de membros e
 * indicador discreto de conexão do socket.
 */
export function BoardToolbar({
  boardId,
  boardName,
  connected,
  presenceUsers,
  onCreateList,
  token,
  currentUserId,
  isOwner,
  members,
  onMembersLoaded,
  onMemberRemoved,
  activities,
  onActivitiesLoaded,
  onActivitiesLoadMore,
}: BoardToolbarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onCreateList(trimmed);
    setTitle('');
    setIsCreating(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-black tracking-tight">{boardName}</h1>
        <span
          title={connected ? 'Conectado em tempo real' : 'Reconectando...'}
          className="flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground"
        >
          {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {connected ? 'ao vivo' : 'reconectando...'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <BoardPresence users={presenceUsers} />

        <MembersPanel
          boardId={boardId}
          token={token}
          currentUserId={currentUserId}
          isOwner={isOwner}
          members={members}
          onMembersLoaded={onMembersLoaded}
          onMemberRemoved={onMemberRemoved}
        />

        <ActivityPanel
          boardId={boardId}
          token={token}
          activities={activities}
          members={members}
          onActivitiesLoaded={onActivitiesLoaded}
          onLoadMore={onActivitiesLoadMore}
        />

        {isCreating ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              autoFocus
              value={title}
              placeholder="Nome da lista"
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                if (!title.trim()) setIsCreating(false);
              }}
              className="h-9 w-48"
              data-testid="new-list-title"
            />
            <Button type="submit" size="sm" data-testid="new-list-submit">
              Criar
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsCreating(true)}
            data-testid="new-list-trigger"
          >
            <Plus className="size-4" />
            Nova lista
          </Button>
        )}
      </div>
    </div>
  );
}
