'use client';

import { useEffect, useRef, useState } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth/context/auth.context';
import {
  archiveCard,
  archiveList,
  assignLabel,
  BoardsApiError,
  createCard,
  createLabel,
  createList,
  deleteCard,
  deleteList,
  moveCard,
  moveList,
  renameCard,
  renameList,
  unassignLabel,
} from '@/modules/boards/api/boards.api';
import {
  addChecklistItem,
  assignUser,
  deleteChecklistItem,
  editChecklistItem,
  reorderChecklistItems,
  setCardDueDate,
  toggleChecklistItem,
  unassignUser,
  type CommentDto,
} from '@/modules/boards/api/card-detail.api';
import type { LabelColor } from '@/modules/boards/types/board-state.type';
import { BoardViewKanban } from '@/modules/boards/components/board-view-kanban.component';
import { BoardViewList } from '@/modules/boards/components/board-view-list.component';
import { BoardViewCalendar } from '@/modules/boards/components/board-view-calendar.component';
import { BoardFilterBar } from '@/modules/boards/components/board-filter-bar.component';
import { BoardViewSwitcher } from '@/modules/boards/components/board-view-switcher.component';
import { useBoardFilters } from '@/modules/boards/hooks/use-board-filters.hook';
import {
  loadBoardViewPreference,
  saveBoardViewPreference,
} from '@/modules/boards/util/board-view-preference.util';
import type { BoardFilterState, BoardViewMode } from '@/modules/boards/types/board-filter.type';
import { BoardToolbar } from '@/modules/boards/components/board-toolbar.component';
import { BoardReconnectBanner } from '@/modules/boards/components/board-reconnect-banner.component';
import { CardDetailModal } from '@/modules/boards/components/card-detail-modal.component';
import { listMembers, type BoardMember } from '@/modules/boards/api/members.api';
import type { Activity } from '@/modules/boards/api/activity.api';
import type { BoardState } from '@/modules/boards/types/board-state.type';
import {
  applyBoardUpdated,
  applyCardCreated,
  applyCardDeleted,
  applyCardMoved,
  applyCardUpdated,
  applyCommentCreated,
  applyCommentDeleted,
  applyLabelCreated,
  applyLabelDeleted,
  applyLabelUpdated,
  applyListCreated,
  applyListDeleted,
  applyListMoved,
  applyListUpdated,
} from '@/modules/boards/util/board-state.reducer';
import { useBoardSocket, type PresenceUser } from '@/hooks/use-board-socket';
import { getMessage } from '@/shared/i18n';

type CommentEvent =
  | { type: 'created'; comment: CommentDto }
  | { type: 'deleted'; commentId: string; cardId: string }
  | null;

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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [commentEvent, setCommentEvent] = useState<CommentEvent>(null);
  const snapshotRef = useRef<BoardState | null>(null);
  const isOwner = user?.id === board.ownerId;

  // Filtro/visão são preferência de sessão de navegador, hidratados do `localStorage` na
  // primeira renderização (não em `useEffect`, para não haver flash do padrão) e persistidos
  // por quadro a cada mudança (`019`).
  const [filters, setFilters] = useState<BoardFilterState>(
    () => loadBoardViewPreference(initialBoard.id).filters,
  );
  const [activeView, setActiveView] = useState<BoardViewMode>(
    () => loadBoardViewPreference(initialBoard.id).activeView,
  );

  useEffect(() => {
    saveBoardViewPreference(board.id, { filters, activeView });
  }, [board.id, filters, activeView]);

  // Deriva o cartão aberto diretamente de `board.lists[].cards[]` a cada render (mesmo
  // objeto de estado do quadro, sem cópia buscada à parte). Se o cartão for excluído
  // (localmente ou via `card.deleted` de outro membro) enquanto o modal está aberto,
  // `selectedCard` vira `null` no próximo render e o modal fecha sozinho — não é preciso
  // um efeito dedicado para "zerar" `selectedCardId` (o render já não exibe mais nada).
  const selectedCard =
    board.lists.flatMap((list) => list.cards).find((card) => card.id === selectedCardId) ?? null;

  // Carrega os membros do quadro uma vez ao montar, para que o popover de responsáveis do
  // modal de detalhe já tenha a lista mesmo que o painel "Compartilhar" nunca tenha sido
  // aberto nesta sessão (`design.md`: reaproveita `BoardView.members`, sem nova busca ao
  // abrir o modal).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listMembers(token, board.id)
      .then((result) => {
        if (cancelled) return;
        setMembers(result);
      })
      .catch(() => {
        // Silencioso: o painel "Compartilhar" já reporta erros ao tentar carregar de novo.
      });

    return () => {
      cancelled = true;
    };
  }, [token, board.id]);

  function mergeActivitiesById(current: Activity[], incoming: Activity[]): Activity[] {
    const byId = new Map(current.map((activity) => [activity.id, activity]));
    incoming.forEach((activity) => byId.set(activity.id, activity));
    return [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const { connected, reconnecting, reconnectAttempt } = useBoardSocket(board.id, token, {
    onBoardUpdated: (payload) => setBoard((current) => applyBoardUpdated(current, payload)),
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
    onLabelCreated: (payload) => setBoard((current) => applyLabelCreated(current, payload)),
    onLabelUpdated: (payload) => setBoard((current) => applyLabelUpdated(current, payload)),
    onLabelDeleted: (payload) => setBoard((current) => applyLabelDeleted(current, payload)),
    onCommentCreated: (payload) => {
      setBoard((current) => applyCommentCreated(current, payload));
      setCommentEvent({ type: 'created', comment: payload.comment });
    },
    onCommentDeleted: (payload) => {
      setBoard((current) => applyCommentDeleted(current, payload));
      setCommentEvent({ type: 'deleted', commentId: payload.commentId, cardId: payload.cardId });
    },
  });

  const sortedLists = [...board.lists].sort((a, b) => a.position - b.position);
  const { visibleCardIds, filteredCards } = useBoardFilters(board, filters);

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
      setBoard((current) => {
        // O eco do proprio Socket.IO (`list.created`) pode ter chegado antes desta resposta
        // REST e ja adicionado a lista definitiva (mesmo `created.id`). Nesse caso, so remove
        // o placeholder otimista em vez de duplicar a lista.
        const jaReconciliadaPeloSocket = current.lists.some((list) => list.id === created.id);

        if (jaReconciliadaPeloSocket) {
          return { ...current, lists: current.lists.filter((list) => list.id !== tempId) };
        }

        return {
          ...current,
          lists: current.lists.map((list) =>
            list.id === tempId
              ? { id: created.id, title: created.title, position: created.position, cards: [] }
              : list,
          ),
        };
      });
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

  async function handleArchiveList(listId: string) {
    if (!token) return;

    takeSnapshot();
    setBoard((current) => ({ ...current, lists: current.lists.filter((list) => list.id !== listId) }));

    try {
      await archiveList(token, listId);
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
              cards: [
                ...list.cards,
                {
                  id: tempId,
                  listId,
                  title,
                  description: null,
                  position: list.cards.length,
                  labels: [],
                  dueDate: null,
                  assignees: [],
                  checklist: [],
                },
              ],
            }
          : list,
      ),
    }));

    try {
      const created = await createCard(token, board.id, listId, title);
      setBoard((current) => {
        // Mesma corrida do `handleCreateList`: o eco do proprio Socket.IO pode ja ter
        // inserido o cartao definitivo antes desta resposta REST resolver.
        const listAtual = current.lists.find((list) => list.id === listId);
        const jaReconciliadoPeloSocket = listAtual?.cards.some((card) => card.id === created.id) ?? false;

        if (jaReconciliadoPeloSocket) {
          return {
            ...current,
            lists: current.lists.map((list) =>
              list.id === listId
                ? { ...list, cards: list.cards.filter((card) => card.id !== tempId) }
                : list,
            ),
          };
        }

        return {
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
                          labels: created.labels,
                          dueDate: created.dueDate,
                          assignees: created.assignees,
                          checklist: created.checklist,
                        }
                      : card,
                  ),
                }
              : list,
          ),
        };
      });
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

  async function handleArchiveCard(cardId: string) {
    if (!token) return;

    takeSnapshot();
    setBoard((current) => ({
      ...current,
      lists: current.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((card) => card.id !== cardId),
      })),
    }));
    setSelectedCardId(null);

    try {
      await archiveCard(token, board.id, cardId);
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  async function handleCreateLabel(name: string, color: LabelColor) {
    if (!token) return;

    try {
      await createLabel(token, board.id, name, color);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleToggleLabel(cardId: string, labelId: string, assigned: boolean) {
    if (!token) return;

    try {
      if (assigned) {
        await unassignLabel(token, board.id, cardId, labelId);
      } else {
        await assignLabel(token, board.id, cardId, labelId);
      }
    } catch (error) {
      reportError(error);
    }
  }

  async function handleEditDescription(cardId: string, description: string) {
    if (!token) return;

    const currentCard = board.lists.flatMap((list) => list.cards).find((card) => card.id === cardId);
    if (!currentCard) return;

    takeSnapshot();
    setBoard((current) => ({
      ...current,
      lists: current.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) => (card.id === cardId ? { ...card, description } : card)),
      })),
    }));

    try {
      await renameCard(token, board.id, cardId, currentCard.title, description);
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  async function handleSetDueDate(cardId: string, dueDate: string | null) {
    if (!token) return;

    takeSnapshot();
    setBoard((current) => ({
      ...current,
      lists: current.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) => (card.id === cardId ? { ...card, dueDate } : card)),
      })),
    }));

    try {
      await setCardDueDate(token, board.id, cardId, dueDate);
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  async function handleAssignUser(cardId: string, userId: string) {
    if (!token) return;

    try {
      await assignUser(token, board.id, cardId, userId);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleUnassignUser(cardId: string, userId: string) {
    if (!token) return;

    try {
      await unassignUser(token, board.id, cardId, userId);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleAddChecklistItem(cardId: string, text: string) {
    if (!token) return;

    try {
      await addChecklistItem(token, board.id, cardId, text);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleEditChecklistItem(cardId: string, itemId: string, text: string) {
    if (!token) return;

    try {
      await editChecklistItem(token, board.id, cardId, itemId, text);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleDeleteChecklistItem(cardId: string, itemId: string) {
    if (!token) return;

    try {
      await deleteChecklistItem(token, board.id, cardId, itemId);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleReorderChecklistItems(cardId: string, itemIds: string[]) {
    if (!token) return;

    try {
      await reorderChecklistItems(token, board.id, cardId, itemIds);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleToggleChecklistItem(cardId: string, itemId: string, done: boolean) {
    if (!token) return;

    takeSnapshot();
    setBoard((current) => ({
      ...current,
      lists: current.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                checklist: card.checklist.map((item) => (item.id === itemId ? { ...item, done } : item)),
              }
            : card,
        ),
      })),
    }));

    try {
      await toggleChecklistItem(token, board.id, cardId, itemId, done);
    } catch (error) {
      revertToSnapshot(getMessage('DEFAULT_API_ERROR'));
      reportError(error);
    }
  }

  function handleCommentsCountHydrated(cardId: string, total: number) {
    setBoard((current) => ({
      ...current,
      commentsCountByCardId: { ...current.commentsCountByCardId, [cardId]: total },
    }));
  }

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col gap-4 bg-muted/30 p-4 md:-m-6 md:p-6">
      {reconnecting ? <BoardReconnectBanner attempt={reconnectAttempt} /> : null}
      <BoardToolbar
        boardId={board.id}
        boardName={board.name}
        boardColor={board.color}
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

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
        <BoardViewSwitcher activeView={activeView} onChange={setActiveView} />
        <div className="h-[22px] w-px bg-border" />
        <BoardFilterBar
          filters={filters}
          onChange={setFilters}
          boardLabels={board.labels}
          members={members}
        />
      </div>

      {activeView === 'kanban' ? (
        <BoardViewKanban
          sortedLists={sortedLists}
          visibleCardIds={visibleCardIds}
          onDragEnd={handleDragEnd}
          onRenameList={handleRenameList}
          onDeleteList={handleDeleteList}
          onArchiveList={handleArchiveList}
          onCreateCard={handleCreateCard}
          onRenameCard={handleRenameCard}
          onDeleteCard={handleDeleteCard}
          boardLabels={board.labels}
          onCreateLabel={handleCreateLabel}
          onToggleLabel={handleToggleLabel}
          onOpenCard={setSelectedCardId}
          commentsCountByCardId={board.commentsCountByCardId}
        />
      ) : null}

      {activeView === 'lista' ? (
        <BoardViewList filteredCards={filteredCards} onOpenCard={setSelectedCardId} />
      ) : null}

      {activeView === 'calendario' ? (
        <BoardViewCalendar filteredCards={filteredCards} onOpenCard={setSelectedCardId} />
      ) : null}

      {selectedCard ? (
        <CardDetailModal
          card={selectedCard}
          boardId={board.id}
          token={token ?? ''}
          boardLabels={board.labels}
          members={members}
          currentUserId={user?.id ?? null}
          currentUserName={user?.name ?? ''}
          commentEvent={commentEvent}
          onClose={() => setSelectedCardId(null)}
          onRenameTitle={handleRenameCard}
          onEditDescription={handleEditDescription}
          onCreateLabel={handleCreateLabel}
          onToggleLabel={handleToggleLabel}
          onSetDueDate={handleSetDueDate}
          onAssignUser={handleAssignUser}
          onUnassignUser={handleUnassignUser}
          onAddChecklistItem={handleAddChecklistItem}
          onToggleChecklistItem={handleToggleChecklistItem}
          onEditChecklistItem={handleEditChecklistItem}
          onDeleteChecklistItem={handleDeleteChecklistItem}
          onArchiveCard={handleArchiveCard}
          onReorderChecklistItems={handleReorderChecklistItems}
          onCommentsCountHydrated={handleCommentsCountHydrated}
        />
      ) : null}
    </div>
  );
}
