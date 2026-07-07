'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, LayoutGrid, Search as SearchIcon } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { getMessage } from '@/shared/i18n';
import { useGlobalSearch } from '@/modules/boards/hooks/use-global-search.hook';
import type { SearchBoardResult, SearchCardResult } from '@/modules/boards/api/boards.api';

type SearchFilter = 'all' | 'boards' | 'cards';

/**
 * Tela de busca global (`023`), reproduzindo `mockups/Busca Global.dc.html`: campo de busca,
 * chips de filtro client-side (Tudo/Quadros/Cartões, sobre o resultado já carregado) e seções
 * "Quadros"/"Cartões" com contexto. Chips "Pessoas"/"Etiqueta"/"Data" e "Ações rápidas" do
 * mockup estão fora de escopo (ver `proposal.md`).
 */
export function SearchView() {
  const router = useRouter();
  const { query, setQuery, result, status } = useGlobalSearch();
  const [filter, setFilter] = useState<SearchFilter>('all');

  const trimmedQuery = query.trim();
  const showBoards = filter !== 'cards';
  const showCards = filter !== 'boards';
  const hasResults = result.boards.length > 0 || result.cards.length > 0;

  const filters: { id: SearchFilter; label: string }[] = useMemo(
    () => [
      { id: 'all', label: getMessage('search.filter.all') },
      { id: 'boards', label: getMessage('search.filter.boards') },
      { id: 'cards', label: getMessage('search.filter.cards') },
    ],
    [],
  );

  function goToBoard(board: SearchBoardResult) {
    router.push(`/boards/${board.id}`);
  }

  function goToCard(card: SearchCardResult) {
    router.push(`/boards/${card.boardId}?card=${card.id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-12" data-testid="search-view">
      <h1 className="text-2xl font-extrabold tracking-tight">{getMessage('search.title')}</h1>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={getMessage('search.placeholder')}
          className="pl-9"
          autoFocus
          data-testid="search-input"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? 'default' : 'outline'}
            className="h-7 rounded-full px-3 text-xs font-semibold"
            onClick={() => setFilter(item.id)}
            data-testid={`search-filter-${item.id}`}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {trimmedQuery.length < 2 ? (
        <p className="p-4 text-sm text-muted-foreground" data-testid="search-empty-query">
          {getMessage('search.emptyQuery')}
        </p>
      ) : status === 'loading' ? (
        <p className="p-4 text-sm text-muted-foreground" data-testid="search-loading">
          {getMessage('search.loading')}
        </p>
      ) : !hasResults ? (
        <p className="p-4 text-sm text-muted-foreground" data-testid="search-no-results">
          {getMessage('search.noResults')}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {showBoards && result.boards.length > 0 ? (
            <section className="flex flex-col gap-2" data-testid="search-boards-section">
              <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {getMessage('search.section.boards')}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {result.boards.map((board, index) => (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => goToBoard(board)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 ${
                      index < result.boards.length - 1 ? 'border-b border-border' : ''
                    }`}
                    data-testid="search-board-item"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LayoutGrid className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{board.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {showCards && result.cards.length > 0 ? (
            <section className="flex flex-col gap-2" data-testid="search-cards-section">
              <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {getMessage('search.section.cards')}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {result.cards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => goToCard(card)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 ${
                      index < result.cards.length - 1 ? 'border-b border-border' : ''
                    }`}
                    data-testid="search-card-item"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
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
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
