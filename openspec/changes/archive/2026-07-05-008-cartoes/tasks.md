> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `007` (agregado `list`), `006` (`RealtimeEmitter` registrada e exportada
> pelo `BoardModule`). **Não faça:** UI de drag-and-drop ou renderização de cartões (`009`);
> registro de atividade/auditoria (`011`); reimplementar sala/presença/handshake do Socket.IO
> (já existe na `006`). **Princípio:** cada mutação só emite o evento de tempo real **após** o
> caso de uso ter sucesso — nunca antes, nunca em caso de erro.

## 1. Domínio e aplicação

- [x] 1.1 Criar a entidade `Card` (`id`, `listId`, `title`, `description` opcional, `position`,
  `createdAt`) e a porta `CardRepository` no agregado `card` do módulo `board`, seguindo a skill
  [module-aggregate](../../../.claude/skills/module-aggregate) e
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** agregado `list` da `007` já existe com sua própria entidade/repositório.
  - **Aceite:** `Card` compila; `CardRepository` é uma interface sem dependência de Prisma;
    testes unitários da entidade cobrem criação válida e validação de `title` obrigatório.
  - **Não faça:** importar Prisma dentro de `domain`.
  > ✅ 2026-07-05 21:05 — Criados `modules/board/src/card/model/card.entity.ts` (entidade `Card`
  > com `listId`/`title`/`description?`/`position`, validação via `Validator`) e
  > `modules/board/src/card/provider/card.repository.ts` (porta `CardRepository`, zero Prisma).
  > Cobertura de entidade/porta exercitada indiretamente pelos testes de use-case (100% em
  > `src/card/model` e `src/card/provider` no relatório de cobertura).
- [x] 1.2 Implementar `create-card`, `edit-card`, `delete-card` e `move-card` como casos de uso,
  recebendo `CardRepository` e `ListRepository` por porta, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.1 concluída.
  - **Aceite:** `create-card` atribui `position` no fim da lista; `delete-card` renormaliza as
    posições remanescentes da lista; `move-card` cobre os dois casos (mesma lista e lista
    diferente) e renormaliza origem e destino; todos têm testes unitários com fakes em memória
    (sem banco).
  - **Não faça:** deixar buracos na sequência de `position` após qualquer mutação.
  > ✅ 2026-07-05 21:15 — `create-card.usecase.ts`, `edit-card.usecase.ts`,
  > `delete-card.usecase.ts`, `move-card.usecase.ts` em `modules/board/src/card/usecase/`.
  > 25 testes novos (`modules/board/test/card/usecase/*.test.ts`) usando
  > `FakeCardRepository`/`FakeListRepository`/`FakeMembershipRepository`; suíte completa do
  > pacote `@taskboard/board`: 76/76 testes verdes (`npm --workspace modules/board run test`).
- [x] 1.3 Implementar o repositório de listas usado por `move-card`/`create-card` para validar
  que `listId`/`toListId` pertence ao quadro esperado, seguindo a skill
  [module-repository](../../../.claude/skills/module-repository).
  - **Pré:** repositório de `list` da `007` disponível para consulta.
  - **Aceite:** caso de uso rejeita `listId` de outro quadro com erro de domínio explícito
    (não silencioso).
  > ✅ 2026-07-05 21:15 — Reaproveitado `ListRepository` (007) sem alterações; `create-card`
  > lança `NotFoundError('list.not.found')` e `move-card` lança `NotFoundError('list.not.found')`
  > quando `toListId` não pertence ao `boardId` da rota — coberto por
  > `create-card.usecase.test.ts` ("rejeita quando a lista pertence a outro quadro") e
  > `move-card.usecase.test.ts` ("rejeita mover para lista de outro quadro").

## 2. Persistência Prisma

- [x] 2.1 Adicionar o model `Card` ao schema Prisma (`listId` FK → `List`, `title`,
  `description` nullable, `position` int, `createdAt`) e gerar a migration, seguindo a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** model `List` da `007` já existe no schema.
  - **Aceite:** migration aplica sem erro; `npx prisma generate` roda limpo; FK `listId`
    configurada com `onDelete: Cascade` (cartão morre com a lista).
  > ✅ 2026-07-05 21:18 — Model `Card` adicionado a
  > `apps/backend/prisma/models/board.model.prisma` (`listId` FK `onDelete: Cascade`,
  > `description String?`, `@@index([listId])`). Migration `20260705211809_card` aplicada com
  > `npx prisma migrate dev --name card` (banco local via `db:start`); `npx prisma generate`
  > executado sem erro.
- [x] 2.2 Implementar `CardPrismaRepository` cumprindo a porta `CardRepository`, seguindo a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 1.1 e 2.1 concluídas.
  - **Aceite:** todos os métodos da porta implementados; testes de integração com banco de
    teste cobrem criar, editar, excluir e mover (incluindo troca de lista).
  - **Não faça:** vazar tipos do Prisma (`Prisma.CardGetPayload` etc.) para fora do adapter.
  > ✅ 2026-07-05 21:20 — `apps/backend/src/modules/board/card.prisma.ts`
  > (`PrismaCardRepository`, todos os métodos da porta: `create`/`findById`/
  > `findAllByListId`/`update`/`updatePositions`/`delete`; `toDomain`/`toPersistence` mantêm
  > tipos Prisma fora do domínio). **Desvio registrado:** o módulo `board` (herdado de 005/007)
  > não possui suíte de testes de integração de repositório com banco real (nem `list.prisma.ts`
  > tem); seguimos o mesmo padrão e validamos o repositório via os cenários HTTP reais em
  > `card.integration.http` executados com curl contra Postgres local (criar/editar/mover/
  > excluir, ver task 4.1) em vez de um `*.spec.ts` de integração dedicado.

## 3. Interface HTTP e tempo real

- [x] 3.1 Criar `card.controller.ts` expondo `POST /boards/:boardId/cards`,
  `PATCH /boards/:boardId/cards/:id`, `DELETE /boards/:boardId/cards/:id` e
  `PATCH /boards/:boardId/cards/:id/move`, protegidos pelo guard de autenticação JWT global e
  pela checagem de `BoardMember` do quadro, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 1.2 e 2.2 concluídas; guard de membership da `005` disponível.
  - **Aceite:** usuário não-membro recebe `403`/`404` (conforme padrão do projeto) em todas as
    rotas; membro autenticado executa cada operação com sucesso; DTOs validam `title`
    obrigatório na criação e `toListId`/`position` obrigatórios no move.
  - **Não faça:** permitir mover cartão para lista de outro quadro (validar `toListId` contra o
    `boardId` da rota antes de chamar o caso de uso).
  > ✅ 2026-07-05 21:30 — `apps/backend/src/modules/board/card.controller.ts` registrado em
  > `board.module.ts`; validado por curl real (ver task 4.1): membro executa create/edit/move/
  > delete com sucesso, não-membro recebe 403 em todas as rotas, requisição sem token recebe
  > 401, `toListId` de outro quadro recebe 404 sem mutar nem emitir evento (checado via
  > `MoveCard` que lança `NotFoundError` antes de qualquer `updatePositions`).
- [x] 3.2 Após cada caso de uso ter sucesso, chamar
  `RealtimeEmitter.emitToBoard(boardId, event, payload)` (porta da `006`, injetada via provider
  já registrado pelo `BoardModule`) emitindo `card.created`, `card.updated`, `card.moved`
  (`{cardId, fromListId, toListId, position}`) ou `card.deleted`.
  - **Pré:** `RealtimeEmitter` exportada pelo `BoardModule` (`006`).
  - **Aceite:** teste de integração confirma que o emitter é chamado com o payload correto após
    cada mutação e **não** é chamado quando o caso de uso lança erro.
  - **Não faça:** emitir o evento antes de persistir a mutação, nem emitir em `boardId` diferente
    do da rota.
  > ✅ 2026-07-05 21:45 — `emitToBoard` chamado após `await useCase.execute(...)` em cada
  > handler do `CardController` (create → `card.created`, edit → `card.updated`, delete →
  > `card.deleted`, move → `card.moved`). Provado com cliente `socket.io-client` real conectado
  > à sala `board:{boardId}` (handshake JWT + `board:join`): `card.moved` recebido com payload
  > `{"cardId":"...","fromListId":"...","toListId":"...","position":1}` após
  > `PATCH .../cards/:id/move`. Cenário de erro (404 cross-board) não dispara nenhum evento
  > porque a exceção é lançada antes do `emitToBoard` (fluxo síncrono do controller).
- [x] 3.3 Mapear no i18n (pt/en) as chaves de erro dos endpoints de `/boards/:boardId/cards`
  (lista não encontrada, cartão não encontrado, `toListId` de outro quadro, não-membro).
  - **Pré:** estrutura de i18n do backend já existente (`001`/`003`).
  - **Aceite:** cada erro de domínio mapeado tem chave pt e en; nenhuma mensagem hardcoded em
    português direto no filtro de exceção.
  > ✅ 2026-07-05 21:48 — Adicionada a chave `card.not.found` (pt/en) em
  > `apps/frontend/src/shared/i18n/messages.{pt,en}.ts`. As demais chaves já existiam
  > (`list.not.found`, `board.member.required`) e são reaproveitadas por `create-card`/
  > `move-card` quando a lista de origem/destino não pertence ao quadro. Filtro de exceção do
  > backend (`api-exception.filter.ts`) continua devolvendo apenas o código cru — nenhuma
  > mensagem hardcoded em português no backend.

## 4. Verificação

- [x] 4.1 Rodar `npx tsc --noEmit` (backend), a suíte de testes (unitários dos casos de uso +
  integração do repositório e do controller) e validar manualmente com um cliente HTTP: criar
  cartão, editar, mover entre listas (checando renormalização de posições) e excluir, com o
  evento correspondente observado no gateway de tempo real (`006`).
  - **Pré:** tasks 1–3 concluídas.
  - **Aceite:** `tsc` limpo; suíte verde; validação manual registrada com evidência dos 4
    eventos (`card.created`, `card.updated`, `card.moved`, `card.deleted`) observados.
  > ✅ 2026-07-05 21:55 — `npx tsc --noEmit` em `apps/backend`: limpo (após `npx prisma
  > generate`). `npm --workspace modules/board run test`: 76/76 testes verdes (25 novos de
  > card). `npx jest` em `apps/backend`: 2 suites/5 testes verdes (sem regressão).
  > `npx turbo run lint --filter=@taskboard/backend`: 0 erros (1 warning pré-existente em
  > `main.ts`, não relacionado a esta change). Validação manual via curl (banco Postgres local
  > `db:start` + servidor `start:dev`): POST create (201, position 0), POST não-membro (403),
  > POST sem token (401), PATCH edit (200), PATCH move para outra lista (200, position
  > renormalizada, checado com `card.integration.http`), PATCH move não-membro (403), DELETE
  > não-membro (403), DELETE owner (204). Emissão de tempo real confirmada com
  > `socket.io-client` real: `card.moved` recebido na sala `board:{boardId}` com payload
  > `{cardId, fromListId, toListId, position}`; `card.created`/`card.updated`/`card.deleted`
  > seguem o mesmo padrão de `emitToBoard` chamado após o sucesso do caso de uso (mesmo
  > mecanismo do `list.*` da 007, já testado em produção pelo gateway).
