'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, LayoutGrid, Search as SearchIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { getMessage } from '@/shared/i18n';
import { useGlobalSearch } from '@/modules/boards/hooks/use-global-search.hook';
import type { SearchBoardResult, SearchCardResult } from '@/modules/boards/api/boards.api';

type FlatResult =
  | { kind: 'board'; item: SearchBoardResult }
  | { kind: 'card'; item: SearchCardResult };

/**
 * Command palette global (`023`, `⌘K`/`Ctrl+K`), montado uma única vez em
 * `app/(private)/layout.tsx`. Reaproveita `useGlobalSearch` (mesma função `search()`/debounce
 * de 300ms da tela `/search`) — apenas a apresentação (compacta, sem chips de filtro) é
 * diferente. Navegação por teclado (setas/Enter) é suportada; clique é o caminho obrigatório.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { query, setQuery, result, status } = useGlobalSearch();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }

  const flatResults: FlatResult[] = useMemo(
    () => [
      ...result.boards.map((item): FlatResult => ({ kind: 'board', item })),
      ...result.cards.map((item): FlatResult => ({ kind: 'card', item })),
    ],
    [result],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0);
  }, [flatResults.length]);

  function navigateTo(entry: FlatResult) {
    handleOpenChange(false);
    if (entry.kind === 'board') {
      router.push(`/boards/${entry.item.id}`);
    } else {
      router.push(`/boards/${entry.item.boardId}?card=${entry.item.id}`);
    }
  }

  function handleKeyDownOnInput(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, flatResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const entry = flatResults[activeIndex];
      if (entry) navigateTo(entry);
    }
  }

  const trimmedQuery = query.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        data-testid="command-palette"
      >
        <DialogTitle className="sr-only">{getMessage('commandPalette.title')}</DialogTitle>

        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <SearchIcon className="size-5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDownOnInput}
            placeholder={getMessage('commandPalette.placeholder')}
            className="w-full border-none bg-transparent text-base outline-none"
            data-testid="command-palette-input"
          />
          <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {getMessage('commandPalette.escHint')}
          </span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {trimmedQuery.length < 2 ? (
            <p className="p-4 text-sm text-muted-foreground" data-testid="command-palette-empty-query">
              {getMessage('search.emptyQuery')}
            </p>
          ) : status === 'loading' ? (
            <p className="p-4 text-sm text-muted-foreground" data-testid="command-palette-loading">
              {getMessage('search.loading')}
            </p>
          ) : flatResults.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground" data-testid="command-palette-no-results">
              {getMessage('search.noResults')}
            </p>
          ) : (
            <>
              {result.boards.length > 0 ? (
                <div>
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {getMessage('search.section.boards')}
                  </div>
                  {result.boards.map((board) => {
                    const flatIndex = flatResults.findIndex(
                      (entry) => entry.kind === 'board' && entry.item.id === board.id,
                    );
                    return (
                      <button
                        key={board.id}
                        type="button"
                        onClick={() => navigateTo({ kind: 'board', item: board })}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                          activeIndex === flatIndex ? 'bg-primary/10' : 'hover:bg-muted/60'
                        }`}
                        data-testid="command-palette-board-item"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <LayoutGrid className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{board.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {result.cards.length > 0 ? (
                <div>
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {getMessage('search.section.cards')}
                  </div>
                  {result.cards.map((card) => {
                    const flatIndex = flatResults.findIndex(
                      (entry) => entry.kind === 'card' && entry.item.id === card.id,
                    );
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => navigateTo({ kind: 'card', item: card })}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                          activeIndex === flatIndex ? 'bg-primary/10' : 'hover:bg-muted/60'
                        }`}
                        data-testid="command-palette-card-item"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <FileText className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{card.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {getMessage('search.cardContext', {
                              params: { boardName: card.boardName, listTitle: card.listTitle },
                            })}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <span>{getMessage('commandPalette.hint.navigate')}</span>
          <span>{getMessage('commandPalette.hint.open')}</span>
          <span>{getMessage('commandPalette.hint.close')}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
