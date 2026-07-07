'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, FileText, LayoutGrid, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { DeleteConfirmationDialog } from '@/shared/components/ui/delete-confirmation-dialog';
import { getMessage } from '@/shared/i18n';
import { formatRelativeTime } from '@/shared/util/relative-time.util';
import { useAuth } from '@/modules/auth/context/auth.context';
import {
  BoardsApiError,
  deleteBoard,
  deleteCard,
  deleteList,
  listArchivedItems,
  restoreBoard,
  restoreCard,
  restoreList,
  type ArchivedBoardItem,
  type ArchivedCardItem,
  type ArchivedItems,
  type ArchivedListItem,
} from '@/modules/boards/api/boards.api';
import { BoardColumnsSkeleton } from '@/modules/boards/components/board-columns-skeleton.component';

type Tab = 'cards' | 'lists' | 'boards';

type PendingDelete =
  | { kind: 'card'; item: ArchivedCardItem }
  | { kind: 'list'; item: ArchivedListItem }
  | { kind: 'board'; item: ArchivedBoardItem }
  | null;

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }
  toast.error(getMessage('DEFAULT_API_ERROR'));
}

/**
 * Tela "Arquivados" (`022`), reproduzindo `Arquivados.dc.html`: três abas (Cartões/Listas/
 * Quadros) com contadores, busca client-side, "Restaurar" e "Excluir definitivamente" por
 * item. Busca `GET /archived` uma única vez ao montar — sem socket (ver `design.md`).
 */
export function ArchivedView() {
  const { token } = useAuth();
  const [data, setData] = useState<ArchivedItems | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [tab, setTab] = useState<Tab>('cards');
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listArchivedItems(token)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        reportError(error);
        setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCards = useMemo(
    () => (data?.cards ?? []).filter((card) => card.title.toLowerCase().includes(normalizedQuery)),
    [data, normalizedQuery],
  );
  const filteredLists = useMemo(
    () => (data?.lists ?? []).filter((list) => list.title.toLowerCase().includes(normalizedQuery)),
    [data, normalizedQuery],
  );
  const filteredBoards = useMemo(
    () => (data?.boards ?? []).filter((board) => board.name.toLowerCase().includes(normalizedQuery)),
    [data, normalizedQuery],
  );

  async function handleRestoreCard(item: ArchivedCardItem) {
    if (!token) return;
    try {
      await restoreCard(token, item.boardId, item.id);
      setData((current) => (current ? { ...current, cards: current.cards.filter((c) => c.id !== item.id) } : current));
      toast.success(getMessage('archived.restoreSuccess'));
    } catch (error) {
      reportError(error);
    }
  }

  async function handleRestoreList(item: ArchivedListItem) {
    if (!token) return;
    try {
      await restoreList(token, item.id);
      setData((current) => (current ? { ...current, lists: current.lists.filter((l) => l.id !== item.id) } : current));
      toast.success(getMessage('archived.restoreSuccess'));
    } catch (error) {
      reportError(error);
    }
  }

  async function handleRestoreBoard(item: ArchivedBoardItem) {
    if (!token) return;
    try {
      await restoreBoard(token, item.id);
      setData((current) => (current ? { ...current, boards: current.boards.filter((b) => b.id !== item.id) } : current));
      toast.success(getMessage('archived.restoreSuccess'));
    } catch (error) {
      reportError(error);
    }
  }

  async function handleConfirmDelete() {
    if (!token || !pendingDelete) return;

    setDeleting(true);
    try {
      if (pendingDelete.kind === 'card') {
        await deleteCard(token, pendingDelete.item.boardId, pendingDelete.item.id);
        setData((current) =>
          current ? { ...current, cards: current.cards.filter((c) => c.id !== pendingDelete.item.id) } : current,
        );
      } else if (pendingDelete.kind === 'list') {
        await deleteList(token, pendingDelete.item.id);
        setData((current) =>
          current ? { ...current, lists: current.lists.filter((l) => l.id !== pendingDelete.item.id) } : current,
        );
      } else {
        await deleteBoard(token, pendingDelete.item.id);
        setData((current) =>
          current ? { ...current, boards: current.boards.filter((b) => b.id !== pendingDelete.item.id) } : current,
        );
      }
      toast.success(getMessage('archived.deleteSuccess'));
      setPendingDelete(null);
    } catch (error) {
      reportError(error);
    } finally {
      setDeleting(false);
    }
  }

  if (status === 'loading' || !data) {
    return <BoardColumnsSkeleton />;
  }

  const deleteItemName =
    pendingDelete?.kind === 'card'
      ? pendingDelete.item.title
      : pendingDelete?.kind === 'list'
        ? pendingDelete.item.title
        : pendingDelete?.kind === 'board'
          ? pendingDelete.item.name
          : '';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-12" data-testid="archived-view">
      <h1 className="text-2xl font-extrabold tracking-tight">{getMessage('archived.title')}</h1>
      <p className="text-sm text-muted-foreground">{getMessage('archived.retentionNotice')}</p>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <div className="flex flex-wrap items-center gap-3">
          <TabsList data-testid="archived-tabs">
            <TabsTrigger value="cards" data-testid="archived-tab-cards">
              {getMessage('archived.tabs.cards')} <span className="ml-1 opacity-70">{data.cards.length}</span>
            </TabsTrigger>
            <TabsTrigger value="lists" data-testid="archived-tab-lists">
              {getMessage('archived.tabs.lists')} <span className="ml-1 opacity-70">{data.lists.length}</span>
            </TabsTrigger>
            <TabsTrigger value="boards" data-testid="archived-tab-boards">
              {getMessage('archived.tabs.boards')} <span className="ml-1 opacity-70">{data.boards.length}</span>
            </TabsTrigger>
          </TabsList>

          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={getMessage('archived.search.placeholder')}
              className="w-56 pl-9"
              data-testid="archived-search-input"
            />
          </div>
        </div>

        <TabsContent value="cards">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid="archived-cards-list">
            {filteredCards.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{getMessage('archived.empty.cards')}</p>
            ) : (
              filteredCards.map((card, index) => (
                <div
                  key={card.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index < filteredCards.length - 1 ? 'border-b border-border' : ''
                  }`}
                  data-testid="archived-card-item"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{card.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getMessage('archived.cardContext', {
                        params: {
                          boardName: card.boardName,
                          listTitle: card.listTitle,
                          time: formatRelativeTime(card.archivedAt),
                        },
                      })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleRestoreCard(card)} data-testid="archived-restore-button">
                    {getMessage('archived.restore')}
                  </Button>
                  <button
                    type="button"
                    aria-label={getMessage('archived.deleteForever')}
                    onClick={() => setPendingDelete({ kind: 'card', item: card })}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    data-testid="archived-delete-forever-button"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="lists">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid="archived-lists-list">
            {filteredLists.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{getMessage('archived.empty.lists')}</p>
            ) : (
              filteredLists.map((list, index) => (
                <div
                  key={list.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index < filteredLists.length - 1 ? 'border-b border-border' : ''
                  }`}
                  data-testid="archived-list-item"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <LayoutGrid className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{list.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getMessage('archived.listContext', {
                        params: {
                          boardName: list.boardName,
                          cardCount: list.cardCount,
                          time: formatRelativeTime(list.archivedAt),
                        },
                      })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleRestoreList(list)} data-testid="archived-restore-button">
                    {getMessage('archived.restore')}
                  </Button>
                  <button
                    type="button"
                    aria-label={getMessage('archived.deleteForever')}
                    onClick={() => setPendingDelete({ kind: 'list', item: list })}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    data-testid="archived-delete-forever-button"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="boards">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid="archived-boards-list">
            {filteredBoards.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{getMessage('archived.empty.boards')}</p>
            ) : (
              filteredBoards.map((board, index) => (
                <div
                  key={board.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index < filteredBoards.length - 1 ? 'border-b border-border' : ''
                  }`}
                  data-testid="archived-board-item"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                    <Archive className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{board.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getMessage('archived.boardContext', {
                        params: {
                          listCount: board.listCount,
                          cardCount: board.cardCount,
                          time: formatRelativeTime(board.archivedAt),
                        },
                      })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleRestoreBoard(board)} data-testid="archived-restore-button">
                    {getMessage('archived.restore')}
                  </Button>
                  <button
                    type="button"
                    aria-label={getMessage('archived.deleteForever')}
                    onClick={() => setPendingDelete({ kind: 'board', item: board })}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    data-testid="archived-delete-forever-button"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <DeleteConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={getMessage('archived.deleteForever.title')}
        description={getMessage('archived.deleteForever.description')}
        confirmWord={getMessage('archived.deleteForever.confirmWord')}
        confirmLabel={getMessage('archived.deleteForever')}
        itemValue={deleteItemName}
        isConfirming={deleting}
      />
    </div>
  );
}
