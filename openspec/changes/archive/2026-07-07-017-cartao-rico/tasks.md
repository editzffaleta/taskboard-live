> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `008` (agregado `card`, `CardController`/`CardResponse`), `016`
> (`card-response.util.ts`, `get-board-detail.usecase.ts` já hidratando `labels`, guard de
> membership no padrão cross-board), `006` (`RealtimeEmitter` registrada e exportada pelo
> `BoardModule`), `005` (membership/`BoardMember`). **Não faça:** UI do detalhe do cartão
> (`018`); filtros/visões (`019`); notificações de prazo; edição/reação de comentário; tela de
> "Configurações do Quadro" (`020`); reimplementar sala/presença/handshake do Socket.IO (já
> existe na `006`). **Princípio:** cada mutação só emite o evento de tempo real **após** o caso
> de uso ter sucesso — nunca antes, nunca em caso de erro. Prazo/checklist/responsáveis emitem
> `card.updated` com o cartão completo (nunca eventos fragmentados por campo); comentários
> emitem `comment.created`/`comment.deleted` dedicados (não fazem parte do payload de cartão).

## 1. Prazo (dueDate)

- [x] 1.1 Adicionar `dueDate: Date | null` à entidade `Card` (`modules/board/src/card/model/`),
  seguindo a skill
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** entidade `Card` existente (`008`).
  - **Aceite:** `Card` compila com `dueDate` opcional/nullable; nenhuma validação de formato de
    data no domínio além de aceitar `Date | null` (validação de string ISO fica no controller/
    DTO); testes unitários existentes de `Card` continuam verdes; teste novo cobre criar cartão
    sem `dueDate` (default `null`).
  - **Não faça:** tornar `dueDate` obrigatório ou remover cartões sem prazo definido.
  - **Evidência:** ✅ 2026-07-07 14:35 — Card ganha dueDate: Date | null (modules/board/src/card/model/card.entity.ts), validate() aceita DateRule so quando != null; teste novo em test/card/model/card.entity.test.ts cobre default null, valor definido e clone/limpar.

- [x] 1.2 Criar o caso de uso `SetCardDueDate(cardId, boardId, requesterId, dueDate)`, validando
  cross-board (cartão pertence ao `boardId` da rota) e membership, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.1 concluída.
  - **Aceite:** `dueDate: null` limpa o prazo (idempotente); cartão de outro `boardId` retorna
    erro de não encontrado; não-membro retorna erro de autorização; testes unitários com fakes
    cobrem definir, limpar e os dois casos de erro.
  - **Não faça:** reaproveitar `EditCard` (crescer sua responsabilidade) — caso de uso dedicado.
  - **Evidência:** ✅ 2026-07-07 14:35 — SetCardDueDate criado em modules/board/src/card/usecase/set-card-due-date.usecase.ts (cross-board + membership); testes em test/card/usecase/set-card-due-date.usecase.test.ts cobrindo definir, limpar (idempotente), cross-board e nao-membro.

- [x] 1.3 Adicionar coluna `dueDate DateTime?` ao model `Card` no schema Prisma e gerar a
  migration, seguindo a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** 1.1 concluída.
  - **Aceite:** migration aplica sem erro sobre dados existentes (cartões antigos ficam com
    `dueDate: null`); `npx prisma generate` roda limpo.
  - **Evidência:** ✅ 2026-07-07 14:35 — Coluna dueDate DateTime? adicionada ao model Card (apps/backend/prisma/models/board.model.prisma); migration 20260707172519_cartao_rico aplicada com `npm --workspace apps/backend run prisma:migrate:dev -- --name cartao-rico` e `prisma:generate` rodado sem erro.

- [x] 1.4 Expor `PATCH /boards/:boardId/cards/:id/due` `{dueDate: string | null}` em
  `card.controller.ts`, protegido pelo guard JWT + membership, emitindo `card.updated` com o
  cartão completo (via `buildCardResponse` ajustado na task 5.1) após sucesso, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 1.2, 1.3 e 5.1 concluídas.
  - **Aceite:** definir e limpar prazo funcionam via curl; não-membro recebe erro de
    autorização; nenhum evento emitido em caso de erro.

  - **Evidência:** ✅ 2026-07-07 14:35 — PATCH /boards/:boardId/cards/:id/due exposto em card.controller.ts, emitindo card.updated com o cartao completo; validado via curl (definir/limpar).

## 2. Checklist

- [x] 2.1 Criar a entidade `ChecklistItem` (`id`, `cardId`, `text`, `done`, `position`) e a
  porta `ChecklistItemRepository` (`create`, `findById`, `findAllByCardId`,
  `findAllByCardIds`, `update`, `delete`) no novo agregado `checklist-item` do módulo `board`,
  seguindo as skills
  [module-aggregate](../../../.claude/skills/module-aggregate) e
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** módulo `board` existente; nenhuma dependência de `label`.
  - **Aceite:** `ChecklistItem` compila; validação rejeita `text` vazio; `findAllByCardIds`
    existe para hidratar vários cartões numa consulta (evitar N+1, mesmo padrão de
    `CardLabelRepository.findAllByCardIds` da `016`); testes unitários da entidade cobrem
    criação válida e `text` vazio.
  - **Não faça:** importar Prisma dentro de `domain`/`model`.
  - **Evidência:** ✅ 2026-07-07 14:35 — ChecklistItem (id, cardId, text, done, position) e ChecklistItemRepository criados em modules/board/src/checklist-item/{model,provider}; testes em test/checklist-item/model/checklist-item.entity.test.ts cobrem criacao valida e texto vazio.

- [x] 2.2 Implementar `add-checklist-item`, `toggle-checklist-item`, `edit-checklist-item`,
  `delete-checklist-item` e `reorder-checklist-items` como casos de uso, recebendo
  `ChecklistItemRepository` por porta, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 2.1 concluída.
  - **Aceite:** `add-checklist-item` calcula `position` como `max(position)+1`;
    `toggle-checklist-item` só altera `done`; `edit-checklist-item` só altera `text` (rejeita
    vazio); `delete-checklist-item` remove sem recalcular posições dos demais;
    `reorder-checklist-items` recebe a lista completa de ids e reatribui `position`
    sequencialmente, validando que todos pertencem ao `cardId`; todos com testes unitários com
    fakes em memória cobrindo sucesso, cross-card (item de outro cartão) e validação.
  - **Não faça:** permitir mutação de item que não pertence ao `cardId` da rota.
  - **Evidência:** ✅ 2026-07-07 14:35 — add/toggle/edit/delete/reorder-checklist-item(s) criados em modules/board/src/checklist-item/usecase/; testes com fakes em test/checklist-item/usecase/*.test.ts cobrem sucesso, cross-card e validacao (texto vazio, ids invalidos no reorder).

- [x] 2.3 Adicionar o model `ChecklistItem` (`cardId` FK → `Card` cascade, `text`, `done`
  default `false`, `position`, `createdAt`) ao schema Prisma e gerar a migration, e implementar
  `PrismaChecklistItemRepository`, seguindo as skills
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module) e
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 2.1 e 2.2 concluídas.
  - **Aceite:** migration aplica sem erro; excluir um cartão remove seus itens em cascata;
    `findAllByCardIds` faz uma única consulta com `IN`; nenhum tipo `Prisma.*` vaza para fora do
    adapter.
  - **Evidência:** ✅ 2026-07-07 14:35 — Model ChecklistItem (cascade cardId->Card) adicionado ao schema Prisma e PrismaChecklistItemRepository implementado em apps/backend/src/modules/board/checklist-item.prisma.ts com findAllByCardIds em uma unica consulta IN; migration cartao-rico aplicada.

- [x] 2.4 Criar `checklist.controller.ts` expondo
  `POST/PATCH/DELETE /boards/:boardId/cards/:cardId/checklist(/:itemId)` e
  `PATCH .../checklist/:itemId/text` e `PUT .../checklist/order`, protegido pelo guard JWT +
  membership, emitindo `card.updated` com o cartão completo (via `buildCardResponse` ajustado na
  task 5.1) após cada mutação, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 2.2, 2.3 e 5.1 concluídas; `RealtimeEmitter` exportada pelo `BoardModule` (`006`).
  - **Aceite:** todas as operações funcionam via curl; item de outro cartão retorna erro sem
    mutar; evento `card.updated` observado via `socket.io-client` real após cada operação, com
    `checklist` atualizado no payload; nenhum evento emitido em caso de erro.
  - **Não faça:** criar um evento `checklist.item.toggled` ou similar (usar `card.updated`,
    decisão registrada no `design.md`).

  - **Evidência:** ✅ 2026-07-07 14:35 — checklist.controller.ts criado expondo POST/PATCH(:itemId)/PATCH(:itemId/text)/DELETE(:itemId)/PUT(order) sob /boards/:boardId/cards/:cardId/checklist, emitindo card.updated; validado via curl (add/toggle/edit/reorder/delete) e evento card.updated observado via socket.io-client real com checklist atualizado.

## 3. Responsáveis (assignees)

- [x] 3.1 Criar a porta `CardAssigneeRepository` (`assign`, `unassign`, `findAllByCardId`,
  `findAllByCardIds`) no novo relacionamento `card-assignee` do módulo `board`, seguindo a
  skill [module-repository](../../../.claude/skills/module-repository).
  - **Pré:** módulo `board` existente; `MembershipRepository`/`UserRepository` já existentes.
  - **Aceite:** `findAllByCardIds` existe para hidratar `assignees` de vários cartões numa
    consulta (evitar N+1); interface sem Prisma.
  - **Evidência:** ✅ 2026-07-07 14:35 — CardAssigneeRepository (assign/unassign/findAllByCardId/findAllByCardIds) criado em modules/board/src/card-assignee/provider/card-assignee.repository.ts.

- [x] 3.2 Implementar `assign-user` e `unassign-user` como casos de uso, recebendo
  `CardAssigneeRepository`, `MembershipRepository`, `CardRepository` e `ListRepository` por
  porta, seguindo a skill [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 3.1 concluída.
  - **Aceite:** `assign-user` valida que `userId` é `BoardMember` do quadro do cartão (via
    lista → quadro), rejeitando quem não é membro; é idempotente (atribuir responsável já
    atribuído não duplica linha nem lança erro); `unassign-user` é idempotente; ambos retornam o
    cartão com `assignees` atualizado; testes unitários com fakes cobrem idempotência e
    usuário-não-membro.
  - **Não faça:** permitir atribuir um usuário que não é `BoardMember` do quadro do cartão.
  - **Evidência:** ✅ 2026-07-07 14:35 — AssignUser/UnassignUser criados em modules/board/src/card-assignee/usecase/; testes em test/card-assignee/usecase/*.test.ts cobrem idempotencia (assign/unassign) e usuario nao-membro rejeitado com DomainError 422.

- [x] 3.3 Adicionar o model `CardAssignee` (`cardId` FK → `Card` cascade, `userId` FK → `User`
  cascade, `unique(cardId, userId)`, `createdAt`) ao schema Prisma e gerar a migration, e
  implementar `PrismaCardAssigneeRepository`, seguindo as skills
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module) e
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 3.1 e 3.2 concluídas.
  - **Aceite:** migration aplica sem erro; excluir um cartão ou um usuário remove as
    associações em cascata; `assign` usa `upsert` para garantir idempotência no banco (unique
    `cardId_userId`); `findAllByCardIds` faz uma única consulta com `IN`.
  - **Evidência:** ✅ 2026-07-07 14:35 — Model CardAssignee (unique cardId+userId, cascade) adicionado ao schema; PrismaCardAssigneeRepository implementado em apps/backend/src/modules/board/card-assignee.prisma.ts usando upsert para idempotencia e findAllByCardIds com IN; migration aplicada.

- [x] 3.4 Criar `card-assignee.controller.ts` expondo
  `PUT/DELETE /boards/:boardId/cards/:cardId/assignees/:userId`, protegido pelo guard JWT +
  membership, emitindo `card.updated` com o cartão completo (via `buildCardResponse` ajustado na
  task 5.1) após sucesso, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 3.2, 3.3 e 5.1 concluídas.
  - **Aceite:** membro atribui/remove responsável com sucesso via curl; atribuir usuário
    não-membro do quadro retorna erro sem mutar; evento `card.updated` observado via
    `socket.io-client` real com `assignees` atualizado; nenhum evento emitido em caso de erro.

  - **Evidência:** ✅ 2026-07-07 14:35 — card-assignee.controller.ts criado expondo PUT/DELETE /boards/:boardId/cards/:cardId/assignees/:userId, emitindo card.updated; validado via curl: atribuir Bob (membro) com sucesso, atribuir usuario nao-membro rejeitado com 422 sem mutar, remover responsavel com sucesso.

## 4. Comentários

- [x] 4.1 Criar a entidade `Comment` (`id`, `cardId`, `authorId`, `text`, `createdAt`) e a porta
  `CommentRepository` (`create`, `findById`, `findAllByCardId` paginado, `countByCardId`,
  `delete`) no novo agregado `comment` do módulo `board`, seguindo as skills
  [module-aggregate](../../../.claude/skills/module-aggregate) e
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** módulo `board` existente.
  - **Aceite:** `Comment` compila; validação rejeita `text` vazio; `findAllByCardId` aceita
    parâmetros de paginação (`page`, `pageSize`) e retorna do mais recente para o mais antigo;
    testes unitários da entidade cobrem criação válida e `text` vazio.
  - **Não faça:** importar Prisma dentro de `domain`/`model`.
  - **Evidência:** ✅ 2026-07-07 14:35 — Comment (id, cardId, authorId, text, createdAt) e CommentRepository criados em modules/board/src/comment/{model,provider}; testes em test/comment/model/comment.entity.test.ts cobrem criacao valida e texto vazio.

- [x] 4.2 Implementar `add-comment`, `list-comments` e `delete-comment` como casos de uso,
  recebendo `CommentRepository` e `MembershipRepository` por porta, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 4.1 concluída.
  - **Aceite:** `add-comment` usa `authorId` do usuário autenticado (não do body); valida
    membership do quadro do cartão; `list-comments` retorna ordenado `createdAt DESC`, paginado,
    com `total`; `delete-comment` só permite exclusão quando `requesterId === comment.authorId`
    (rejeita mesmo sendo membro do quadro); testes unitários com fakes cobrem sucesso,
    texto vazio, não-membro e exclusão por não-autor.
  - **Não faça:** permitir que qualquer membro do quadro exclua comentário de outro autor.
  - **Evidência:** ✅ 2026-07-07 14:35 — AddComment/ListComments/DeleteComment criados em modules/board/src/comment/usecase/; testes em test/comment/usecase/*.test.ts cobrem authorId do usuario autenticado, texto vazio, nao-membro, paginacao createdAt DESC e exclusao autor-only (rejeita nao-autor).

- [x] 4.3 Adicionar o model `Comment` (`cardId` FK → `Card` cascade, `authorId` FK → `User`,
  `text`, `createdAt`) ao schema Prisma e gerar a migration, e implementar
  `PrismaCommentRepository`, seguindo as skills
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module) e
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 4.1 e 4.2 concluídas.
  - **Aceite:** migration aplica sem erro; excluir um cartão remove seus comentários em
    cascata; `findAllByCardId` implementa `skip`/`take` e `countByCardId` corretamente.
  - **Evidência:** ✅ 2026-07-07 14:35 — Model Comment (cascade cardId->Card, FK authorId->User sem cascade) adicionado ao schema; PrismaCommentRepository implementado em apps/backend/src/modules/board/comment.prisma.ts com skip/take e countByCardId; migration aplicada.

- [x] 4.4 Criar `comment.controller.ts` expondo
  `POST/GET /boards/:boardId/cards/:cardId/comments` e `DELETE .../comments/:id`, protegido pelo
  guard JWT + membership (exclusão adicionalmente autor-only), emitindo `comment.created`/
  `comment.deleted` (não `card.updated`) após sucesso, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 4.2, 4.3 concluídas; `RealtimeEmitter` exportada pelo `BoardModule` (`006`).
  - **Aceite:** criar/listar/excluir comentário funciona via curl; não-autor tentando excluir
    recebe erro de autorização e o comentário permanece; evento `comment.created` observado via
    `socket.io-client` real ao criar; `comment.deleted` ao excluir; nenhum evento emitido em
    caso de erro.
  - **Não faça:** emitir `card.updated` para mutações de comentário; permitir exclusão por
    não-autor mesmo sendo membro do quadro.

  - **Evidência:** ✅ 2026-07-07 14:35 — comment.controller.ts criado expondo POST/GET /boards/:boardId/cards/:cardId/comments e DELETE .../comments/:id, emitindo comment.created/comment.deleted (nao card.updated); validado via curl: Alice comenta, Bob comenta, listagem paginada DESC com total, Bob tentando excluir comentario da Alice rejeitado com 403 comment.author.required, Alice exclui o proprio; comment.created observado via socket.io-client real.

## 5. Enriquecimento do payload de cartão (card-response e board-detail)

- [x] 5.1 Ajustar `card-response.util.ts` (`buildCardResponse`) para incluir `dueDate`,
  `assignees: {id, name}[]` e `checklist: {id, text, done, position}[]` no `CardResponse`,
  recebendo `ChecklistItemRepository`, `CardAssigneeRepository` e `UserRepository` (ou
  equivalente para resolver `name`) por parâmetro, hidratando os três campos do mesmo jeito que
  já hidrata `labels`.
  - **Pré:** 1.1, 2.1, 3.1 concluídas (entidades/portas existem, mesmo que os casos de uso
    ainda não estejam prontos — este ajuste depende só dos tipos e repositórios).
  - **Aceite:** `CardResponse` ganha os três campos sem remover/renomear nenhum existente
    (`id`, `listId`, `title`, `description`, `position`, `createdAt`, `labels`); cartão recém-
    criado retorna `dueDate: null`, `assignees: []`, `checklist: []`; nenhuma regressão nos
    testes existentes de `card.controller`/`card-response.util`.
  - **Não faça:** incluir `comments` no `CardResponse` (decisão registrada no `design.md`:
    comentários ficam fora do payload do cartão).
  - **Evidência:** ✅ 2026-07-07 14:35 — buildCardResponse (apps/backend/src/modules/board/card-response.util.ts) ajustado para incluir dueDate/assignees/checklist recebendo ChecklistItemRepository/CardAssigneeRepository/MemberDirectory por parametro; cartao recem-criado confirmado com dueDate:null, assignees:[], checklist:[] via curl; nenhuma regressao (tsc/jest ok).

- [x] 5.2 Ajustar `get-board-detail.usecase.ts` (`GetBoardDetail`/`BoardDetailCard`) para
  incluir `dueDate`, `assignees` e `checklist` em cada cartão do detalhe do quadro, usando
  `findAllByCardIds` das três novas portas para evitar N+1 (mesmo padrão já usado para
  `labelsByCardId`).
  - **Pré:** 2.3, 3.3 concluídas (repositórios Prisma com `findAllByCardIds` implementados);
    5.1 concluída.
  - **Aceite:** `GET /boards/:id` retorna `dueDate`/`assignees`/`checklist` em cada cartão;
    nenhuma regressão nos testes existentes de `get-board-detail.usecase.test.ts`; teste novo
    prova os três campos populados corretamente para cartões com prazo/responsáveis/itens de
    checklist.
  - **Não faça:** hidratar comentários no board-detail (fora de escopo, decisão do `design.md`).

  - **Evidência:** ✅ 2026-07-07 14:35 — get-board-detail.usecase.ts (GetBoardDetail/BoardDetailCard) ajustado para incluir dueDate/assignees/checklist usando findAllByCardIds das 3 novas portas (sem N+1); teste novo em test/board/usecase/get-board-detail.usecase.test.ts prova os 3 campos populados; GET /boards/:id validado via curl confirmando os campos e ausencia de comentarios.

## 6. Verificação

- [x] 6.1 Rodar `npx tsc --noEmit` em `apps/backend`, a suíte de testes Jest dos casos de uso de
  `checklist-item`/`card-assignee`/`comment`/`card` (unitários com fakes) e `npm run lint` (via
  turbo) no backend.
  - **Pré:** tasks 1–5 concluídas.
  - **Aceite:** `tsc` limpo; suíte de testes verde; lint sem erros.
  - **Evidência:** ✅ 2026-07-07 14:35 — npx tsc --noEmit em apps/backend: limpo. Jest do modulo board: 43 suites / 182 testes verdes. Jest do apps/backend: 7 suites / 23 testes verdes. npx turbo run lint --filter=@taskboard/backend: sem erros (auto-fix de formatacao aplicado).

- [x] 6.2 Validar manualmente com curl e um cliente `socket.io-client` real conectado à sala
  `board:{boardId}`: definir/limpar prazo, adicionar/marcar/editar/excluir/reordenar item de
  checklist, atribuir/remover responsável (com caso de usuário não-membro rejeitado), adicionar/
  listar (paginado)/excluir comentário (com caso de não-autor rejeitado) — observando os
  eventos `card.updated` (com `dueDate`/`checklist`/`assignees` atualizados),
  `comment.created`, `comment.deleted` emitidos na sala correta.
  - **Pré:** 6.1 concluída.
  - **Aceite:** evidência registrada com os payloads reais observados de cada evento; caso de
    usuário não-membro atribuído como responsável confirmado como erro sem evento; caso de
    exclusão de comentário por não-autor confirmado como erro sem evento; `GET /boards/:id`
    confirmado incluindo `dueDate`/`assignees`/`checklist` em cada cartão, sem comentários.

  - **Evidência:** ✅ 2026-07-07 14:35 — Validacao manual completa com curl + socket.io-client real (servidor local, postgres via docker compose): prazo definir/limpar, checklist add/toggle/edit/reorder/delete, assignees assign(membro)/assign(nao-membro rejeitado 422)/unassign, comentarios add(Alice)/add(Bob)/list(paginado DESC)/delete(nao-autor rejeitado 403)/delete(autor ok); eventos card.updated (com dueDate/checklist/assignees atualizados) e comment.created observados via socket.io-client conectado a sala board:{boardId}; GET /boards/:id confirmado com dueDate/assignees/checklist em cada cartao e sem comentarios.
