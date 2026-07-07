> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/filtros-visoes/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/filtros-visoes/spec.md`) ·
> `openspec/changes/019-filtros-e-visoes/mockups/` (`Filtros e Visoes.dc.html` e os PNGs
> `01-views*`/`02-views*`/`03-views*`/`04-views*`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O quadro do TaskBoard Live já carrega, via `GET /boards/:id`, tudo o que um cartão precisa para
ser filtrado e reorganizado: etiquetas (`016`), prazo/responsáveis/checklist (`017`, `018`). Mas
o frontend só sabe mostrar esse estado de uma única forma — colunas Kanban, sem nenhum recorte.
Quando um quadro cresce (dezenas de cartões espalhados por várias listas), encontrar "meus
cartões atrasados" ou "tudo com a etiqueta Frontend" exige varrer coluna por coluna. O mockup
(`Filtros e Visoes.dc.html`) resolve isso com duas peças **puramente client-side**: uma **barra
de filtros** (etiqueta, responsável, prazo, busca textual) que esconde/atenua cartões sem
esconder as colunas, e um **seletor de visão** (Kanban/Lista/Calendário) que reorganiza os
mesmos cartões filtrados em três layouts diferentes. Nenhum dado novo é necessário — é derivação
pura do `BoardState` que `018` já deixou completo (`labels`, `dueDate`, `assignees`,
`checklist`, `title`).

## What Changes

- Esta change é **100% frontend, sem backend novo**: nenhum endpoint, caso de uso, migration ou
  campo novo no payload de cartão. Filtragem e agrupamento são derivações client-side do
  `BoardState` já carregado e reconciliado ao vivo pelo `useBoardSocket` (`015`/`016`/`017`/
  `018`).
- Adicionar uma **barra de filtros** ao quadro (`board-filter-bar.component.tsx`), abaixo do
  `BoardToolbar`, com: filtro por etiqueta (multi-seleção, catálogo de `board.labels`), filtro
  por responsável (multi-seleção, `BoardView.members`), filtro por prazo (`atrasado`/`hoje`/
  `próximos 7 dias`/`sem prazo`, reaproveitando `classifyDueDate` de `018`), busca textual por
  título (client-side, case-insensitive, sem diacríticos), contador de filtros ativos e botão
  "Limpar filtros". Filtros são combináveis (E lógico entre categorias, OU dentro da mesma
  categoria).
- Adicionar um **seletor de visão** (`board-view-switcher.component.tsx`) com três opções:
  **Kanban** (atual, inalterado no layout), **Lista** (tabela agrupada por lista, colunas
  cartão/lista/responsáveis/etiquetas/prazo) e **Calendário** (grid mensal por `dueDate`, com uma
  faixa/lateral de "sem prazo" para cartões sem `dueDate`). As três visões leem o mesmo conjunto
  de cartões já filtrado.
- Extrair um hook puro `use-board-filters.hook.ts` que deriva, a partir de `BoardState` +
  estado de filtro, a lista de cartões visíveis (com a lista/coluna de origem anexada) — usado
  pelas três visões, garantindo que filtrar e trocar de visão nunca perdem sincronia com o
  socket (o hook opera sobre o mesmo `BoardState` que `card.updated`/`card.moved`/etc. já
  atualizam).
- Persistir a visão e os filtros ativos por quadro em `localStorage` (chave por `boardId`),
  restaurados ao reabrir o mesmo quadro.
- i18n pt/en de todos os textos novos (rótulos de filtro, opções de prazo, cabeçalhos da visão
  Lista, meses/dias da visão Calendário, estados vazios "nenhum cartão com estes filtros").

## Limite explícito desta change

Nenhum endpoint, caso de uso ou migration novos. Sem ordenação customizável ("Ordenar", visível
no mockup mas fora do escopo — ver `design.md`). Sem drag-and-drop nas visões Lista/Calendário
(mover cartão continua sendo feito na visão Kanban). Sem filtros salvos por usuário no backend
(persistência é só `localStorage`, client-side). Sem tela de "Configurações do Quadro" (`020`).

## Capabilities

### New Capabilities
- `filtros-visoes`: barra de filtros (etiqueta/responsável/prazo/busca textual, combináveis,
  contador + limpar) e seletor de visão (Kanban/Lista/Calendário) sobre o `BoardState` já
  carregado, com persistência local por quadro e reflexo ao vivo via Socket.IO — sem nenhum
  endpoint novo.

### Modified Capabilities
<!-- Nenhuma: esta change não altera o contrato de `016`/`017`/`018` (etiquetas, cartão rico,
detalhe do cartão) — só consome os campos que eles já expõem em `CardState`. -->

## Impact

- **Frontend**: `board-filter-bar.component.tsx`, `board-view-switcher.component.tsx`,
  `board-view-kanban.component.tsx` (extração do layout atual, sem mudança visual),
  `board-view-list.component.tsx`, `board-view-calendar.component.tsx`,
  `use-board-filters.hook.ts`, `board-filter.type.ts`, `board-filter.util.ts`,
  `board-view-preference.util.ts` (persistência em `localStorage`), ajustes em
  `board-view.component.tsx` (renderiza a barra de filtros + o seletor + a visão ativa em vez de
  sempre o layout Kanban direto), i18n pt/en.
- **Backend**: nenhum.
- **Domínio**: nenhum (consumo puro do `CardState` já definido por `016`/`017`/`018`).
- **Dependências**: `015` (`BoardView`, `KanbanColumn`, `KanbanCard`, `useBoardSocket`), `016`
  (`CardState.labels`, catálogo `board.labels`), `017`/`018` (`CardState.dueDate`/`assignees`/
  `checklist`, `classifyDueDate` de `due-date.util.ts`, `BoardView.members`).
- **Habilita**: `020` (tela de "Configurações do Quadro", que pode reaproveitar o padrão de
  popover/segmented-control estabelecido aqui).
