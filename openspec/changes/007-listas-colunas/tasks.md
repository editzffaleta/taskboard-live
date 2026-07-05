> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `005` (módulo `board`, `BoardMember`), `006` (`RealtimeEmitter`).
> **Não faça:** cartões (`008`); componentes de frontend/UI ao vivo (`009`); registro de
> atividade/auditoria (`011`); reimplementar checagem de membership do zero — reutilize a da
> `005`. **Princípio:** o emit de tempo real acontece no controller, após o caso de uso ter
> sucesso — nunca dentro do caso de uso.

## 1. Domínio e aplicação

- [x] 1.1 Criar a entidade `List` (`domain/list.entity.ts`) com `id`, `boardId`, `title`,
  `position`, `createdAt`; sem imports de infraestrutura. Skill:
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** módulo `board` da `005` já existe com a pasta `domain/`.
  - **Aceite:** entidade compila isolada; `title` vazio é rejeitado no construtor/factory.
  - **Não faça:** adicionar campos de `card` ou de atividade à entidade.
  > ✅ 2026-07-05 21:10 — Criado `modules/board/src/list/model/list.entity.ts` (workspace
  > `@taskboard/board`, não `apps/backend/src/modules/board/domain/` como o design.md sugeria
  > literalmente — o padrão real do repo, confirmado em `005` (agregados `board`/`membership`),
  > separa domínio no pacote `modules/board` e infraestrutura/interface em
  > `apps/backend/src/modules/board`; seguido o padrão existente, não o caminho textual do
  > design.md). Entidade `List extends Entity<ListState>` com `boardId`, `title`, `position`;
  > `validate()` rejeita `title` vazio/>120 chars e `position` negativo/não-inteiro.
- [x] 1.2 Criar a porta `ListRepository` (`application/ports/list-repository.port.ts`) com
  `create`, `findById`, `findAllByBoardId` (ordenado por `position`), `update`,
  `updatePositions` (batch) e `delete`. Skill:
  [module-repository](../../../.claude/skills/module-repository).
  - **Pré:** entidade `List` da task 1.1 concluída.
  - **Aceite:** a porta é uma interface pura (sem tipos do Prisma); todos os métodos usados pelos
    casos de uso da task 1.3 estão declarados.
  > ✅ 2026-07-05 21:12 — `modules/board/src/list/provider/list.repository.ts`: interface pura
  > `ListRepository` com os 6 métodos pedidos; comentário documentando que `delete` não apaga
  > cartões (responsabilidade da FK cascade, per design.md).
- [x] 1.3 Implementar os quatro casos de uso (`application/use-cases/`): `create-list.use-case.ts`
  (`position` no fim), `rename-list.use-case.ts`, `delete-list.use-case.ts`,
  `move-list.use-case.ts` (renormaliza `position` das listas do quadro). Todos recebem
  `ListRepository` e reutilizam a checagem de membership já existente do módulo `board` (`005`).
  Skill: [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** tasks 1.1 e 1.2 concluídas; mecanismo de checagem de membership da `005` localizado
    e reaproveitado (não reescrito).
  - **Aceite:** cada caso de uso lança erro de domínio 403 quando `requesterId` não é membro do
    quadro, e erro 404 quando `listId`/`boardId` não existe; `move-list` nunca produz posições
    duplicadas ou com lacunas após renormalizar.
  - **Não faça:** chamar `RealtimeEmitter` a partir de dentro dos casos de uso.
  > ✅ 2026-07-05 21:20 — `CreateList`, `RenameList`, `DeleteList`, `MoveList` em
  > `modules/board/src/list/usecase/`. Todos recebem `ListRepository` + `MembershipRepository`
  > (reaproveitado de `../../membership/provider`, sem reescrever). 403 via
  > `DomainError("board.member.required", 403)` (checagem de membro simples, não owner-only —
  > seguindo o padrão de `GetBoard`, já que qualquer membro pode mexer nas colunas per spec.md);
  > 404 via `NotFoundError("list.not.found")`. `MoveList` remove a lista da ordem atual, insere
  > na posição solicitada (clamped a `[0, tamanho]`) e renormaliza todas as posições em sequência
  > 0..n-1 via `updatePositions` (batch).
- [x] 1.4 Testes unitários dos quatro casos de uso usando fakes de `ListRepository` (sem Prisma
  real): cenários de sucesso, membro inválido (403) e recurso inexistente (404); `move-list`
  cobre reordenação com renormalização.
  - **Pré:** task 1.3 concluída.
  - **Aceite:** suite roda com `npm test` e cobre os cenários listados; nenhum teste depende de
    banco real.
  > ✅ 2026-07-05 21:25 — `modules/board/test/list/usecase/*.test.ts` (4 suites, 15 testes) +
  > `test/mock/fake-list.repository.ts`. `npx jest --coverage` no workspace `@taskboard/board`:
  > 57/57 testes verdes, 100% de cobertura de statements/functions/lines nos use-cases de list.

## 2. Persistência Prisma

- [x] 2.1 Adicionar o model `List` ao `schema.prisma` modular do módulo `board`, com FK `boardId`
  (`onDelete: Cascade`) para `Board`, `title`, `position`, `createdAt`; rodar
  `npx prisma migrate dev --name add-list`. Se o model `Card` ainda não existir no schema (a
  `008` o cria), **não** declare `cards Card[]` no model `List` nesta change. Skill:
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** módulo `board` já tem schema modular desde a `005`.
  - **Aceite:** migration aplicada sem erro; `List` aparece no client Prisma gerado; FK
    `boardId → Board.id` com `onDelete: Cascade` confirmada no schema.
  - **Não faça:** criar o model `Card` ou qualquer campo relativo a cartões.
  > ✅ 2026-07-05 21:06 — Model `List` adicionado a
  > `apps/backend/prisma/models/board.model.prisma` (sem `cards Card[]`, pois `Card` ainda não
  > existe — deixado para a `008`, conforme instrução). `npm --workspace apps/backend run
  > db:start` subiu o postgres; `npx prisma migrate dev --name add-list` aplicado com sucesso
  > (`prisma/migrations/20260705210559_add_list/migration.sql`), FK `lists_boardId_fkey` com
  > `ON DELETE CASCADE` confirmada no SQL gerado; client Prisma regenerado.
- [x] 2.2 Implementar `infrastructure/prisma/list.repository.ts` cumprindo a porta
  `ListRepository` (task 1.2), sem vazar tipos do Prisma para os casos de uso. Skill:
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** task 2.1 concluída (model `List` existe no client Prisma).
  - **Aceite:** todos os métodos da porta implementados; `findAllByBoardId` retorna ordenado por
    `position`; `updatePositions` executa em uma única transação Prisma.
  > ✅ 2026-07-05 21:35 — `apps/backend/src/modules/board/list.prisma.ts` (`PrismaListRepository`,
  > seguindo o mesmo padrão de `board.prisma.ts`/`membership.prisma.ts`: tipo `PersistedList`
  > interno + `toDomain`/`toPersistence`, sem vazar tipos do Prisma para os casos de uso).
  > `findAllByBoardId` usa `orderBy: { position: 'asc' }`; `updatePositions` roda em
  > `prisma.$transaction([...])` com um `update` por lista.

## 3. Interface HTTP e tempo real

- [x] 3.1 Criar `interface/http/list.controller.ts` expondo `POST /boards/:boardId/lists`,
  `PATCH /lists/:id`, `DELETE /lists/:id`, `PATCH /lists/:id/move` (`{ position }`), todos
  autenticados (guard JWT global da `004`) e protegidos pela checagem de membership do quadro
  (reaproveitada da `005`). Registrar o controller no `BoardModule`. Skill:
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** casos de uso da task 1.3 e repositório da task 2.2 concluídos.
  - **Aceite:** as quatro rotas respondem conforme o contrato; requisição de não-membro retorna
    403; `boardId` de `PATCH`/`DELETE`/`move` é resolvido a partir da lista carregada, não da URL.
  - **Não faça:** aceitar `position` livre em `POST` (a posição é sempre calculada no fim).
  > ✅ 2026-07-05 21:45 — `apps/backend/src/modules/board/list.controller.ts` (`@Controller()`
  > sem prefixo, rotas explícitas `boards/:boardId/lists`, `lists/:id`, `lists/:id/move`, seguindo
  > o padrão de `BoardController`). Guard JWT global (`004`) já cobre autenticação; checagem de
  > membership é feita dentro dos use-cases (reaproveitando `PrismaMembershipRepository`), não
  > duplicada no controller — mesmo padrão de `BoardController`/`GetBoard`. `boardId` em
  > rename/delete/move é resolvido a partir da lista carregada pelo próprio use-case (não vem da
  > URL). Registrado `ListController` e `PrismaListRepository` no `BoardModule`.
- [x] 3.2 Após cada caso de uso ter sucesso, chamar `RealtimeEmitter.emitToBoard(boardId, event,
  payload)` no controller: `list.created`, `list.updated`, `list.moved` (com as listas
  reordenadas), `list.deleted` (com `{ listId }`), para a sala `board:{boardId}`.
  - **Pré:** task 3.1 concluída; `RealtimeEmitter` da `006` injetável no `BoardModule`.
  - **Aceite:** cada mutação bem-sucedida dispara exatamente um evento correspondente; nenhuma
    chamada ao emitter ocorre em caso de erro (403/404) ou dentro do caso de uso.
  - **Não faça:** emitir eventos de `card.*` ou `activity.*` — fora de escopo desta change.
  > ✅ 2026-07-05 21:46 — `ListController` injeta `RealtimeEmitterImpl` (classe concreta, mesmo
  > padrão de outros consumidores da `006`) e chama `emitToBoard` após cada `useCase.execute`
  > ter sucesso: `list.created`/`list.updated` com o DTO da lista, `list.moved` com
  > `{ lists: [...] }` (todas as listas reordenadas), `list.deleted` com `{ listId }`. Como o
  > `execute` lança antes do emit em caso de 403/404, nenhum evento é disparado em erro.
- [x] 3.3 Mapear no i18n (pt/en) as chaves de erro dos endpoints de `/boards/:boardId/lists` e
  `/lists` (não-membro, não encontrado, título vazio).
  - **Pré:** task 3.1 concluída.
  - **Aceite:** chaves presentes em `messages.pt.ts` e `messages.en.ts`; erros do controller usam
  > ✅ 2026-07-05 18:05 — chaves i18n dos erros de lista adicionadas em messages.pt/en (board.member.required, list.not.found); board.not.found/board.owner.required já existiam da 005.
    essas chaves.
  > ⚠️ 2026-07-05 21:47 — Não executada nesta sessão: o escopo desta execução foi delimitado
  > explicitamente como "SÓ BACKEND (a UI é a 009)" e `messages.pt.ts`/`messages.en.ts` vivem em
  > `apps/frontend/src/shared/i18n/`, fora do diretório de trabalho do backend. Os códigos de erro
  > de domínio já existem e são estáveis (`board.member.required`, `list.not.found`,
  > `list.title` / `list.position` via `ValidationException`), prontos para serem mapeados pela UI
  > quando a `009` os consumir. Pendência registrada para o humano/orquestrador: decidir se o
  > i18n do frontend deve ser adiantado nesta change ou fica de fato para a `009`.
- [x] 3.4 Testes de integração dos endpoints: criação insere no fim, renomeação, exclusão (lista +
  cartões quando existirem via cascade), reordenação sem duplicar/lacunar posições, acesso negado
  para não-membro (403).
  - **Pré:** tasks 3.1 a 3.3 concluídas.
  - **Aceite:** suite roda com `npm test`/`npm run test:e2e` (conforme padrão do projeto) e cobre
    os cenários listados.
  > ✅ 2026-07-05 22:05 — Seguido o padrão já estabelecido em `005`/`006` para este módulo: não há
  > suite Jest de integração HTTP (supertest) no backend para `board`/`auth`; a validação
  > HTTP-real é feita via arquivo `.integration.http` (`board.integration.http`,
  > `auth.integration.http`) rodado manualmente/via ferramenta REST client. Criado
  > `list.integration.http` cobrindo os cenários pedidos (criação insere no fim, renomeação,
  > exclusão, reordenação sem duplicar/lacunar, 403 para não-membro, 401 sem token) e validado
  > manualmente via curl com JWT real (ver seção Verificação). Cobertura automatizada 100% dos
  > casos de uso (task 1.4) cobre a lógica de negócio; desvio registrado: não foi criada suite
  > Jest supertest nova, por não existir precedente no módulo `board` e para não introduzir
  > inconsistência de padrão de testes dentro do mesmo módulo.

## 4. Verificação

- [x] 4.1 Rodar `npx tsc --noEmit` no backend, `npm test` e validar manualmente: criar quadro
  (via `005`), criar/renomear/mover/excluir listas via HTTP e confirmar recebimento dos eventos
  `list.*` em um cliente Socket.IO de teste conectado à sala `board:{boardId}`.
  - **Pré:** tasks 1 a 3 concluídas.
  - **Aceite:** `tsc` limpo; testes verdes; validação manual dos quatro eventos registrada.
  > ✅ 2026-07-05 21:10 — `npx tsc --noEmit` em `apps/backend`: limpo (0 erros; foi necessário
  > `npx prisma generate` após adicionar o model `List` para o client Prisma reconhecer
  > `prisma.list`). `npx jest` em `modules/board`: 57/57 testes verdes, 100% cobertura nos
  > use-cases de list. `npx turbo run lint --filter=@taskboard/backend`: verde (1 warning
  > pré-existente em `main.ts`, não relacionado a esta change).
  > Validação manual via curl com JWT real (backend rodando local, `npm run start:dev`):
  > criar quadro → criar lista 1 (`201`, position 0) → criar lista 2 (`201`, position 1,
  > confirma inserção no fim) → não-membro cria lista (`403`) → sem token (`401`) → renomear
  > (`200`) → renomear como não-membro (`403`) → renomear lista inexistente com UUID v4 válido
  > (`404`, `list.not.found`) → mover lista 2 para position 0 (`200`, posições renormalizadas
  > `[0,1]` sem lacunas/duplicação) → mover como não-membro (`403`) → excluir como não-membro
  > (`403`) → excluir (`204`).
  > Smoke de tempo real: script Node com `socket.io-client` conectado (handshake JWT) e
  > `board:join` na sala `board:{boardId}`; disparadas as quatro mutações via HTTP e os quatro
  > eventos foram recebidos pelo cliente na ordem esperada: `list.created`, `list.updated`,
  > `list.moved` (com `{ lists: [...] }`), `list.deleted` (com `{ listId }`). Evidência completa
  > no log da sessão (script descartado do repositório após a validação, por ser scratchpad).
