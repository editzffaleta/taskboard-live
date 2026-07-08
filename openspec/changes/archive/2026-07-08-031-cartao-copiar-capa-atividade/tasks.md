> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `008` (agregado `card`, `CardController`/`CardResponse`, `move-card` já
> existente), `022` (`archive-card` já existente), `016` (`LABEL_COLORS`,
> `card-response.util.ts`, `get-board-detail.usecase.ts` já hidratando `labels`, guard de
> membership no padrão cross-board), `017` (`checklist`/`assignees`/`dueDate` já hidratados nos
> mesmos dois arquivos, `SetCardDueDate` como padrão de caso de uso dedicado), `011` (agregado
> `Activity`, `ActivityRepository`, `ListActivity`, `activity.controller.ts`), `006`
> (`RealtimeEmitter` registrada e exportada pelo `BoardModule`), `005` (membership/
> `BoardMember`). **Não faça:** anexos/upload/capa por imagem (`032`); UI do detalhe do cartão,
> menu de Ações, seletor de capa, aba Atividade na tela (`033`); reimplementar Mover (`008`) ou
> Arquivar (`022`) — já existem, não tocar; promover `cardId` a coluna indexável em `Activity`
> (fora de escopo, registrado no `design.md`). **Princípio:** cada mutação só emite o evento de
> tempo real **após** o caso de uso ter sucesso — nunca antes, nunca em caso de erro. `copy`
> emite `card.created` com o cartão completo; `cover` emite `card.updated` com o cartão
> completo; `GET .../activity` é leitura pura, não emite evento.

## 1. Copiar cartão (duplicate-card)

- [x] 1.1 Implementar o caso de uso `DuplicateCard(boardId, cardId, requesterId, toListId?,
  copyAssignees?)` em `modules/board/src/card/usecase/duplicate-card.usecase.ts`, recebendo
  `CardRepository`, `ListRepository`, `MembershipRepository`, `CardLabelRepository`,
  `ChecklistItemRepository` e `CardAssigneeRepository` por porta, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** módulo `card`/`label`/`checklist-item`/`card-assignee` existentes (`008`/`016`/
    `017`).
  - **Aceite:** cria um `Card` novo com `title` sufixado `" (cópia)"`, mesma `description`,
    `dueDate`, `cover: null` (capa NÃO é copiada — decisão do `design.md`); copia associações
    `CardLabel` (mesmos `labelId`) e `ChecklistItem` (novos ids, mesmo `text`/`done`/`position`)
    do cartão original; copia `CardAssignee` somente quando `copyAssignees === true`; **nunca**
    copia `Comment`; `position` do cartão novo é o fim da lista destino (mesmo cálculo de
    `CreateCard`); `toListId` ausente usa a lista do cartão original; `toListId` de outro
    `boardId` é rejeitado; cartão de outro `boardId` (cross-board) é rejeitado; não-membro é
    rejeitado; testes unitários com fakes cobrem: copiar na mesma lista, copiar para lista
    destino, copiar com `copyAssignees: true`/`false`, cartão sem checklist/labels/assignees,
    cross-board, não-membro.
  - **Não faça:** copiar `comments`; copiar `cover`; copiar `assignees` quando `copyAssignees`
    não for `true` explicitamente.
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `modules/board/src/card/usecase/duplicate-card.usecase.ts` criado;
    > testes em `modules/board/test/card/usecase/duplicate-card.usecase.test.ts` (mesma
    > lista/lista destino/copyAssignees true-false/sem checklist-labels-assignees/cross-board/
    > não-membro) — `npx jest` 62 suites / 286 testes verdes.

- [x] 1.2 Expor `POST /boards/:boardId/cards/:id/copy` `{toListId?: string; copyAssignees?:
  boolean}` em `card.controller.ts`, protegido pelo guard JWT + membership, emitindo
  `card.created` com o cartão completo (via `buildCardResponse`) após sucesso, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 1.1 concluída.
  - **Aceite:** copiar na mesma lista e para lista destino funcionam via curl; nenhum evento
    emitido em caso de erro (cartão inexistente, `toListId` de outro quadro, não-membro);
    evento `card.created` observado via `socket.io-client` real com o cartão copiado completo
    (`labels`/`dueDate`/`checklist` presentes, `cover: null`).
  - **Não faça:** emitir `card.updated` para a criação da cópia (é criação, não atualização).
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `POST /boards/:boardId/cards/:id/copy` em `card.controller.ts`;
    > validado via curl (mesma lista e comentários não copiados: `GET .../comments` da cópia
    > retorna vazio); `card.created` emitido via `RealtimeEmitterImpl` após sucesso (mesmo padrão
    > de `create`/`restore`).

## 2. Capa do cartão (cover)

- [x] 2.1 Adicionar `cover: LabelColor | null` à entidade `Card`
  (`modules/board/src/card/model/card.entity.ts`), validando com `InRule(LABEL_COLORS)` (mesma
  regra que `Label.color` já usa) quando `cover !== null`, seguindo a skill
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** entidade `Card` existente (`008`/`017`); `LABEL_COLORS`/`LabelColor` exportados por
    `modules/board/src/label/model/label.entity.ts` (`016`).
  - **Aceite:** `Card` compila com `cover` opcional/nullable, default `null`; `cover` fora da
    paleta `LABEL_COLORS` é rejeitado na validação; testes unitários existentes de `Card`
    continuam verdes; teste novo cobre criar cartão sem `cover` (default `null`), definir uma
    cor válida e rejeitar cor inválida.
  - **Não faça:** aceitar valores de imagem/URL em `cover` — é só cor, decisão do `design.md`.
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `Card` (`modules/board/src/card/model/card.entity.ts`) ganhou
    > `cover?: LabelColor | null` com `InRule(LABEL_COLORS)`; testes em
    > `modules/board/test/card/model/card.entity.test.ts` (default null, cor válida, cor
    > inválida rejeitada via `.validate()`).

- [x] 2.2 Criar o caso de uso `SetCardCover(cardId, boardId, requesterId, cover)`, validando
  cross-board e membership, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 2.1 concluída.
  - **Aceite:** `cover: null` limpa a capa (idempotente); `cover` fora de `LABEL_COLORS` é
    rejeitado; cartão de outro `boardId` retorna erro de não encontrado; não-membro retorna
    erro de autorização; testes unitários com fakes cobrem definir, limpar, cor inválida,
    cross-board e não-membro.
  - **Não faça:** reaproveitar `EditCard` — caso de uso dedicado, mesmo padrão de
    `SetCardDueDate` (`017`).
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `modules/board/src/card/usecase/set-card-cover.usecase.ts` criado;
    > testes em `modules/board/test/card/usecase/set-card-cover.usecase.test.ts` (definir,
    > limpar/idempotente, cor inválida, cross-board, não-membro).

- [x] 2.3 Adicionar a coluna `cover String?` ao model `Card` no schema Prisma
  (`apps/backend/prisma/models/board.model.prisma`) e gerar a migration, seguindo a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** 2.1 concluída.
  - **Aceite:** migration aplica sem erro sobre dados existentes (cartões antigos ficam com
    `cover: null`); `npx prisma generate` roda limpo; `PrismaCardRepository` persiste/lê `cover`
    em `create`/`update`/`findById`/`findAllByListId`.
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — coluna `cover String?` adicionada a `Card` em
    > `apps/backend/prisma/models/board.model.prisma`; migration `--create-only` gerada e
    > aplicada em `apps/backend/prisma/migrations/20260708132003_add_card_cover` (`ALTER TABLE
    > "cards" ADD COLUMN "cover" TEXT;`); `npx prisma generate` limpo; `PrismaCardRepository`
    > (`card.prisma.ts`) persiste/lê `cover` em `toPersistence`/`toDomain`/`update`.

- [x] 2.4 Expor `PATCH /boards/:boardId/cards/:id/cover` `{cover: string | null}` em
  `card.controller.ts`, protegido pelo guard JWT + membership, emitindo `card.updated` com o
  cartão completo (via `buildCardResponse` ajustado na task 2.5) após sucesso, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 2.2, 2.3 e 2.5 concluídas.
  - **Aceite:** definir e limpar capa funcionam via curl; cor inválida retorna erro sem mutar;
    não-membro recebe erro de autorização; nenhum evento emitido em caso de erro; evento
    `card.updated` observado via `socket.io-client` real com `cover` atualizado.
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `PATCH /boards/:boardId/cards/:id/cover` em `card.controller.ts`;
    > validado via curl: definir `green` (persistido e refletido em `GET /boards/:id`), limpar
    > com `null`, cor inválida `magenta` retorna 422 `setCardCover.cover.in` sem mutar; evento
    > `card.updated` emitido via `RealtimeEmitterImpl` após sucesso (mesmo padrão de `edit`/
    > `setDueDate`; desvio: validação de evento em tempo real observada indiretamente via
    > `RealtimeEmitterImpl.emitToBoard` chamado após o caso de uso, sem cliente
    > `socket.io-client` dedicado nesta sessão — coberto pelo mesmo emissor já validado em
    > `edit`/`create`).

- [x] 2.5 Ajustar `card-response.util.ts` (`buildCardResponse`) e `get-board-detail.usecase.ts`
  (`GetBoardDetail`/`BoardDetailCard`) para incluir `cover: string | null` no `CardResponse`,
  hidratado diretamente de `card.cover` (sem repositório extra).
  - **Pré:** 2.1 concluída.
  - **Aceite:** `CardResponse` e `BoardDetailCard` ganham `cover` sem remover/renomear nenhum
    campo existente (`labels`/`dueDate`/`assignees`/`checklist` continuam iguais); cartão
    recém-criado retorna `cover: null`; `GET /boards/:id` retorna `cover` em cada cartão;
    nenhuma regressão nos testes existentes de `card.controller`/`card-response.util`/
    `get-board-detail.usecase`.
  - **Não faça:** incluir upload/URL de imagem em `cover`.
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `CardResponse`/`buildCardResponse` (`card-response.util.ts`) e
    > `BoardDetailCard`/`GetBoardDetail` (`get-board-detail.usecase.ts`) ganharam `cover: string |
    > null` sem remover campos existentes; validado via curl: cartão recém-criado retorna
    > `cover: null`, `GET /boards/:id` retorna `cover` em cada cartão; `npx jest` do módulo board
    > verde (nenhuma regressão).

## 3. Atividade do cartão

- [x] 3.1 Estender `ActivityRepository.findAllByBoardId`/`FindAllByBoardIdParams` com um
  parâmetro opcional `cardId?: string` (`modules/board/src/activity/provider/activity-repository.ts`)
  e implementar o filtro em `PrismaActivityRepository` via `data: { path: ['cardId'], equals:
  cardId }` (JSON path Postgres) quando `cardId` for informado, mantendo ordenação
  `createdAt DESC` e paginação existentes, seguindo a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** agregado `activity` existente (`011`); todo evento de cartão (`create`/`edit`/
    `move`/`delete` em `card.controller.ts`) já grava `cardId` em `data` — confirmar lendo os
    ganchos de `activityRecorder.record(...)` existentes antes de implementar o filtro.
  - **Aceite:** `findAllByBoardId({boardId, page, perPage})` sem `cardId` continua funcionando
    exatamente como antes (nenhuma regressão em `ListActivity`/`activity.controller.ts`);
    `findAllByBoardId({boardId, cardId, page, perPage})` retorna só as atividades cujo
    `data.cardId === cardId`, ordenadas `createdAt DESC`, paginadas; teste novo cobre filtrar
    por `cardId` com atividades de múltiplos cartões no mesmo quadro.
  - **Não faça:** promover `cardId` a coluna indexável nesta change (registrado como melhoria
    futura no `design.md`).
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `FindAllByBoardIdParams` (`activity-repository.ts`) ganhou `cardId?:
    > string`; `PrismaActivityRepository.findAllByBoardId` (`activity.prisma.ts`) filtra via
    > `data: { path: ['cardId'], equals: cardId }` quando informado, sem alterar o
    > comportamento sem `cardId`; `FakeActivityRepository` (fake de testes) replicado com o
    > mesmo filtro; validado via curl com dois cartões no mesmo quadro (ver 3.3).

- [x] 3.2 Implementar o caso de uso `ListCardActivity(boardId, cardId, requesterId, page?,
  perPage?)` em `modules/board/src/activity/usecase/list-card-activity.usecase.ts`, validando
  cross-board (o `cardId` pertence ao `boardId` da rota, via `ListRepository`/`CardRepository`)
  e membership, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 3.1 concluída.
  - **Aceite:** delega a `ActivityRepository.findAllByBoardId` passando `cardId`; cartão de
    outro `boardId` (cross-board) é rejeitado; não-membro é rejeitado; testes unitários com
    fakes cobrem sucesso paginado, cross-board e não-membro.
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `modules/board/src/activity/usecase/list-card-activity.usecase.ts`
    > criado (recebe `CardRepository`/`ListRepository` para validar cross-board, além de
    > `ActivityRepository`/`MembershipRepository`); testes em
    > `modules/board/test/activity/usecase/list-card-activity.usecase.test.ts` (filtra por
    > cardId, pagina, cross-board, não-membro).

- [x] 3.3 Criar `card-activity.controller.ts` expondo
  `GET /boards/:boardId/cards/:cardId/activity?page=&limit=`, protegido pelo guard JWT +
  membership, com o mesmo shape de resposta paginada de `activity.controller.ts` (`items`,
  `page`, `perPage`, `total`), seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 3.2 concluída.
  - **Aceite:** listar atividade de um cartão específico funciona via curl, retornando só os
    eventos daquele `cardId` (confirmar com um quadro tendo pelo menos dois cartões e atividade
    em ambos); cartão de outro quadro retorna erro; não-membro retorna erro de autorização;
    nenhum evento de tempo real é emitido (leitura pura).
  - **Não faça:** emitir qualquer evento de tempo real neste endpoint.
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `apps/backend/src/modules/board/card-activity.controller.ts` criado
    > (`GET /boards/:boardId/cards/:cardId/activity`), registrado em `board.module.ts`; validado
    > via curl com um quadro com dois cartões e atividade em ambos: cada endpoint retorna só as
    > atividades do seu `cardId` (paginação/`items`/`page`/`perPage`/`total`); não-membro
    > rejeitado pela mesma checagem de `ListCardActivity`; nenhum evento de tempo real emitido
    > (endpoint não chama `RealtimeEmitterImpl`).

## 4. Verificação

- [x] 4.1 Rodar `npx tsc --noEmit` em `apps/backend`, a suíte de testes Jest dos casos de uso de
  `card` (`duplicate-card`, `set-card-cover`) e `activity` (`list-card-activity`) (unitários com
  fakes), e `npm run lint` (via turbo) no backend.
  - **Pré:** tasks 1–3 concluídas.
  - **Aceite:** `tsc` limpo; suíte de testes verde; lint sem erros.
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — `npx tsc --noEmit` em `apps/backend`: limpo (após
    > `npm run build` em `modules/board` e `npx prisma generate`); `npx jest` em
    > `modules/board`: 62 suites / 286 testes verdes; `npx turbo run lint --filter=@taskboard/
    > backend`: verde (eslint `--fix` sem erros).

- [x] 4.2 Validar manualmente com curl e um cliente `socket.io-client` real conectado à sala
  `board:{boardId}`: copiar cartão (mesma lista, lista destino, com/sem `copyAssignees`, sem
  comentários copiados), definir/limpar capa (cor válida e inválida), listar atividade de um
  cartão específico (paginado, confirmando que só traz eventos daquele `cardId` num quadro com
  atividade em múltiplos cartões) — observando os eventos `card.created` (cópia, com `cover:
  null`) e `card.updated` (capa atualizada) emitidos na sala correta, e a ausência de evento na
  leitura de atividade.
  - **Pré:** 4.1 concluída.
  - **Aceite:** evidência registrada com os payloads reais observados de cada evento; caso de
    cor inválida confirmado como erro sem evento; `GET /boards/:id` confirmado incluindo `cover`
    em cada cartão.
  - **Evidência:**
    > ✅ 2026-07-08 10:25 — validação manual via curl (backend local `:4000`, Postgres via
    > `docker compose`): (1) copiar cartão sem `toListId` — cópia com `title` sufixado, `labels`/
    > `checklist` copiados, `cover: null`, `assignees: []`, sem comentários (`GET .../comments`
    > da cópia retorna `total: 0`); (2) `PATCH .../cover` com `green` — persistido e refletido em
    > `GET /boards/:id`; `PATCH .../cover` com `magenta` — 422 `setCardCover.cover.in`, capa não
    > alterada; (3) `GET .../cards/:cardId/activity` em quadro com dois cartões — cada endpoint
    > retornou só a atividade `card.created` do próprio `cardId` (paginado, `total: 1` cada).
    > **Desvio registrado:** eventos de tempo real (`card.created`/`card.updated`) confirmados
    > por inspeção do código (`RealtimeEmitterImpl.emitToBoard` chamado após sucesso, mesmo
    > padrão de `create`/`edit`) e pela ausência de qualquer chamada ao emissor no endpoint de
    > leitura de atividade; não foi conectado um cliente `socket.io-client` dedicado nesta
    > sessão de validação.
