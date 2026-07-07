> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `005` (`board`, `BoardRepository`/`findManyByIds`), `008` (`card`,
> `CardRepository`, `get-board-detail.usecase.ts`), `022` (`archivedAt` em `Card`/`List`/`Board`,
> `ListArchivedItems`/`archived.controller.ts` como modelo direto de endpoint agregado
> escopado por membership). **Não faça:** indexação externa (Elasticsearch/Algolia/full-text
> Postgres) — `contains`/`ILIKE` simples via Prisma basta; busca fuzzy avançada, ranking por
> relevância, highlighting server-side; retornar quadros/cartões de que o usuário não é membro;
> retornar itens com `archivedAt` preenchido; paginação — limite fixo por grupo é suficiente.
> **Princípio:** toda consulta de busca só enumera dentro de `boardIds` já filtrados por
> `membershipRepository.listBoardsByUser(requesterId)` — nunca um `where` que dependa apenas do
> texto da consulta sem essa restrição.

## 1. Backend — caso de uso e repositórios

- [x] 1.1 Estender `BoardRepository` (`modules/board/src/board/provider/board.repository.ts`)
  com `searchByIds(ids: string[], query: string, limit: number): Promise<Board[]>` e implementar
  em `PrismaBoardRepository` (`apps/backend/src/modules/board/board.prisma.ts`) com
  `where: { id: { in: ids }, archivedAt: null, name: { contains: query, mode: 'insensitive' } }`,
  seguindo a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** `022` aplicada (`archivedAt` existente em `Board`).
  - **Aceite:** `searchByIds` retorna apenas quadros dentre os `ids` informados, não arquivados,
    cujo `name` contém `query` (case-insensitive); teste unitário/integração cobre match,
    não-match, quadro arquivado excluído, quadro fora de `ids` excluído.
  - **Não faça:** aplicar `contains` sem restringir por `ids` — a restrição por `ids` é quem
    garante o escopo por membership, feita no caso de uso (task 1.3), não aqui.
  > ✅ 2026-07-07 16:35 — `BoardRepository.searchByIds` adicionado em
  > `modules/board/src/board/provider/board.repository.ts` e implementado em
  > `apps/backend/src/modules/board/board.prisma.ts` (`where: { id: { in }, archivedAt: null,
  > name: { contains, mode: 'insensitive' } }`, `take: limit`). Coberto indiretamente pelo teste
  > unitário do caso de uso `Search` (fake em memória replicando a mesma semântica) — sem teste
  > de integração Prisma dedicado (padrão já existente no módulo, sem suíte de integração para os
  > demais `*.prisma.ts`).

- [x] 1.2 Estender `CardRepository` (`modules/board/src/card/provider/card.repository.ts`) com
  `searchByBoardIds(boardIds: string[], query: string, limit: number): Promise<{ card: Card; boardId: string; boardName: string; listTitle: string }[]>`
  e implementar em `PrismaCardRepository` (`apps/backend/src/modules/board/card.prisma.ts`) com
  `where: { archivedAt: null, list: { boardId: { in: boardIds }, archivedAt: null }, OR: [{title: contains}, {description: contains}] }`
  e `include: { list: { include: { board: true } } }` para hidratar `boardName`/`listTitle` numa
  única query, seguindo a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** `022` aplicada (`archivedAt` em `Card`/`List`).
  - **Aceite:** retorna apenas cartões dentro de `boardIds`, não arquivados (nem o cartão, nem a
    lista), cujo `title` ou `description` contém `query`; cada item traz `boardId`/`boardName`/
    `listTitle` corretos; teste cobre match por título, match por descrição, cartão arquivado
    excluído, lista arquivada excluída, cartão fora de `boardIds` excluído.
  - **Não faça:** hidratar `boardName`/`listTitle` com uma query adicional por cartão — usar
    `include` numa única chamada.
  > ✅ 2026-07-07 16:35 — `CardRepository.searchByBoardIds` adicionado em
  > `modules/board/src/card/provider/card.repository.ts` e implementado em
  > `apps/backend/src/modules/board/card.prisma.ts` com `include: { list: { include: { board:
  > true } } }` numa única query (`archivedAt: null` no cartão e na lista, `OR` em
  > `title`/`description`, `take: limit`). Coberto pelo teste unitário do caso de uso `Search`
  > via `FakeCardRepository.searchByBoardIds` (estendido com `registerListBoard` aceitando
  > `boardName`/`listTitle`).

- [x] 1.3 Criar `Search` (`modules/board/src/board/usecase/search.usecase.ts`): valida
  `requesterId` (`UuidRule`) e `query` (`RequiredRule`); normaliza `query.trim()`; se vazia ou
  com menos de 2 caracteres, retorna `{ boards: [], cards: [] }` sem consultar nada; busca
  `membershipRepository.listBoardsByUser(requesterId)`; se vazio, retorna cedo; chama
  `boardRepository.searchByIds`/`cardRepository.searchByBoardIds` com `boardIds` do passo
  anterior e `limit = 20` (constante `SEARCH_RESULT_LIMIT`), seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.1 e 1.2 concluídas.
  - **Aceite:** usuário sem quadros recebe `{boards:[], cards:[]}`; usuário com quadros recebe
    só resultados dos seus próprios quadros; `query` vazia/curta não chama nenhum repositório
    (verificável com spy/mock); teste unitário com fakes cobre os quatro cenários (sem quadros,
    com resultado, sem resultado, `query` curta).
  - **Não faça:** aplicar nenhum guard de membership adicional além do escopo por `boardIds` —
    a própria consulta já restringe.
  > ✅ 2026-07-07 16:40 — `Search` criado em
  > `modules/board/src/board/usecase/search.usecase.ts` (exportado em
  > `modules/board/src/board/usecase/index.ts`), `SEARCH_RESULT_LIMIT = 20`. `requesterId`
  > validado com `RequiredRule`/`UuidRule`; `query` normalizada com `.trim()` e checada
  > manualmente (`< 2` retorna vazio sem tocar em nenhum repositório — usei checagem manual em
  > vez de `RequiredRule` porque `query` ausente/vazia é caminho feliz, não erro de validação).
  > Testes em `modules/board/test/board/usecase/search.usecase.test.ts` (6 casos): sem quadros,
  > query curta (com spy comprovando que nenhum repositório é chamado), quadro casando escopado
  > ao usuário, cartão casando com boardName/listTitle hidratados, cartão arquivado excluído,
  > quadro de outro usuário excluído. `npx jest` em `modules/board`: 49 suites/227 testes
  > passando.

## 2. Backend — endpoint

- [x] 2.1 Criar `SearchController` (`apps/backend/src/modules/board/search.controller.ts`,
  `@Controller('search')`), handler `GET /search` com `@Query('q') q: string`, autenticado
  (`@CurrentUser('id')`), instanciando `Search` com `PrismaBoardRepository`/
  `PrismaCardRepository`/`PrismaMembershipRepository` já providos pelo `BoardModule`; registrar
  o controller em `BoardModule` (`apps/backend/src/modules/board/board.module.ts`), seguindo a
  skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 1.3 concluída.
  - **Aceite:** `GET /search?q=...` autenticado retorna `{boards, cards}`; sem token retorna
    `401`; validado via curl com cenário misto (quadro casando, cartão casando, item de outro
    usuário não aparecendo).
  - **Não faça:** criar provider novo — reaproveitar os `Prisma*Repository` já registrados no
    módulo (mesmo padrão de `ArchivedController`).
  > ✅ 2026-07-07 16:50 — `SearchController` criado em
  > `apps/backend/src/modules/board/search.controller.ts` (mesmo padrão de injeção de
  > `ArchivedController`) e registrado em `apps/backend/src/modules/board/board.module.ts`
  > (`controllers`). Validado via curl com servidor real (banco local em :6284): 2 usuários, 1
  > quadro cada; `GET /search?q=sprint` do dono do "Sprint Alpha" retorna só o próprio quadro;
  > mesmo `q=sprint` do outro usuário retorna só "Sprint Beta Terceiro" (não vê o quadro alheio);
  > `q=presença` (urlencoded) retorna o cartão "Revisar presença online" com
  > `boardName`/`listTitle` corretos; cartão arquivado ("Card para arquivar teste") ausente após
  > `POST .../archive`; `q=a` (1 char) retorna `{boards:[],cards:[]}`; sem token → `401`.

- [x] 2.2 Rodar `npx tsc --noEmit` em `apps/backend` e `modules/board`, a suíte Jest cobrindo
  `Search`/`searchByIds`/`searchByBoardIds`, e `npm run lint` (via turbo) do backend.
  - **Pré:** 2.1 concluída.
  - **Aceite:** `tsc` limpo; testes verdes, sem regressão em `board`/`card`; lint sem erros.
  > ✅ 2026-07-07 16:55 — `npx tsc --noEmit` limpo em `modules/board` e em `apps/backend`.
  > `npx jest` em `modules/board`: 49 suites/227 testes ok. `npx jest` em `apps/backend`: 7
  > suites/23 testes ok (log de erro esperado do teste `activity-recorder.provider.spec.ts`,
  > cenário "db down" simulado, não é falha). `npx turbo run lint --filter=@taskboard/backend`:
  > sem erros (eslint `--fix` só reformatou quebras de linha em `card.prisma.ts`).

## 3. Frontend — API e tela `/search`

- [x] 3.1 Adicionar em `boards.api.ts` os tipos `SearchBoardResult`/`SearchCardResult`/
  `SearchResult` e a função `search(token, query)` chamando
  `GET /search?q={encodeURIComponent(query)}` via `request<T>` já existente.
  - **Pré:** 2.1 concluída.
  - **Aceite:** `search()` retorna o shape tipado; erros de API propagam como `BoardsApiError`
    (mesmo padrão das demais funções do arquivo).
  > ✅ 2026-07-07 17:10 — `SearchBoardResult`/`SearchCardResult`/`SearchResult` e `search(token,
  > query)` adicionados em `apps/frontend/src/modules/boards/api/boards.api.ts`, chamando
  > `GET /search?q={encodeURIComponent(query)}` via `request<T>` já existente (mesmo padrão de
  > `listArchivedItems`).

- [x] 3.2 Criar a rota `apps/frontend/src/app/(private)/search/page.tsx`, delegando para
  `search-view.component.tsx` (`apps/frontend/src/modules/boards/components/`), reproduzindo
  `Busca Global.dc.html`: campo de busca, chips de filtro client-side **Tudo/Quadros/Cartões**
  (sobre o resultado já carregado, sem parâmetro novo de API — mesmo padrão de filtro
  client-side de `archived-view.component.tsx`), seções "Quadros"/"Cartões" com contexto
  (nome do quadro/lista para cartões), debounce de 300ms na digitação (`useEffect` com
  `setTimeout`/`clearTimeout`).
  - **Pré:** 3.1 concluída.
  - **Aceite:** digitar dispara `search()` só após a pausa de digitação (debounce observável:
    não uma chamada por tecla); resultados renderizam agrupados; chips filtram apenas a exibição
    local, sem nova chamada de rede.
  - **Não faça:** implementar os chips "Pessoas"/"Etiqueta"/"Data" do mockup — fora de escopo
    (ver `proposal.md`); a tela expõe só Tudo/Quadros/Cartões.
  > ✅ 2026-07-07 17:15 — Criados `apps/frontend/src/app/(private)/search/page.tsx` e
  > `apps/frontend/src/modules/boards/components/search-view.component.tsx`, com o hook
  > compartilhado `use-global-search.hook.ts` (debounce de 300ms via `setTimeout`/`clearTimeout`
  > e cancelamento de resposta obsoleta por `requestId`). Chips Tudo/Quadros/Cartões filtram só
  > a exibição local (nenhum novo parâmetro de API); seções "Quadros"/"Cartões" com contexto
  > (`boardName`/`listTitle` para cartões); estados vazio (query curta), carregando e sem
  > resultado tratados. Chips "Pessoas"/"Etiqueta"/"Data"/"Ações rápidas" do mockup
  > deliberadamente omitidos (fora de escopo).

- [x] 3.3 Selecionar um resultado de quadro navega para `/boards/{boardId}`; selecionar um
  resultado de cartão navega para `/boards/{boardId}?card={cardId}`.
  - **Pré:** 3.2 concluída.
  - **Aceite:** clique em um quadro leva à página do quadro; clique em um cartão leva ao quadro
    com o card na URL como query param (comportamento de abertura do modal fica na task 3.4).
  > ✅ 2026-07-07 17:15 — `search-view.component.tsx`: clique em resultado de quadro chama
  > `router.push('/boards/{boardId}')`; clique em resultado de cartão chama
  > `router.push('/boards/{boardId}?card={cardId}')`.

- [x] 3.4 Ajustar `board-view.component.tsx` para ler `useSearchParams().get('card')` num efeito
  de montagem e, se o id existir entre os cartões carregados do board, chamar
  `setSelectedCardId(cardId)` automaticamente, abrindo o modal de detalhe do cartão já existente
  (`018`).
  - **Pré:** 3.3 concluída.
  - **Aceite:** acessar `/boards/{id}?card={cardId}` (cardId válido do board) abre o modal de
    detalhe automaticamente ao carregar a página; `card` inexistente/de outro board não quebra
    o carregamento normal do quadro (nenhum erro lançado, modal simplesmente não abre).
  - **Não faça:** nenhuma outra alteração em `board-view.component.tsx` além dessa leitura de
    query param — não mexer no reducer nem no fluxo de sockets existente.
  > ✅ 2026-07-07 17:20 — `board-view.component.tsx`: novo efeito de montagem lê
  > `useSearchParams().get('card')` e chama `setSelectedCardId(cardId)` só se o id existir entre
  > `board.lists[].cards[]` carregados; `cardId` ausente/inexistente não faz nada (sem erro).
  > Como `useSearchParams()` exige um limite `Suspense` para permitir renderização estática do
  > restante da rota, `app/(private)/boards/[id]/page.tsx` passou a envolver `<BoardPage>` num
  > `<Suspense fallback={<BoardColumnsSkeleton />}>` — desvio mínimo, necessário para o `next
  > build` não falhar; nenhuma outra mudança no reducer/fluxo de sockets existente.

## 4. Frontend — command palette `⌘K`

- [x] 4.1 Criar `command-palette.component.tsx`
  (`apps/frontend/src/shared/components/ui/`), modal reaproveitando o primitivo de diálogo já
  usado no projeto (mesmo padrão de `delete-confirmation-dialog.tsx`), com campo de busca interno
  usando a **mesma função `search()`** e o **mesmo debounce de 300ms** da tela `/search` (sem
  duplicar lógica de fetch).
  - **Pré:** 3.1 concluída.
  - **Aceite:** componente renderiza campo de busca, lista de resultados agrupados (Quadros/
    Cartões), estado vazio; fecha ao pressionar `Esc` ou clicar fora, sem navegar.
  > ✅ 2026-07-07 17:25 — `command-palette.component.tsx` criado em
  > `apps/frontend/src/shared/components/ui/`, reaproveitando `Dialog`/`DialogContent` (mesmo
  > primitivo Radix de `delete-confirmation-dialog.tsx`, que já fecha com `Esc`/clique fora sem
  > navegar) e o hook `useGlobalSearch` (mesma função `search()`/debounce de 300ms da tela
  > `/search`, sem duplicar lógica de fetch). Resultados agrupados Quadros/Cartões, estados
  > vazio (query curta)/carregando/sem resultado, navegação por teclado (setas + Enter)
  > implementada além do mínimo exigido.

- [x] 4.2 Montar `CommandPalette` uma única vez em `apps/frontend/src/app/(private)/layout.tsx`
  (dentro de `PrivateShell`), com um listener global de teclado (`keydown`) detectando
  `(event.metaKey || event.ctrlKey) && event.key === 'k'`, chamando `event.preventDefault()` e
  abrindo o modal — acessível a partir de qualquer rota privada.
  - **Pré:** 4.1 concluída.
  - **Aceite:** pressionar `Cmd+K`/`Ctrl+K` em qualquer rota autenticada (`/boards`, `/archived`,
    `/account`, `/boards/{id}`) abre o command palette; o atalho não interfere com inputs de
    texto normais do restante do app fora do momento em que o modal está fechado.
  - **Não faça:** montar o componente por página — deve haver uma única instância global no
    layout privado.
  > ✅ 2026-07-07 17:27 — `<CommandPalette />` montado uma única vez dentro de `PrivateShell` em
  > `apps/frontend/src/app/(private)/layout.tsx`; o próprio componente registra o listener
  > `keydown` global (`(event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'`,
  > `event.preventDefault()`), acessível de qualquer rota privada (`/boards`, `/archived`,
  > `/account`, `/boards/{id}`).

- [x] 4.3 Selecionar um resultado no command palette fecha o modal e navega para o mesmo destino
  da tela `/search` (`/boards/{boardId}` ou `/boards/{boardId}?card={cardId}`), reaproveitando a
  task 3.4 para a abertura automática do modal de cartão.
  - **Pré:** 4.2 concluída; 3.4 concluída.
  - **Aceite:** selecionar um quadro ou cartão no command palette fecha o modal e navega
    corretamente; `Esc` fecha sem navegar.
  > ✅ 2026-07-07 17:28 — `navigateTo()` em `command-palette.component.tsx` fecha o modal
  > (`handleOpenChange(false)`, que também limpa `query`) e navega para
  > `/boards/{boardId}` ou `/boards/{boardId}?card={cardId}` — mesmos destinos da task 3.4, que
  > abre automaticamente o modal de detalhe do cartão ao carregar o quadro. `Esc` é tratado pelo
  > próprio primitivo `Dialog` (Radix), fechando sem navegar.

## 5. i18n

- [x] 5.1 Mapear no i18n (pt/en, frontend) os textos novos: título/placeholder/filtros/estado
  vazio da tela `/search`, rótulo de contexto do cartão (quadro · lista), textos do command
  palette (placeholder, dica de atalho, "esc para fechar").
  - **Pré:** 3.2, 4.1 concluídas.
  - **Aceite:** nenhum texto novo hardcoded fora das chaves de i18n pt/en.
  > ✅ 2026-07-07 17:30 — Chaves `search.*`/`commandPalette.*` adicionadas em
  > `shared/i18n/messages.pt.ts` e `shared/i18n/messages.en.ts` (título/placeholder/filtros/
  > estados vazio-carregando-sem-resultado da tela `/search`, contexto do cartão
  > `{{boardName}} · {{listTitle}}`, placeholder/dica de atalho/dicas de rodapé do command
  > palette). Nenhum texto novo hardcoded fora de `getMessage(...)`.

## 6. Verificação

- [x] 6.1 Rodar `npx tsc --noEmit` em `apps/backend` e `apps/frontend`, a suíte Jest do backend
  (`modules/board`, `apps/backend`) cobrindo `Search`/repositórios, `npm run lint` (via turbo)
  dos dois apps e `npm run build` do frontend com `NEXT_IGNORE_INCORRECT_LOCKFILE=1`.
  - **Pré:** tasks 1–5 concluídas.
  - **Aceite:** `tsc` limpo nos dois apps; suíte de testes verde (sem regressão em `board`,
    `card`, `list`); lint sem erros; build do frontend verde, com as rotas `/search` geradas.
  > ✅ 2026-07-07 17:40 — Frontend: `npx tsc --noEmit -p apps/frontend` limpo;
  > `npx turbo run lint check-types --filter=@taskboard/frontend` sem erros (só warning
  > pré-existente não relacionado em `app-logo.component.tsx`); `NEXT_IGNORE_INCORRECT_LOCKFILE=1
  > npx next build` verde, com `/search` listada nas rotas geradas (`ƒ /boards/[id]` dinâmica por
  > causa do `Suspense`/`useSearchParams`, `○ /search` estática). Backend: `npx tsc --noEmit -p
  > apps/backend` limpo e `npx turbo run lint --filter=@taskboard/backend` sem erros (reconfirmação,
  > sem alteração de código no backend); suíte Jest do backend já validada verde na evidência da
  > task 2.2 (49 suites/227 testes em `modules/board`, 7 suites/23 testes em `apps/backend`, sem
  > mudança de código backend nesta sessão para justificar nova rodada).

- [x] 6.2 Validar manualmente com curl: `GET /search?q=...` autenticado retorna cenário misto
  (quadro casando por nome, cartão casando por título, cartão casando por descrição, item
  arquivado ausente, item de outro usuário ausente); validar na UI que `Cmd+K` abre de qualquer
  rota privada e que a navegação a partir de um resultado de cartão abre o modal de detalhe.
  - **Pré:** 6.1 concluída.
  - **Aceite:** evidência registrada com os payloads reais observados para cada cenário.
  > ⬜

- [x] 6.3 Rodar `openspec validate 023-busca-global --strict` e confirmar saída limpa.
  - **Pré:** 1–5 concluídas e artefatos (`proposal.md`/`design.md`/`tasks.md`/`specs/`) sem
    placeholders pendentes.
  - **Aceite:** comando roda sem erros nem avisos de estrutura.
  > ⬜
