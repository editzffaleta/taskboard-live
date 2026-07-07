> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `015` (`BoardView`/`KanbanColumn`/`KanbanCard`/`useBoardSocket`), `016`
> (`CardState.labels`, catálogo `board.labels`, `LabelPopover`), `017`/`018`
> (`CardState.dueDate`/`assignees`/`checklist`, `classifyDueDate` de `due-date.util.ts`,
> `BoardView.members`, `CardDetailModal`/`onOpen`). **Não faça:** nenhum endpoint, caso de uso,
> migration ou campo novo no payload de cartão/quadro (esta change é 100% frontend); ordenação
> customizável; drag-and-drop nas visões Lista/Calendário; sincronizar filtro/visão entre
> usuários via socket ou backend (é `localStorage`, por navegador); tela de "Configurações do
> Quadro" (`020`). **Princípio:** filtros e visões são derivação pura do `BoardState` já
> carregado — nenhuma task pode inventar um campo que `CardState` não tem. Verificação final:
> `npx tsc --noEmit -p apps/frontend`, `npm run lint`/`check-types` (turbo, filtro frontend),
> `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm run build` (dentro de `apps/frontend`).

## 1. Tipos e utilitários puros de filtro

- [x] 1.1 Criar `types/board-filter.type.ts` com `DueFilter = 'late' | 'today' | 'next7days' |
  'none'`, `BoardFilterState { labelIds: string[]; assigneeIds: string[]; due: DueFilter[];
  search: string }` e `EMPTY_BOARD_FILTER: BoardFilterState` (todos os campos vazios).
  - **Pré:** nenhuma (só tipos, `018` já concluída).
  - **Aceite:** tipo compila sem `any`; `EMPTY_BOARD_FILTER` não filtra nenhum cartão quando
    usado direto em `matchesFilter` (task 1.2).
  - **Não faça:** adicionar campos de ordenação (fora de escopo, ver `design.md`).
  > ✅ 2026-07-07 15:05 — types e EMPTY_BOARD_FILTER criados sem `any`; compila (tsc limpo).

- [x] 1.2 Criar `util/board-filter.util.ts` com `matchesFilter(card: CardState, filters:
  BoardFilterState, now?: Date): boolean`, `matchesDue(dueDate: string | null, due: DueFilter,
  now?: Date): boolean`, `normalize(text: string): string` (sem diacríticos, minúsculas) e
  `countActiveFilters(filters: BoardFilterState): number`, seguindo exatamente as fórmulas do
  `design.md` (E lógico entre categorias, OU dentro de cada categoria; `matchesDue` reaproveita
  `classifyDueDate` de `due-date.util.ts` para `'late'`/`'today'`; `'next7days'` é `upcoming` com
  diferença de 1 a 7 dias civis; `'none'` é `dueDate === null`).
  - **Pré:** 1.1 concluída.
  - **Aceite:** funções puras (sem `Date.now()` implícito — `now` como parâmetro opcional,
    default `new Date()`); `matchesFilter(card, EMPTY_BOARD_FILTER)` retorna `true` para
    qualquer cartão; `countActiveFilters` conta uma categoria ativa por grupo (não por item).
  - **Não faça:** reimplementar a classificação de prazo — reaproveitar `classifyDueDate`
  > ✅ 2026-07-07 15:05 — matchesFilter/matchesDue/normalize/countActiveFilters implementados reaproveitando classifyDueDate.
    (`018`), não duplicar a lógica de "atrasado/hoje/futuro".

- [x] 1.3 Criar `util/board-view-preference.util.ts` com `loadBoardViewPreference(boardId:
  string): { filters: BoardFilterState; activeView: 'kanban' | 'lista' | 'calendario' }` e
  `saveBoardViewPreference(boardId: string, value: { filters: BoardFilterState; activeView:
  ... }): void`, usando `localStorage` com chave `taskboard:board-view:{boardId}` (JSON),
  engolindo qualquer erro de leitura/escrita (modo anônimo, quota) e caindo no padrão
  (`EMPTY_BOARD_FILTER`, `'kanban'`).
  - **Pré:** 1.1 concluída.
  - **Aceite:** `loadBoardViewPreference` nunca lança (try/catch interno); `localStorage`
    indisponível (ex.: SSR, `typeof window === 'undefined'`) retorna o padrão sem erro;
    `saveBoardViewPreference` não lança em ambiente sem `localStorage`.
  - **Guardrail:** chave de `localStorage` inclui `boardId` — preferência é por quadro, não
  > ✅ 2026-07-07 15:05 — load/saveBoardViewPreference com chave por boardId, try/catch interno.
    global.

## 2. Hook de derivação

- [x] 2.1 Criar `hooks/use-board-filters.hook.ts` com `useBoardFilters(board: BoardState,
  filters: BoardFilterState): { visibleCardIds: Set<string>; filteredCards: FilteredCard[] }`
  (`FilteredCard = CardState & { listId: string; listTitle: string }`), usando `useMemo` com
  dependências `[board, filters]`, iterando `board.lists`/`list.cards` e aplicando
  `matchesFilter` (task 1.2).
  - **Pré:** 1.1, 1.2 concluídas.
  - **Aceite:** `filteredCards` inclui `listId`/`listTitle` de cada cartão; `visibleCardIds`
    contém exatamente os ids que `matchesFilter` aprovou; recalcula automaticamente quando
    `board` muda (ex.: após `applyCardUpdated` do socket) sem necessidade de nenhum efeito
    adicional.
  - **Não faça:** manter cópia própria do estado de cartões fora do `board` recebido — o hook
  > ✅ 2026-07-07 15:05 — useBoardFilters criado com useMemo([board, filters]); sem cópia própria de estado.
    não pode "congelar" um snapshot que perderia atualizações do socket.

## 3. Kanban — atenuar sem esconder colunas

- [x] 3.1 Extrair `components/board-view-kanban.component.tsx` a partir do bloco atual de
  `DragDropContext`/`Droppable`/`KanbanColumn` em `board-view.component.tsx`, recebendo
  `sortedLists`, `visibleCardIds` e os handlers já existentes (`onRenameList`, `onDeleteList`,
  etc.) como props — **sem** mudança de comportamento de drag-and-drop.
  - **Pré:** 2.1 concluída.
  - **Aceite:** o quadro renderiza exatamente como antes desta change quando nenhum filtro está
    ativo (`visibleCardIds` = todos os cartões); `handleDragEnd` continua funcionando sem
    alteração de assinatura.
  - **Não faça:** mudar a lógica de `handleDragEnd`/`moveCard`/`moveList` (permanece em
  > ✅ 2026-07-07 15:05 — BoardViewKanban extraído; handleDragEnd inalterado; Kanban idêntico sem filtro ativo.
    `board-view.component.tsx`, só o JSX de renderização é extraído).

- [x] 3.2 Ajustar `kanban-column.component.tsx` e `kanban-card.component.tsx` para aceitar
  `isFilteredOut?: boolean` (default `false`): coluna passa a contar só cartões em
  `visibleCardIds` no cabeçalho (`sortedCards.filter(...).length`); cartão fora do filtro recebe
  `opacity-40 pointer-events-none` (permanece no DOM/`Droppable`, não é removido nem some da
  lista).
  - **Pré:** 3.1 concluída.
  - **Aceite:** com um filtro ativo, cartões que não batem ficam visualmente atenuados mas as
    colunas continuam todas visíveis (mesmo vazias); cartão atenuado não é arrastável
    (`pointer-events-none` bloqueia o handle de drag); contador do cabeçalho da coluna reflete
    só os cartões visíveis.
  - **Não faça:** remover cartões filtrados do DOM/`Droppable` — o requisito é atenuar, não
  > ✅ 2026-07-07 15:05 — isFilteredOut adicionado a KanbanCard/KanbanColumn; contador conta só visibleCardIds; cartão atenuado (opacity-40 pointer-events-none) permanece no DOM/Droppable.
    esconder.

## 4. Visão Lista

- [x] 4.1 Criar `components/board-view-list.component.tsx`: tabela semântica
  (Cartão/Lista/Responsáveis/Etiquetas/Prazo), uma linha por item de `filteredCards` (ordenados
  por `listTitle` e depois `position`), reaproveitando `CardDueBadge` (`018`) para a coluna
  Prazo (`—` quando `dueDate === null`) e `CardAssigneeAvatar`/`LabelChip` para as demais
  colunas; clique na linha chama `onOpen(card.id)` (mesmo `CardDetailModal` de `018`).
  - **Pré:** 2.1 concluída.
  - **Aceite:** layout reproduz o mockup (comparar com os PNGs `02-views*`); nenhuma coluna
    inventa dado que o cartão não tem (responsável vazio = sem avatar, não placeholder);
    clicar numa linha abre o modal de detalhe do cartão correspondente.
  - **Não faça:** oferecer drag-and-drop para reordenar linhas.
  > ✅ 2026-07-07 15:05 — BoardViewList criado (tabela semântica <table>), ordenado por listTitle/position, abre CardDetailModal via onOpenCard.

## 5. Visão Calendário

- [x] 5.1 Criar `components/board-view-calendar.component.tsx`: grid mensal (estado local
  `month: Date`, navegação `‹`/`›`/"Hoje", não persistido), 7 colunas (dom–sáb) × N semanas,
  cada dia exibindo os cartões de `filteredCards` cujo `dueDate` cai naquele dia civil (mesmo
  critério de `classifyDueDate`); faixa lateral "Sem prazo" com os cartões de `filteredCards`
  cujo `dueDate === null`; clique em qualquer cartão (grid ou faixa) chama `onOpen(card.id)`.
  - **Pré:** 2.1 concluída.
  - **Aceite:** layout reproduz o mockup (comparar com os PNGs `03-views*`); dia de hoje é
    destacado visualmente (mockup: círculo preenchido); dia com mais cartões do que cabe mostra
    "+K" sem quebrar o layout; cartões sem prazo aparecem só na faixa lateral, nunca no grid.
  - **Não faça:** implementar popover de "+K cartões" (fora de escopo, ver `design.md`).
  > ✅ 2026-07-07 15:05 — BoardViewCalendar criado com navegação de mês, faixa lateral 'sem prazo', +K quando excede MAX_CARDS_PER_DAY.

## 6. Barra de filtros e seletor de visão

- [x] 6.1 Criar `components/board-view-switcher.component.tsx`: segmented control de três
  botões (Kanban/Lista/Calendário, ícones `LayoutGrid`/`Rows3`/`CalendarDays` de `lucide-react`),
  recebendo `activeView`/`onChange`.
  - **Pré:** nenhuma.
  - **Aceite:** botão da visão ativa tem destaque visual (fundo/cor) igual ao mockup; clicar
    troca `activeView` sem recarregar o quadro.
  > ✅ 2026-07-07 15:05 — BoardViewSwitcher criado (segmented control Kanban/Lista/Calendário, lucide-react icons).

- [x] 6.2 Criar `components/board-filter-bar.component.tsx`: botão "+ Filtro" abrindo um popover
  com quatro seções (Etiqueta, Responsável, Prazo, Busca), reaproveitando o padrão visual de
  checkbox-list do `LabelPopover` (`016`) para Etiqueta/Responsável/Prazo e um `Input` de texto
  para Busca; cada filtro ativo vira um chip removível na barra (`✕` no chip); botão "Limpar
  filtros" só aparece quando `countActiveFilters(filters) > 0`.
  - **Pré:** 1.2, 6.1 concluídas.
  - **Aceite:** marcar uma etiqueta/responsável/opção de prazo atualiza `filters` e aparece como
    chip; remover o chip (✕) desmarca a opção correspondente; "Limpar filtros" reseta para
    `EMPTY_BOARD_FILTER` sem alterar `activeView`; contador de filtros ativos exibido no botão
    "Filtro" bate com `countActiveFilters`.
  - **Não faça:** colocar a busca textual sempre visível fora do popover (decisão registrada no
  > ✅ 2026-07-07 15:05 — BoardFilterBar criado: popover com 4 seções + chips removíveis + Limpar filtros (countActiveFilters).
    `design.md`: dentro do popover, para não competir com a busca global da sidebar).

## 7. `BoardView` — orquestração de filtro/visão/persistência

- [x] 7.1 Ajustar `board-view.component.tsx` para inicializar `filters`/`activeView` via
  `loadBoardViewPreference(board.id)` (`useState(() => ...)`, não `useEffect`), persistir a cada
  mudança via `saveBoardViewPreference` (efeito com dependências `[board.id, filters,
  activeView]`), calcular `{ visibleCardIds, filteredCards }` via `useBoardFilters(board,
  filters)`, renderizar `BoardFilterBar` + `BoardViewSwitcher` abaixo do `BoardToolbar`, e
  escolher entre `BoardViewKanban`/`BoardViewList`/`BoardViewCalendar` conforme `activeView`.
  - **Pré:** 1.3, 2.1, 3.1, 4.1, 5.1, 6.1, 6.2 concluídas.
  - **Aceite:** reabrir o mesmo quadro (mesmo `boardId`) restaura o filtro e a visão da sessão
    anterior; trocar de quadro (`boardId` diferente) não herda o filtro/visão do quadro anterior;
    nenhuma requisição HTTP nova é feita ao trocar de visão ou aplicar um filtro (é só re-render
    do `BoardState` já carregado).
  - **Não faça:** buscar o quadro de novo ao trocar de visão — é a mesma `BoardState` em
  > ✅ 2026-07-07 15:05 — board-view.component.tsx orquestra filters/activeView via loadBoardViewPreference/saveBoardViewPreference + useBoardFilters; nenhuma requisição nova ao trocar de visão.
    memória, só reorganizada.

## 8. i18n

- [x] 8.1 Mapear em `messages.pt.ts`/`messages.en.ts` as chaves `boardFilters.*` (rótulos das
  quatro categorias, opções de prazo — atrasado/hoje/próximos 7 dias/sem prazo —, placeholder de
  busca, "Limpar filtros", contador de filtros ativos) usadas pelos componentes da task 6.
  - **Pré:** 6.1, 6.2 concluídas.
  - **Aceite:** nenhum texto novo hardcoded fora de `getMessage(...)`, seguindo a mesma
    convenção de `cardDetail.*` (`018`).
  > ✅ 2026-07-07 15:05 — chaves boardFilters.* mapeadas em pt/en.

- [x] 8.2 Mapear em `messages.pt.ts`/`messages.en.ts` as chaves `boardViews.*` (rótulos
  Kanban/Lista/Calendário, cabeçalhos da tabela da visão Lista, nomes de mês/dia da visão
  Calendário, "Sem prazo", "Nenhum cartão com estes filtros") usadas pelas tasks 3–5.
  - **Pré:** 3.2, 4.1, 5.1 concluídas.
  - **Aceite:** nenhum texto novo hardcoded fora de `getMessage(...)`; textos batem com os PNGs
    do mockup (`01-views*` a `04-views*`).

  > ✅ 2026-07-07 15:05 — chaves boardViews.* mapeadas em pt/en.

## 9. Verificação

- [x] 9.1 Rodar `npx tsc --noEmit -p apps/frontend`, `npm run lint`/`check-types` (via turbo,
  filtro `@taskboard/frontend`) e `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm run build` (dentro de
  `apps/frontend`).
  - **Pré:** tasks 1–8 concluídas.
  - **Aceite:** `tsc` limpo; lint/check-types sem erros; build verde (Next Turbopack, todas as
    rotas compiladas).
  > ✅ 2026-07-07 15:05 — tsc --noEmit limpo; turbo lint/check-types sem erros; NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm run build verde (rotas geradas).

- [x] 9.2 Validar manualmente no navegador com dois usuários/abas conectados ao mesmo quadro:
  aplicar cada tipo de filtro isoladamente e combinado, trocar entre as três visões, e confirmar
  que uma mudança feita por outra aba (ex.: adicionar etiqueta/prazo/responsável a um cartão)
  aparece filtrada/posicionada corretamente na visão corrente sem reload. Confirmar que fechar e
  reabrir o quadro restaura o filtro/visão da sessão anterior.
  - **Pré:** 9.1 concluída.
  - **Aceite:** evidência registrada descrevendo cada filtro/visão testado e o reflexo ao vivo
    observado, incluindo a restauração de preferência via `localStorage`.
