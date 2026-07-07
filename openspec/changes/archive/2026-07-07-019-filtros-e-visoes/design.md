## Design — 019-filtros-e-visoes

## Contexto

`BoardView` (`apps/frontend/src/modules/boards/components/board-view.component.tsx`) já mantém
`BoardState` inteiro em memória, reconciliado ao vivo por `useBoardSocket`. Cada `CardState`
(`types/board-state.type.ts`) já tem `title`, `labels: LabelState[]`, `dueDate: string | null`,
`assignees: AssigneeState[]`, `checklist: ChecklistItemState[]` — tudo que os filtros e as três
visões precisam. Esta change não adiciona nenhum campo a `CardState`/`BoardState`; ela adiciona
uma camada de **derivação pura** por cima do estado existente, mais três formas de renderizá-lo.

## Onde os filtros e a visão vivem: estado local de `BoardView`, hidratado do `localStorage`

**Decisão:** `BoardView` ganha dois novos estados — `filters: BoardFilterState` e
`activeView: 'kanban' | 'lista' | 'calendario'` — inicializados a partir de
`loadBoardViewPreference(boardId)` (lido uma vez, em `useState(() => ...)`, não em `useEffect`,
para não haver flash do valor padrão) e persistidos a cada mudança via
`saveBoardViewPreference(boardId, { filters, activeView })` (`board-view-preference.util.ts`,
`localStorage`, chave `taskboard:board-view:{boardId}`, JSON). Motivos:

1. Filtro e visão são preferência de **sessão de navegador**, não de conta nem de quadro
   compartilhado — cada pessoa pode querer ver o quadro filtrado de um jeito diferente. Não há
   necessidade (nem pedido) de sincronizar isso entre usuários via socket.
2. `localStorage` sobrevive a reload da página sem exigir nenhum estado de servidor — consistente
   com "sem backend novo" do `proposal.md`.
3. Falha de leitura/escrita no `localStorage` (modo anônimo, quota) é engolida silenciosamente,
   caindo no padrão (`activeView: 'kanban'`, `filters` vazio) — nunca quebra o carregamento do
   quadro.

## Tipo do filtro

```ts
// types/board-filter.type.ts
export type DueFilter = 'late' | 'today' | 'next7days' | 'none';

export type BoardFilterState = {
  labelIds: string[];       // OR entre si: cartão passa se tiver qualquer uma
  assigneeIds: string[];    // OR entre si
  due: DueFilter[];         // OR entre si (ex.: "atrasado" OU "hoje" ao mesmo tempo)
  search: string;           // texto livre, aplicado ao título
};

export const EMPTY_BOARD_FILTER: BoardFilterState = {
  labelIds: [],
  assigneeIds: [],
  due: [],
  search: '',
};
```

Categorias vazias (`[]`/`''`) não restringem nada. Entre categorias diferentes o efeito é **E**
lógico (um cartão só aparece se satisfizer etiqueta E responsável E prazo E busca — cada uma só
quando não vazia); dentro de uma categoria o efeito é **OU** (ex.: `labelIds: ['a','b']` mostra
cartões com `a` OU `b`), replicando o comportamento padrão de filtros facetados (mesmo padrão do
Trello, citado como referência no mockup).

## `board-filter.util.ts`: predicado puro

```ts
export function matchesFilter(card: CardState, filters: BoardFilterState, now = new Date()): boolean {
  if (filters.labelIds.length > 0 && !card.labels.some((l) => filters.labelIds.includes(l.id))) {
    return false;
  }
  if (filters.assigneeIds.length > 0 && !card.assignees.some((a) => filters.assigneeIds.includes(a.id))) {
    return false;
  }
  if (filters.due.length > 0 && !filters.due.some((d) => matchesDue(card.dueDate, d, now))) {
    return false;
  }
  if (filters.search.trim() !== '' && !normalize(card.title).includes(normalize(filters.search))) {
    return false;
  }
  return true;
}
```

`matchesDue(dueDate, due, now)` reaproveita `classifyDueDate` (`due-date.util.ts`, de `018`) para
`'late'`/`'today'`; `'next7days'` é `classifyDueDate(...) === 'upcoming'` e a diferença em dias
civis entre `dueDate` e `now` está entre `1` e `7` (inclusive); `'none'` é `dueDate === null`.
`normalize(text)` faz `text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()` —
busca sem diacríticos, puro, sem `Intl` pesado.

`countActiveFilters(filters)` soma `labelIds.length > 0 ? 1 : 0` (etc., uma "categoria ativa" por
grupo, não por item individual) — usado no badge do botão "Filtro" na barra.

## `use-board-filters.hook.ts`: cartões visíveis, sem duplicar reconciliação

```ts
export type FilteredCard = CardState & { listId: string; listTitle: string };

export function useBoardFilters(board: BoardState, filters: BoardFilterState): {
  visibleCardIds: Set<string>;   // para a visão Kanban (atenuar, não remover, ver abaixo)
  filteredCards: FilteredCard[]; // para as visões Lista/Calendário (já achatado, com listTitle)
} {
  return useMemo(() => {
    const filteredCards: FilteredCard[] = [];
    const visibleCardIds = new Set<string>();
    for (const list of board.lists) {
      for (const card of list.cards) {
        if (matchesFilter(card, filters)) {
          visibleCardIds.add(card.id);
          filteredCards.push({ ...card, listId: list.id, listTitle: list.title });
        }
      }
    }
    return { visibleCardIds, filteredCards };
  }, [board, filters]);
}
```

Um hook só, reaproveitado pelas três visões — nenhuma delas mantém cópia própria do estado
filtrado; todas leem de `board` (que o socket já reconcilia) através deste hook. Trocar de visão
ou mudar um filtro nunca perde uma atualização ao vivo porque não há estado intermediário
"congelado" — o `useMemo` recalcula a cada render de `board`/`filters`.

## Visão Kanban: atenuar, não esconder as colunas

O `proposal.md` exige que "a filtragem esconde/atenua cartões que não batem, **mantendo as
colunas**". Decisão: colunas nunca somem; cartões fora de `visibleCardIds` recebem `opacity-40
pointer-events-none` (permanecem no DOM, sem remover do `Droppable` — drag-and-drop continua
funcionando para os cartões visíveis; um cartão atenuado não é arrastável, mas isso é aceitável
porque ele está fora do filtro atual, mesma UX do Trello). `KanbanColumn`/`KanbanCard` ganham uma
prop opcional `isFilteredOut?: boolean`; nenhuma outra mudança de estrutura. Contador de cartões
no cabeçalho da coluna passa a contar só os visíveis (`sortedCards.filter(c =>
visibleCardIds.has(c.id)).length`), igual ao mockup ("A Fazer 2").

`board-view-kanban.component.tsx` é a extração do bloco de `DragDropContext`/`Droppable`/
`KanbanColumn` que hoje vive direto em `board-view.component.tsx`, sem mudança de comportamento —
só uma casa para caber ao lado das outras duas visões atrás do `sc-if` do mockup (aqui,
renderização condicional por `activeView`).

## Visão Lista

`board-view-list.component.tsx`: tabela (`<table>` semântica, não `<div>` com grid, para
acessibilidade) com colunas Cartão/Lista/Responsáveis/Etiquetas/Prazo (mockup:
`grid-template-columns:2.4fr 1fr 1fr 1.1fr 0.9fr`), uma linha por `FilteredCard` de
`filteredCards` (já ordenados por `listTitle` e depois `position`, igual à ordem das colunas no
Kanban). Cada linha é clicável (mesmo `onOpen(card.id)` do `KanbanCard`, abre o mesmo
`CardDetailModal` de `018` — nenhum modal novo). Sem drag-and-drop (fora de escopo, ver
`proposal.md`). Prazo renderiza `CardDueBadge` (`018`, reaproveitado) ou `—` se `null`.

## Visão Calendário

`board-view-calendar.component.tsx`: grid mensal (mês corrente por padrão, com estado local
`month: Date` e navegação `‹`/`›`/"Hoje" — não persistido, reseta ao trocar de visão, decisão
deliberada de simplicidade) de 7 colunas (dom–sáb) × N semanas, cada dia mostrando os cartões de
`filteredCards` cujo `dueDate` cai naquele dia civil (mesmo critério de `classifyDueDate`,
comparação por ano/mês/dia). Cartões sem `dueDate` (`filteredCards.filter(c => c.dueDate ===
null)`) aparecem numa faixa lateral "Sem prazo" (mockup não desenha essa faixa explicitamente,
mas o enunciado da change exige — decisão: coluna estreita à direita do grid, rolável, reaproveita
o mesmo item de cartão compacto usado nos dias do grid). Célula do dia com mais cartões do que
cabe visualmente mostra os primeiros N e um rótulo "+K" (sem popover extra — fora de escopo,
clicar no rótulo abre a visão Lista filtrada pelo mesmo dia é uma melhoria futura, não desta
change). Clique num cartão (grid ou faixa lateral) abre o mesmo `CardDetailModal`.

## Seletor de visão e barra de filtros

`board-view-switcher.component.tsx`: segmented control de três botões (Kanban/Lista/Calendário,
ícones `view_kanban`/`table_rows`/`calendar_month` do mockup, aqui `lucide-react`
`LayoutGrid`/`Rows3`/`CalendarDays`), chamando `setActiveView`.

`board-filter-bar.component.tsx`: barra abaixo do `BoardToolbar` (mockup: linha de 52px com o
segmented control de visão à esquerda, chips de filtro ativo no meio, botão "+ Filtro" que abre
um popover com as quatro seções — Etiqueta/Responsável/Prazo/Busca — cada uma reaproveitando o
padrão visual de checkbox-list do `LabelPopover` de `016`). Cada filtro ativo vira um chip
removível (`✕` no próprio chip, mockup: "Etiqueta: Frontend ✕"). Botão "Limpar filtros" só
aparece quando `countActiveFilters(filters) > 0` (reseta para `EMPTY_BOARD_FILTER`, mantém
`activeView`). Busca textual é um `Input` simples dentro do popover (ou, alternativa mais
descoberta: sempre visível na barra — decisão: dentro do popover de filtros, para não competir
visualmente com a busca global "⌘K" da sidebar do mockup, que é de outro escopo).

## Estrutura de arquivos

```
apps/frontend/src/modules/boards/
  types/
    board-filter.type.ts              <- BoardFilterState, DueFilter, EMPTY_BOARD_FILTER
  util/
    board-filter.util.ts              <- matchesFilter, matchesDue, normalize, countActiveFilters
    board-view-preference.util.ts     <- load/saveBoardViewPreference (localStorage por boardId)
  hooks/
    use-board-filters.hook.ts         <- useBoardFilters(board, filters) -> visibleCardIds/filteredCards
  components/
    board-filter-bar.component.tsx    <- popover de filtros + chips + limpar
    board-view-switcher.component.tsx <- segmented control Kanban/Lista/Calendário
    board-view-kanban.component.tsx   <- extração do layout Kanban atual (DragDropContext/Droppable)
    board-view-list.component.tsx     <- tabela agrupada por lista
    board-view-calendar.component.tsx <- grid mensal + faixa "sem prazo"
    kanban-column.component.tsx       <- ajustado: contador só dos visíveis, isFilteredOut repassado
    kanban-card.component.tsx         <- ajustado: prop isFilteredOut (opacidade/pointer-events)
  components/board-view.component.tsx <- ajustado: renderiza board-filter-bar + view-switcher +
                                          a visão ativa (kanban/lista/calendario), usando
                                          useBoardFilters
```

Convenção de nomes conforme `regras-de-nomenclatura.md`: `.hook.ts` para o hook, `.util.ts` para
funções puras, `.type.ts` para tipos, `.component.tsx` para componentes.

## Reflexo ao vivo

Nenhum mecanismo novo de socket é necessário: `useBoardFilters` deriva de `board` a cada render, e
`board` já é o mesmo estado que `applyCardCreated`/`applyCardUpdated`/`applyCardMoved`/
`applyCardDeleted` atualizam (`018`/anteriores). Um cartão que passa a satisfazer o filtro (ex.:
outro membro adiciona a etiqueta filtrada) reaparece nas visões automaticamente no próximo
render, sem qualquer efeito adicional a escrever.

## i18n

Chaves novas em `pt`/`en`: `boardFilters.*` (rótulos das quatro categorias, opções de prazo,
placeholder de busca, "Limpar filtros", contador), `boardViews.*` (rótulos Kanban/Lista/
Calendário, cabeçalhos da tabela da visão Lista, nomes de mês/dia da visão Calendário, "Sem
prazo", "Nenhum cartão com estes filtros" — mesmo texto do mockup, `04-views.png`), seguindo a
mesma convenção de `cardDetail.*` (`018`).

## Fora de escopo

- Qualquer endpoint, caso de uso, migration ou campo novo no payload de cartão/quadro.
- Ordenação customizável ("Ordenar", botão visível no mockup mas sem comportamento definido —
  registrado como pendência para uma change futura, se o humano decidir que vale a pena).
- Drag-and-drop nas visões Lista/Calendário (mover cartão continua exclusivo da visão Kanban).
- Filtros/visão sincronizados entre usuários via socket ou persistidos no backend — é
  `localStorage`, por navegador.
- Popover de "+K cartões" num dia lotado da visão Calendário.
- Tela de "Configurações do Quadro" (`020`).
