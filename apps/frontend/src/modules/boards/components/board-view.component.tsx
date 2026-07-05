'use client';

import { useRef, useState } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth/context/auth.context';
import {
  BoardsApiError,
  createCard,
  createList,
  deleteCard,
  deleteList,
  moveCard,
  moveList,
  renameCard,
  renameList,
} from '@/modules/boards/api/boards.api';
import { KanbanColumn } from '@/modules/boards/components/kanban-column.component';
import { BoardToolbar } from '@/modules/boards/components/board-toolbar.component';
import type { BoardMember } from '@/modules/boards/api/members.api';
import type { Activity } from '@/modules/boards/api/activity.api';
import type { BoardState } from '@/modules/boards/types/board-state.type';
import {
  applyCardCreated,
  applyCardDeleted,
  applyCardMoved,
  applyCardUpdated,
  applyListCreated,
  applyListDeleted,
  applyListMoved,
  applyListUpdated,
} from '@/modules/boards/util/board-state.reducer';
import { useBoardSocket, type PresenceUser } from '@/hooks/use-board-socket';
import { getMessage } from '@/shared/i18n';

type BoardViewProps = {
  initialBoard: BoardState;
};

function cloneBoard(board: BoardState): BoardState {
  return {
    ...board,
    lists: board.lists.map((list) => ({ ...list, cards: [...list.cards] })),
  };
}

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }

  toast.error(getMessage('DEFAULT_API_ERROR'));
}

/**
 * Orquestra o estado do quadro kanban vivo: drag-and-drop otimista, CRUD inline de listas
 * e cartões, e reconciliação em tempo real via `useBoardSocket`.
 */
export function BoardView({ initialBoard }: BoardViewProps) {
  const { token, user } = useAuth();
  const [board, setBoard] = useState<BoardState>(initialBoard);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const snapshotRef = useRef<BoardState | null>(null);
  const isOwner = user?.id === board.ownerId;

  function mergeActivitiesById(current: Activity[], incoming: Activity[]): Activity[] {
    const byId = new Map(current.map((activity) => [activity.id, activity]));
    incoming.forEach((activity) => byId.set(activity.id, activity));
    return [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const { connected } = useBoardSocket(board.id, token, {
    onCardCreated: (payload) => setBoard((current) => applyCardCreated(current, payload)),
    onCardUpdated: (payload) => setBoard((current) => applyCardUpdated(current, payload)),
    onCardMoved: (payload) => setBoard((current) => applyCardMoved(current, payload)),
    onCardDeleted: (payload) => setBoard((current) => applyCardDeleted(current, payload)),
    onListCreated: (payload) => setBoard((current) => applyListCreated(current, payload)),
    onListUpdated: (payload) => setBoard((current) => applyListUpdated(current, payload)),
    onListMoved: (payload) => setBoard((current) => applyListMoved(current, payload)),
    onListDeleted: (payload) => setBoard((current) => applyListDeleted(current, payload)),
    onPresenceUpdate: (payload) => setPresenceUsers(payload.users),
    onMemberAdded: (payload) =>
      setMembers((current) => {
        if (current.some((member) => member.userId === payload.user.id)) return current;
        return [
          ...current,
          { userId: payload.user.id, name: payload.user.name, email: payload.user.email, role: payload.role },
        ];
      }),
    onActivityAppended: (payload) =>
      setActivities((current) => mergeActivitiesById(current, [payload])),
  });

  const sortedLists = [...board.lists].sort((a, b) => a.position - b.position);

  function takeSnapshot() {
    snapshotRef.current = cloneBoard(board);
  }

  function revertToSnapshot(message: string) {
    if (snapshotRef.current) {
      setBoard(snapshotRef.current);
    }
    toast.error(message);
  }

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    if (type === 'LIST') {
      if (destination.index === source.index) return;

      takeSnapshot();

      const reordered = [...sortedLists];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);

      const withPositions = reordered.map((list, index) => ({ ...list, position: index }));
      setBoard((current) => ({ ...current, lists: withPositions }));

      if (!token) return;

      try {
        await moveList(token, draggableId, destination.index);
      } catch (error) {
        revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
        reportError(error);
      }

      return;
    }

    // type === 'CARD'
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    takeSnapshot();

    setBoard((current) => {
      const sourceList = current.lists.find((list) => list.id === source.droppableId);
      const card = sourceList?.cards.find((existing) => existing.id === draggableId);
      if (!card) return current;

      return applyCardMoved(current, {
        cardId: draggableId,
        fromListId: source.droppableId,
        toListId: destination.droppableId,
        position: destination.index,
      });
    });

    if (!token) return;

    try {
      await moveCard(token, board.id, draggableId, destination.droppableId, destination.index);
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  async function handleCreateList(title: string) {
    if (!token) return;

    const tempId = `temp-list-${crypto.randomUUID()}`;
    takeSnapshot();

    setBoard((current) => ({
      ...current,
      lists: [...current.lists, { id: tempId, title, position: current.lists.length, cards: [] }],
    }));

    try {
      const created = await createList(token, board.id, title);
      setBoard((current) => ({
        ...current,
        lists: current.lists.map((list) =>
          list.id === tempId
            ? { id: created.id, title: created.title, position: created.position, cards: [] }
            : list,
        ),
      }));
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  async function handleRenameList(listId: string, title: string) {
    if (!token) return;

    takeSnapshot();
    setBoard((current) => ({
      ...current,
      lists: current.lists.map((list) => (list.id === listId ? { ...list, title } : list)),
    }));

    try {
      await renameList(token, listId, title);
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  async function handleDeleteList(listId: string) {
    if (!token) return;

    takeSnapshot();
    setBoard((current) => ({ ...current, lists: current.lists.filter((list) => list.id !== listId) }));

    try {
      await deleteList(token, listId);
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  async function handleCreateCard(listId: string, title: string) {
    if (!token) return;

    const tempId = `temp-card-${crypto.randomUUID()}`;
    takeSnapshot();

    setBoard((current) => ({
      ...current,
      lists: current.lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              cards: [...list.cards, { id: tempId, listId, title, description: null, position: list.cards.length }],
            }
          : list,
      ),
    }));

    try {
      const created = await createCard(token, board.id, listId, title);
      setBoard((current) => ({
        ...current,
        lists: current.lists.map((list) =>
          list.id === listId
            ? {
                ...list,
                cards: list.cards.map((card) =>
                  card.id === tempId
                    ? {
                        id: created.id,
                        listId: created.listId,
                        title: created.title,
                        description: created.description,
                        position: created.position,
                      }
                    : card,
                ),
              }
            : list,
        ),
      }));
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  async function handleRenameCard(cardId: string, title: string) {
    if (!token) return;

    takeSnapshot();
    setBoard((current) => ({
      ...current,
      lists: current.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) => (card.id === cardId ? { ...card, title } : card)),
      })),
    }));

    try {
      await renameCard(token, board.id, cardId, title);
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  async function handleDeleteCard(cardId: string) {
    if (!token) return;

    takeSnapshot();
    setBoard((current) => ({
      ...current,
      lists: current.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((card) => card.id !== cardId),
      })),
    }));

    try {
      await deleteCard(token, board.id, cardId);
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BoardToolbar
        boardId={board.id}
        boardName={board.name}
        connected={connected}
        presenceUsers={presenceUsers}
        onCreateList={handleCreateList}
        token={token}
        currentUserId={user?.id ?? null}
        isOwner={isOwner}
        members={members}
        onMembersLoaded={setMembers}
        onMemberRemoved={(userId) =>
          setMembers((current) => current.filter((member) => member.userId !== userId))
        }
        activities={activities}
        onActivitiesLoaded={({ items }) => setActivities((current) => mergeActivitiesById(current, items))}
        onActivitiesLoadMore={({ items }) =>
          setActivities((current) => mergeActivitiesById(current, items))
        }
      />

      <div className="flex gap-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="LIST">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-4 overflow-x-auto pb-4">
                {sortedLists.map((list, index) => (
                  <KanbanColumn
                    key={list.id}
                    list={list}
                    index={index}
                    onRenameList={handleRenameList}
                    onDeleteList={handleDeleteList}
                    onCreateCard={handleCreateCard}
                    onRenameCard={handleRenameCard}
                    onDeleteCard={handleDeleteCard}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
