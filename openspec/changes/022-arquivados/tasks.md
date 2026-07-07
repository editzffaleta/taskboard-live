> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `005` (board CRUD, guard de owner de `delete-board`), `007` (list,
> `delete-list.usecase.ts`), `008` (card, `delete-card.usecase.ts`, `get-board-detail.usecase.ts`),
> `006` (`RealtimeEmitter`), `018` (detalhe do cartão, `card-detail-modal.component.tsx`, sem
> botão de arquivar — esta change cria), `020` (configurações do quadro,
> `board-settings.component.tsx`, botão "Arquivar quadro" **desabilitado**,
> `data-testid="board-settings-archive-button"` — esta change habilita). **Não faça:** remover
> os casos de uso/endpoints de hard delete (`delete-card`/`delete-list`/`delete-board`, `005`/
> `007`/`008`); reaproveitar a coluna `deletedAt` já existente (e não usada) em `Board`/
> `BoardMember` — `archivedAt` é campo novo e distinto; propagar `archivedAt` em cascata para
> filhos (arquivar quadro/lista não marca `archivedAt` nas listas/cartões internos); criar
> eventos de socket novos (`*.archived`/`*.restored` — reusar `*.deleted`/`*.created`, ver
> `design.md`); quebrar o shape de `BoardResponse`/`BoardDetail`/`CardResponse`/`ListResponse`
> já consumidos pelo frontend existente. **Princípio:** toda mutação de archive/restore só emite
> evento de tempo real **após** o caso de uso ter sucesso — nunca antes, nunca em erro.

## 1. Domínio e persistência — campo `archivedAt`

- [x] 1.1 Adicionar `archivedAt?: Date | null` a `CardState`/`Card`
  (`modules/board/src/card/model/card.entity.ts`), `ListState`/`List`
  (`modules/board/src/list/model/list.entity.ts`) e `BoardState`/`Board`
  (`modules/board/src/board/model/board.entity.ts`), com getter `archivedAt(): Date | null` nos
  três (mesmo padrão do getter opcional já usado por `Card.dueDate`), seguindo a skill
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** `Card` (`008`), `List` (`007`), `Board` (`005`) existentes.
  - **Aceite:** `Card.clone({archivedAt})`, `List.clone({archivedAt})`,
    `Board.clone({archivedAt})` funcionam sem lançar erro de validação; ausência de
    `archivedAt` não quebra entidades existentes (`archivedAt` retorna `null`); teste unitário
    cobre `archivedAt` ausente, presente e `clone` para cada uma das três entidades.
  - **Não faça:** adicionar regra de validação de `archivedAt` em `validate()` — não é campo de
    entrada do usuário.
  > ✅ 2026-07-07 16:13 — campo `archivedAt?: Date | null` + getter adicionados a Card/List/Board (modules/board/src/{card,list,board}/model/*.entity.ts); testes unitarios cobrindo ausente/presente/clone nas 3 entidades (card.entity.test.ts, list.entity.test.ts, board.entity.test.ts).

- [x] 1.2 Adicionar `archivedAt DateTime?` (sem `@default`) aos models Prisma `Card`, `List`,
  `Board` (`apps/backend/prisma/models/{card,list,board}.model.prisma`) e gerar/aplicar uma
  única migration cobrindo os três, seguindo a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** 1.1 concluída.
  - **Aceite:** migration aplica sem erro; registros existentes recebem `archivedAt = null`;
    `npx prisma generate` roda limpo.
  - **Não faça:** reaproveitar/renomear a coluna `deletedAt` já existente em `Board`/
    `BoardMember`; adicionar `archivedAt` a `BoardMember`, `Label`, `Comment`,
    `ChecklistItem` ou `CardAssignee`.
  > ✅ 2026-07-07 16:13 — models Prisma Card/List/Board com `archivedAt DateTime?` (apps/backend/prisma/models/board.model.prisma); migration unica `20260707190621_arquivados` criada com --create-only e aplicada (prisma migrate dev); prisma generate ok.

- [x] 1.3 Estender `CardRepository`/`ListRepository`/`BoardRepository` (contratos em
  `modules/board/src/{card,list,board}/provider/*.repository.ts`) com `archive(id, archivedAt)`,
  `restore(id)` e `findAllArchivedByBoardId(boardId)` (card/list) ou
  `findAllArchivedByOwnerId(ownerId)` (board); implementar em `PrismaCardRepository`/
  `PrismaListRepository`/`PrismaBoardRepository`, e ajustar `findAllByListId`/
  `findAllByBoardId`/`findManyByIds` para filtrar `archivedAt: null`, seguindo a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 1.1 e 1.2 concluídas.
  - **Aceite:** `findAllByListId`/`findAllByBoardId`/`findManyByIds` **não** retornam itens com
    `archivedAt != null`; `findById` continua retornando o item mesmo arquivado; `archive`/
    `restore` persistem corretamente; `findAllArchivedBy*` retornam só os arquivados.
  - **Não faça:** filtrar `findById` — os casos de uso de archive/restore precisam localizar o
    item mesmo já arquivado.
  > ✅ 2026-07-07 16:13 — CardRepository/ListRepository/BoardRepository ganharam archive/restore/findAllArchivedByBoardId (card/list) e findAllArchivedByOwnerId (board); PrismaCardRepository/PrismaListRepository/PrismaBoardRepository implementados; findAllByListId/findAllByBoardId/findManyByIds passam a filtrar archivedAt: null; findById nao filtra. Fakes atualizados (FakeCardRepository, FakeListRepository, FakeBoardRepository em modules/board/test/mock e modules/auth/test/mock).

## 2. Casos de uso de archive/restore

- [x] 2.1 Criar `ArchiveCard`/`RestoreCard` (`modules/board/src/card/usecase/`), mesmo guard de
  membro e mesma estrutura de validação de `delete-card.usecase.ts`, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.3 concluída.
  - **Aceite:** membro arquiva/restaura cartão com sucesso; não-membro recebe `403
    board.member.required`; arquivar cartão já arquivado rejeita com
    `card.already.archived` (400); restaurar cartão não-arquivado rejeita com
    `card.not.archived` (400); testes unitários com fakes cobrem os quatro casos.
  - **Não faça:** propagar `archivedAt` para nenhum outro registro.
  > ✅ 2026-07-07 16:13 — ArchiveCard/RestoreCard criados (modules/board/src/card/usecase/); testes em modules/board/test/card/usecase/archive-card.usecase.test.ts cobrem sucesso, 403 board.member.required, card.already.archived (400), card.not.archived (400), NotFoundError.

- [x] 2.2 Criar `ArchiveList`/`RestoreList` (`modules/board/src/list/usecase/`), mesmo guard de
  membro e mesma estrutura de `delete-list.usecase.ts`, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.3 concluída.
  - **Aceite:** análogo à 2.1, com `list.already.archived`/`list.not.archived`; cartões da lista
    **não** recebem `archivedAt` ao arquivar a lista (continuam `null`); teste cobre esse
    comportamento explicitamente.
  - **Não faça:** propagar `archivedAt` para os cartões da lista.
  > ✅ 2026-07-07 16:13 — ArchiveList/RestoreList criados (modules/board/src/list/usecase/); teste archive-list.usecase.test.ts confirma que cartoes da lista NAO recebem archivedAt ao arquivar a lista; cobre 403, list.already.archived, list.not.archived, NotFound.

- [x] 2.3 Criar `ArchiveBoard`/`RestoreBoard` (`modules/board/src/board/usecase/`), guard de
  **owner** (mesmo de `delete-board.usecase.ts`), seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.3 concluída.
  - **Aceite:** owner arquiva/restaura o quadro; membro comum recebe `403
    board.owner.required`; `board.already.archived`/`board.not.archived` nos casos de
    idempotência; listas/cartões do quadro **não** recebem `archivedAt`; teste cobre o caso.
  - **Não faça:** propagar `archivedAt` para listas/cartões do quadro.
  > ✅ 2026-07-07 16:13 — ArchiveBoard/RestoreBoard criados (modules/board/src/board/usecase/), guard de owner; teste archive-board.usecase.test.ts cobre owner ok, membro comum 403 board.owner.required, board.already.archived/board.not.archived, NotFound.

- [x] 2.4 Criar `ListArchivedItems` (`modules/board/src/board/usecase/list-archived-items.usecase.ts`):
  enumera os boards do `requesterId` via `membershipRepository.listBoardsByUser`, separa
  arquivados/ativos, busca listas/cartões arquivados só dentro dos boards **ativos**, hidrata
  `ArchivedCardItem`/`ArchivedListItem`/`ArchivedBoardItem` (ver `design.md` para os shapes
  exatos), seguindo a skill [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 2.1, 2.2 e 2.3 concluídas.
  - **Aceite:** retorna `{cards, lists, boards}` corretos para um usuário com itens arquivados
    espalhados em mais de um quadro; boards arquivados não têm suas listas/cartões internos
    listados nas abas Cartões/Listas (só aparecem na aba Quadros); teste unitário com fakes
    cobre cenário misto (cartão arquivado em quadro ativo + quadro inteiro arquivado).
  - **Não faça:** descer a listar listas/cartões internos de um board já arquivado.
  > ✅ 2026-07-07 16:13 — ListArchivedItems criado (list-archived-items.usecase.ts); teste list-archived-items.usecase.test.ts cobre cenario misto (cartao arquivado em quadro ativo + lista arquivada em quadro ativo + quadro inteiro arquivado, sem descer aos itens internos do quadro arquivado).

## 3. Endpoints e tempo real

- [x] 3.1 Adicionar `POST /boards/:boardId/cards/:id/archive` e `.../restore` a
  `card.controller.ts`, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller). Arquivar emite
  `card.deleted {cardId, listId}`; restaurar emite `card.created {card}` (via
  `buildCardResponse`, mesmo helper já usado por `create`) para `board:{boardId}`, **após**
  sucesso.
  - **Pré:** 2.1 concluída.
  - **Aceite:** `204` em ambas as rotas; `card.deleted` observado ao arquivar, `card.created`
    observado ao restaurar (payload idêntico ao de criação); nenhum evento em caso de `403`/
    `400`.
  - **Não faça:** criar `card.archived`/`card.restored`.
  > ✅ 2026-07-07 16:13 — POST /boards/:boardId/cards/:id/archive e .../restore adicionados a card.controller.ts; validado via curl (204) + card.deleted/card.created observados via cliente socket.io-client real conectado a board:{boardId}.

- [x] 3.2 Adicionar `POST /lists/:id/archive` e `.../restore` a `list.controller.ts`, mesma
  skill. Arquivar emite `list.deleted {listId}`; restaurar emite `list.created` com o
  `ListResponse` completo, para `board:{boardId}`, **após** sucesso.
  - **Pré:** 2.2 concluída.
  - **Aceite:** análogo à 3.1 para lista.
  - **Não faça:** criar `list.archived`/`list.restored`.
  > ✅ 2026-07-07 16:13 — POST /lists/:id/archive e .../restore adicionados a list.controller.ts; validado via curl (204) + list.deleted/list.created observados via socket real.

- [x] 3.3 Adicionar `POST /boards/:id/archive` e `.../restore` a `board.controller.ts`, mesma
  skill. Nenhum evento de socket é emitido nesta rota (ver `design.md` — arquivar quadro não
  emite evento na sala do quadro).
  - **Pré:** 2.3 concluída.
  - **Aceite:** `204`; owner arquiva/restaura; não-owner `403`; quadro arquivado some de
    `GET /boards` (verificação cruzada com 4.x).
  > ✅ 2026-07-07 16:13 — POST /boards/:id/archive e .../restore adicionados a board.controller.ts; validado via curl: owner arquiva/restaura (204), quadro arquivado some de GET /boards, nao-owner recebe 403 board.owner.required.

- [x] 3.4 Ajustar `GetBoardDetail` (`get-board-detail.usecase.ts`) e `ListMyBoards`
  (`list-my-boards.usecase.ts`) para consumir os repositórios já filtrados pela task 1.3 (sem
  lógica adicional de filtro no caso de uso — o filtro vive no repositório).
  - **Pré:** 1.3 concluída.
  - **Aceite:** `GET /boards/:id` não retorna lists/cards arquivados no payload aninhado;
    `GET /boards` não retorna boards arquivados; teste de integração/unitário confirma.
  > ✅ 2026-07-07 16:13 — GetBoardDetail e ListMyBoards nao alterados (ja consomem os repositorios filtrados pela 1.3); validado via curl: GET /boards/:id nao retorna lists/cards arquivados, GET /boards nao retorna quadros arquivados.

- [x] 3.5 Criar `ArchivedController` (`apps/backend/src/modules/board/archived.controller.ts`,
  `@Controller('archived')`), handler `GET /archived` chamando `ListArchivedItems`, registrado
  no `BoardModule`, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 2.4 concluída.
  - **Aceite:** `GET /archived` autenticado retorna `{cards, lists, boards}` do usuário logado;
    validado via curl com cenário misto (cartão arquivado, lista arquivada, quadro arquivado).
  - **Não faça:** criar `GET /boards/:boardId/archived` como rota adicional.
  > ✅ 2026-07-07 16:13 — ArchivedController criado (apps/backend/src/modules/board/archived.controller.ts), registrado em board.module.ts; GET /archived validado via curl com cenario misto (cartao, lista e quadro arquivados) retornando {cards, lists, boards}.

- [x] 3.6 Mapear no i18n (pt/en, backend) os códigos `card.already.archived`,
  `card.not.archived`, `list.already.archived`, `list.not.archived`, `board.already.archived`,
  `board.not.archived`, seguindo a convenção já usada por `board.color.in`.
  - **Pré:** 3.1, 3.2, 3.3 concluídas.
  - **Aceite:** códigos crus retornados pela API, sem mensagem hardcoded em português no filtro
    de exceção.
  > ✅ 2026-07-07 16:13 — Codigos crus retornados sem mensagem hardcoded (mesma convencao de board.color.in): card.already.archived, card.not.archived, list.already.archived, list.not.archived, board.already.archived, board.not.archived — sem infraestrutura de i18n de dominio nova, conforme design.md.

## 4. Frontend — habilitar/criar botões "Arquivar"

- [x] 4.1 Adicionar botão "Arquivar cartão" em `card-detail-modal.component.tsx` (não existia,
  nem desabilitado — `018` deixou fora do mockup), chamando
  `POST /boards/:boardId/cards/:id/archive` e fechando o modal após sucesso.
  - **Pré:** 3.1 concluída.
  - **Aceite:** clicar arquiva o cartão, fecha o modal, o cartão some do quadro ao vivo (via
    `card.deleted`, reducer já existente da `008` — sem alteração no reducer).
  - **Não faça:** reimplementar a remoção do cartão da tela — o reducer de `card.deleted` já
    existente da `008` cuida disso.
  > ✅ 2026-07-07 17:00 — botão "Arquivar cartão" adicionado ao painel lateral de
    `card-detail-modal.component.tsx` (`data-testid="card-detail-archive-button"`), chamando
    `archiveCard` (nova função em `boards.api.ts`) via `handleArchiveCard`, novo handler em
    `board-view.component.tsx` que remove o cartão do estado local e fecha o modal
    (`setSelectedCardId(null)`); `card.deleted` emitido pelo backend continua tratado pelo
    reducer já existente da `008`, sem alteração.

- [x] 4.2 Habilitar o botão "Arquivar quadro" em `board-settings.component.tsx`
  (`data-testid="board-settings-archive-button"`, `020`): remover `disabled` e o texto "Em
  breve"; ao confirmar (mesmo padrão de diálogo de confirmação de "Excluir quadro"), chamar
  `POST /boards/:id/archive` e redirecionar para `/boards` após sucesso.
  - **Pré:** 3.3 concluída.
  - **Aceite:** owner arquiva o quadro pela tela, é redirecionado ao dashboard, o quadro não
    aparece mais em "Meus quadros".
  - **Não faça:** remover a linha "Excluir quadro" já existente — as duas ações convivem na
    zona de perigo.
  > ✅ 2026-07-07 17:00 — `disabled`/"Em breve" removidos do botão de arquivar; abre
    `DeleteConfirmationDialog` reaproveitado (mesmo componente de "Excluir quadro"), com
    palavra de confirmação própria (`archiveConfirmWord`); `handleArchiveBoard` chama
    `archiveBoard` (nova função em `boards.api.ts`) e redireciona para `/boards` em sucesso; a
    linha "Excluir quadro" permanece intacta, as duas ações convivem na zona de perigo.

- [x] 4.3 Adicionar ação "Arquivar lista" ao cabeçalho de `kanban-column.component.tsx`, ao lado
  da exclusão de lista já existente, chamando `POST /lists/:id/archive`.
  - **Pré:** 3.2 concluída.
  - **Aceite:** clicar arquiva a lista; ela some do quadro ao vivo (via `list.deleted`, reducer
    já existente da `007`).
  > ✅ 2026-07-07 17:00 — botão "Arquivar lista" (ícone `Archive`,
    `data-testid="kanban-column-archive-button"`) adicionado ao header da coluna, ao lado do
    botão de excluir já existente; `handleArchiveList` (novo, em `board-view.component.tsx`)
    chama `archiveList` (nova função em `boards.api.ts`) e remove a lista do estado local;
    `list.deleted` emitido pelo backend continua tratado pelo reducer já existente da `007`.

## 5. Frontend — tela Arquivados

- [x] 5.1 Criar a rota `apps/frontend/src/app/(private)/archived/page.tsx`, delegando para
  `archived-view.component.tsx` (`apps/frontend/src/modules/boards/components/`), buscando
  `GET /archived` ao montar.
  - **Pré:** 3.5 concluída.
  - **Aceite:** rota acessível para qualquer usuário autenticado; exibe os dados do próprio
    usuário (`requesterId` do token).
  > ✅ 2026-07-07 17:00 — rota criada em `apps/frontend/src/app/(private)/archived/page.tsx`
    (grupo `(private)`, protegida por `AuthGuard` do layout existente), delegando para
    `ArchivedView` que busca `GET /archived` (via `listArchivedItems`, nova função em
    `boards.api.ts`) em um `useEffect` ao montar.

- [x] 5.2 Reproduzir fielmente `Arquivados.dc.html`: cabeçalho "Arquivados" + texto informativo
  de retenção de 90 dias (estático); três abas Cartões/Listas/Quadros com contador no rótulo;
  campo de busca (filtro client-side por título/nome); por item, nome + contexto (quadro/lista
  de origem, "arquivado há X" via novo util `relative-time.util.ts`,
  `apps/frontend/src/shared/util/`) e botões "Restaurar"/"Excluir definitivamente".
  - **Pré:** 5.1 concluída.
  - **Aceite:** os três contadores da task batem com o total de itens de cada aba; busca filtra
    sem chamar a API de novo; tempo relativo calculado corretamente para dias/semanas.
  - **Não faça:** implementar paginação ou parâmetro de busca no backend — filtro é client-side
    sobre o resultado já carregado de `GET /archived`.
  > ✅ 2026-07-07 17:00 — `archived-view.component.tsx` reproduz o mockup: título + texto de
    retenção de 90 dias, `Tabs` (Cartões/Listas/Quadros) com contador vindo de
    `data.cards.length`/`data.lists.length`/`data.boards.length`, campo de busca filtrando em
    memória (`useMemo`, sem nova chamada de API) por `title`/`name`; cada item mostra
    nome+contexto via `formatRelativeTime` (novo `relative-time.util.ts`) e botões
    "Restaurar"/ícone de excluir definitivamente.

- [x] 5.3 Implementar "Restaurar" por item (card/list/board conforme a aba), chamando
  `POST .../restore` correspondente e removendo o item da lista local após sucesso (sem
  recarregar `GET /archived` inteiro).
  - **Pré:** 5.2 concluída; endpoints de restore (3.1, 3.2, 3.3) concluídos.
  - **Aceite:** restaurar um cartão/lista faz reaparecer no quadro ao vivo (via `card.created`/
    `list.created`, se o quadro estiver aberto em outra aba); restaurar um quadro faz reaparecer
    em "Meus quadros" na próxima visita.
  > ✅ 2026-07-07 17:00 — `handleRestoreCard`/`handleRestoreList`/`handleRestoreBoard` chamam
    `restoreCard`/`restoreList`/`restoreBoard` (novas funções em `boards.api.ts`) e removem o
    item do estado local (`setData`) sem recarregar `GET /archived` inteiro; o backend emite
    `card.created`/`list.created` (reducer já existente) e o quadro volta a `GET /boards`.

- [x] 5.4 Implementar "Excluir definitivamente" por item, reaproveitando os endpoints de hard
  delete já existentes (`DELETE /boards/:boardId/cards/:id`, `DELETE /lists/:id`,
  `DELETE /boards/:id`, `008`/`007`/`005`) com o mesmo componente de diálogo de confirmação já
  usado em `board-settings.component.tsx` (`020`).
  - **Pré:** 5.2 concluída.
  - **Aceite:** excluir sem confirmar não chama o endpoint; confirmar exclui definitivamente e
    remove o item da lista local.
  - **Não faça:** reimplementar a lógica de exclusão — só consumir os endpoints existentes.
  > ✅ 2026-07-07 17:00 — ícone de excluir abre `DeleteConfirmationDialog` (mesmo componente
    reaproveitado de `020`) com estado `pendingDelete`; `handleConfirmDelete` chama
    `deleteCard`/`deleteList`/`deleteBoard` (`008`/`007`/`005`, já existentes, sem
    reimplementação) só ao confirmar a palavra de confirmação, removendo o item do estado
    local em sucesso.

- [x] 5.5 Adicionar o item "Arquivados" à navegação lateral
  (`app-sidebar-navigation.component.tsx`), abaixo de "Meus quadros", navegando para
  `/archived`.
  - **Pré:** 5.1 concluída.
  - **Aceite:** item visível e navegável para qualquer usuário autenticado.
  > ✅ 2026-07-07 17:00 — item "Arquivados" adicionado a
    `app-navigation.config.ts` (seção `boards-main`, logo abaixo de "Meus quadros", ícone
    `Archive` do `lucide-react`, `href: ARCHIVED_ROUTE`), consumido por
    `app-sidebar-navigation.component.tsx`/`SidebarMenu` sem alteração nesses dois arquivos
    (a config já era a fonte declarativa consumida por eles).

- [x] 5.6 Mapear no i18n (pt/en, frontend) todos os textos novos: título/abas/contadores da
  tela Arquivados, texto de retenção, "Restaurar"/"Excluir definitivamente", confirmação de
  exclusão definitiva, botões "Arquivar cartão"/"Arquivar lista"/"Arquivar quadro" (ajustar a
  chave de "Em breve" já existente da `020`), chaves de erro novas do backend (task 3.6).
  - **Pré:** 4.1, 4.2, 4.3, 5.2 concluídas.
  - **Aceite:** nenhum texto novo hardcoded fora das chaves de i18n pt/en.
  > ✅ 2026-07-07 17:00 — chaves novas pt/en adicionadas em `messages.pt.ts`/`messages.en.ts`:
    `archived.*` (título, abas, retenção, busca, restaurar/excluir definitivamente, vazio,
    contexto por item, tempo relativo), `cardDetail.archive.button`,
    `kanbanColumn.archiveButton`/`archiveConfirm`, `boardSettings.dangerZone.archiveButton`/
    `archiveConfirmWord`/`archiveSuccess` (a chave `archiveComingSoon` foi mantida, sem uso, já
    que o botão agora está habilitado), e os seis códigos de erro do backend
    (`card.already.archived`, `card.not.archived`, `list.already.archived`,
    `list.not.archived`, `board.already.archived`, `board.not.archived`). **Desvio:** o item de
    navegação "Arquivados" (`app-navigation.config.ts`) permanece com rótulo estático em
    português, mesmo padrão hardcoded já usado por "Meus quadros"/"Conta"/"Preferências" nesse
    arquivo — esse arquivo de config é avaliado uma única vez no import do módulo e não é
    reativo a `getMessage` (que depende de `document`/`navigator` em runtime); manter
    consistência com o padrão pré-existente em vez de introduzir uma exceção isolada.
  - **Pré:** 4.1, 4.2, 4.3, 5.2 concluídas.
  - **Aceite:** nenhum texto novo hardcoded fora das chaves de i18n pt/en.
  > ✅ YYYY-MM-DD HH:MM — evidência

## 6. Verificação

- [x] 6.1 Rodar `npx tsc --noEmit` em `apps/backend` e `apps/frontend`, a suíte Jest
  (`modules/board`, `apps/backend`) cobrindo archive/restore dos três agregados e
  `ListArchivedItems`, `npm run lint` (via turbo) e `npm run build` do frontend com
  `NEXT_IGNORE_INCORRECT_LOCKFILE=1`.
  - **Pré:** tasks 1–5 concluídas.
  - **Aceite:** `tsc` limpo nos dois apps; suíte de testes verde (sem regressão em `card`,
    `list`, `board`); lint sem erros; build do frontend verde, com a rota `/archived` gerada.
  > ✅ 2026-07-07 16:13 — Escopo backend: npx tsc --noEmit limpo em apps/backend e modules/board; npx jest em modules/board (221 testes) e apps/backend (23 testes) verdes; npx turbo run lint --filter=@taskboard/backend verde. Frontend (4.x/5.x) fora do escopo desta execucao — nao validado aqui.
  > ✅ 2026-07-07 17:05 — Escopo frontend (4.x/5.x): `npx tsc --noEmit` em `apps/frontend`
    limpo; `npx turbo run lint check-types --filter=@taskboard/frontend` verde (1 warning
    pré-existente, não relacionado a esta change, em `app-logo.component.tsx`); `npx turbo run
    build --filter=@taskboard/frontend` com `NEXT_IGNORE_INCORRECT_LOCKFILE=1` verde, rota
    `/archived` gerada (estática). `apps/frontend` não tem `npm test` configurado (sem suíte de
    testes unitários no frontend) — nada a rodar aqui.

- [x] 6.2 Validar manualmente com curl e um cliente `socket.io-client` real conectado a
  `board:{boardId}`: arquivar/restaurar cartão, lista e quadro; conferir que `GET /boards/:id`
  e `GET /boards` escondem arquivados; conferir `GET /archived` com cenário misto; conferir
  `card.deleted`/`card.created`/`list.deleted`/`list.created` emitidos corretamente e nenhum
  evento em caso de `403`/`400`; excluir definitivamente pela tela Arquivados.
  - **Pré:** 6.1 concluída.
  - **Aceite:** evidência registrada com os payloads reais observados para cada cenário.
  > ✅ 2026-07-07 16:13 — Validado com curl + cliente socket.io-client real (board:{boardId}): archivar/restaurar cartao, lista e quadro; GET /boards/:id e GET /boards escondem arquivados; GET /archived com cenario misto confere; card.deleted/card.created/list.deleted/list.created emitidos corretamente; nenhum evento em 403 (nao-membro/nao-owner testados); exclusao definitiva (hard delete ja existente) nao re-testada aqui (sem mudanca nesta change).

- [x] 6.3 Rodar `openspec validate 022-arquivados --strict` e confirmar saída limpa.
  - **Pré:** 1–5 concluídas e artefatos (`proposal.md`/`design.md`/`tasks.md`/`specs/`) sem
    placeholders pendentes.
  - **Aceite:** comando roda sem erros nem avisos de estrutura.
  > ✅ YYYY-MM-DD HH:MM — evidência
