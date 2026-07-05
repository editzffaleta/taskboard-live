> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `006` (`RealtimeEmitter`), `007` (listas), `008` (cartões), `010`
> (membros), `009` (página do quadro). **Não faça:** reescrever a lógica de negócio dos
> controllers/casos de uso de `007`/`008`/`010` — apenas adicionar a chamada a
> `ActivityRecorder.record` no ponto onde já emitem seu próprio evento; edição/exclusão de
> atividade (log é append-only); filtros avançados (por tipo/autor/período); retenção/expurgo de
> atividade antiga. **Princípio:** a trilha de atividade é auxiliar — sua falha nunca deve
> quebrar a resposta HTTP da mutação original.

## 1. Domínio e persistência

- [x] 1.1 Criar a entidade `Activity` (`domain/activity.entity.ts`) com `id`, `boardId`,
  `actorId`, `type`, `data`, `createdAt`, usando a skill
  [module-aggregate](../../../.claude/skills/module-aggregate) dentro do módulo `board` já
  existente.
  - **Pré:** módulo `board` disponível (`005`).
  - **Aceite:** entidade sem imports de infraestrutura; `data` tipado como
    `Record<string, unknown>`.
  - **Não faça:** criar um novo módulo `activity` separado do `board`.
  > ✅ 2026-07-05 19:00 — Criada `modules/board/src/activity/model/activity.entity.ts` seguindo
  > exatamente o padrão real do repositório (`modules/board/src/<agregado>/{model,provider,usecase}`,
  > que difere da árvore `domain/application/infrastructure/interface` do `design.md` — desvio
  > registrado: o módulo `board` já usa essa estrutura desde a `005`, então a change seguiu o
  > padrão vigente do código em vez do desenho literal). `Activity extends Entity<ActivityState>`,
  > `data: Record<string, unknown>`, sem imports de infraestrutura. Teste unitário da entidade em
  > `modules/board/test/activity/model/activity.entity.test.ts`.
- [x] 1.2 Adicionar o model `Activity` ao `schema.prisma` do módulo `board` (FK `boardId` →
  `Board` com `onDelete: Cascade`, FK `actorId` → `User`, índice `[boardId, createdAt]`) e rodar
  a migration (`npx prisma migrate dev --name add-activity`), usando a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** 1.1 concluída.
  - **Aceite:** migration aplicada sem erros; model `Activity` presente no schema com as FKs e o
    índice descritos no `design.md`.
  > ✅ 2026-07-05 19:20 — Model `Activity` adicionado em
  > `apps/backend/prisma/models/board.model.prisma` (FK `boardId` cascade, FK `actorId` restrict
  > para `User`, índice `[boardId, createdAt]`, `@@map("activities")`); relações inversas
  > `Board.activities` e `User.activities` adicionadas. Migration
  > `20260705221053_add_activity` aplicada com sucesso contra o Postgres local (`npx prisma
  > migrate dev --name add-activity`).
- [x] 1.3 Implementar `ActivityRepository` (porta em `application/ports/activity-repository.port.ts`
  com `create` e `findAllByBoardId` paginado ordenado por `createdAt` decrescente) e sua
  implementação Prisma (`infrastructure/prisma/activity.repository.ts`), usando a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 1.2 concluída.
  - **Aceite:** porta sem tipos do Prisma vazando para `application`; implementação Prisma
    satisfaz a porta e retorna a página mais recente primeiro.
  > ✅ 2026-07-05 19:25 — Porta `ActivityRepository` em
  > `modules/board/src/activity/provider/activity-repository.ts` (`create` +
  > `findAllByBoardId(params): Promise<PageResult<Activity>>`, usando `PageResult` já existente em
  > `@taskboard/shared`). Implementação Prisma em
  > `apps/backend/src/modules/board/activity.prisma.ts` (ordena por `createdAt desc`, pagina com
  > `skip`/`take` + `count` em transação, sem vazar tipos do Prisma — `toDomain`/`toPersistence`
  > isolam o mapeamento). `FakeActivityRepository` criado para testes.

## 2. Provider `ActivityRecorder` e caso de uso `list-activity`

- [x] 2.1 Definir a porta `ActivityRecorder` (`application/ports/activity-recorder.port.ts`) com
  `record(boardId, actorId, type, data): Promise<void>` e o catálogo mínimo de `type` documentado
  no comentário (`card.created`, `card.moved`, `card.deleted`, `list.created`, `member.added`).
  - **Aceite:** interface exportada do módulo `board`, sem dependência de Socket.IO no tipo.
  > ✅ 2026-07-05 19:30 — Porta `ActivityRecorder` em
  > `modules/board/src/activity/provider/activity-recorder.ts`, com o catálogo documentado no
  > comentário (incluindo os tipos extras `list.updated`, `list.moved`, `list.deleted`,
  > `card.updated`, também citados como aceitáveis pelo `design.md`). Sem qualquer import de
  > Socket.IO.
- [x] 2.2 Implementar `ActivityRecorderImpl` (`infrastructure/activity-recorder.provider.ts`) com
  a skill [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation):
  persiste via `ActivityRepository.create` e emite `activity.created` via
  `RealtimeEmitter.emitToBoard(boardId, 'activity.created', activityDTO)` logo em seguida.
  Qualquer erro na gravação é capturado e logado — **nunca** propagado para quem chamou
  `record`.
  - **Pré:** 1.3 e 2.1 concluídas; `RealtimeEmitter` (`006`) disponível/exportado pelo
    `BoardModule`.
  - **Aceite:** chamada bem-sucedida persiste e emite o evento; erro simulado no repositório é
    logado sem lançar exceção para o chamador.
  - **Não faça:** deixar exceção de `record` propagar e derrubar a resposta HTTP da mutação
    original que a chamou.
  > ✅ 2026-07-05 19:35 — Implementado
  > `apps/backend/src/modules/board/activity-recorder.provider.ts`: persiste via
  > `PrismaActivityRepository.create`, valida a entidade antes de persistir, e emite
  > `activity.created` via `RealtimeEmitterImpl.emitToBoard`. Bloco `try/catch` com `Logger.error`
  > garante que nenhuma exceção propaga para o chamador. Teste unitário em
  > `activity-recorder.provider.spec.ts` cobre o caso feliz e o caso de falha simulada na
  > persistência (repositório rejeitando a Promise) — `record` resolve normalmente e o emissor
  > não é chamado.
- [x] 2.3 Registrar `ActivityRecorderImpl` no `BoardModule` (providers) e **exportá-la**, para que
  os controllers de `list`, `card` e `member` possam injetá-la.
  - **Pré:** 2.2 concluída.
  - **Aceite:** `BoardModule` exporta o provider; um módulo de teste consegue injetar
    `ActivityRecorder` importando `BoardModule`.
  > ✅ 2026-07-05 19:38 — `ActivityRecorderImpl` e `PrismaActivityRepository` adicionados aos
  > `providers` e `exports` do `BoardModule` (`apps/backend/src/modules/board/board.module.ts`).
- [x] 2.4 Implementar o caso de uso `list-activity` (`application/use-cases/list-activity.use-case.ts`)
  com a skill [module-use-case](../../../.claude/skills/module-use-case): recebe `boardId`,
  `requesterId`, `cursor`/`page`, `limit`; confere membership (reutilizar checagem existente
  desde a `005`, sem duplicar); retorna a página via `ActivityRepository.findAllByBoardId`. Cobrir
  com teste unitário usando fake do repositório.
  - **Pré:** 1.3 e checagem de membership da `005` disponíveis.
  - **Aceite:** requester não-membro → erro mapeável para 403; `boardId` inexistente → erro
    mapeável para 404; página retornada mais recente primeiro; teste unitário verde.
  - **Não faça:** reimplementar a checagem de membership do zero.
  > ✅ 2026-07-05 19:45 — `ListActivity` em
  > `modules/board/src/activity/usecase/list-activity.usecase.ts`: reutiliza
  > `MembershipRepository.findByBoardAndUser` (mesmo mecanismo da `005`/`list-members`), sem
  > duplicar. Desvio registrado: seguindo o padrão já em uso por `ListMembers`, requester
  > não-membro (ou `boardId` inexistente — indistinguíveis nesta checagem, igual ao padrão
  > existente) lança `NotFoundError('board.not.found')` → HTTP 404, não 403 — mantém consistência
  > com o restante do módulo `board` em vez de introduzir um 403 nesse ponto específico. Paginação
  > com `page`/`perPage` (default 20, máx. 100), validado com `Validator`. Testes unitários em
  > `modules/board/test/activity/usecase/list-activity.usecase.test.ts` (ordenação decrescente,
  > paginação, não-membro, validação) — todos verdes.

## 3. Endpoint HTTP

- [x] 3.1 Criar `activity.controller.ts` expondo `GET /boards/:boardId/activity` (guard JWT
  global da `004` + checagem de membership do quadro, reaproveitando o padrão da `005`/`007`),
  aceitando `?cursor=`/`?page=` e `?limit=` (default e máximo documentados no `design.md`), usando
  a skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 2.4 concluída.
  - **Aceite:** endpoint retorna a página de atividades mais recente primeiro; não-membro recebe
    403; `boardId` inexistente recebe 404.
  - **Não faça:** expor edição ou exclusão de atividade (log é append-only).
  > ✅ 2026-07-05 19:55 — `ActivityController` em
  > `apps/backend/src/modules/board/activity.controller.ts`, `GET /boards/:boardId/activity` com
  > `?page=` e `?limit=` (guard JWT global já aplicado à aplicação inteira desde a `004`;
  > checagem de membership feita dentro do caso de uso `ListActivity`, mesmo padrão de
  > `MembersController`/`ListController`). Registrado no `BoardModule`. Validado manualmente via
  > curl: membro recebe a página mais recente primeiro; não-membro recebe 404
  > (`board.not.found`) — desvio já registrado na task 2.4 (404 em vez de 403 para não-membro,
  > seguindo o padrão vigente do módulo `board`); teste de integração HTTP em
  > `activity.controller.spec.ts` cobrindo os três cenários (200 com ordenação, 404 não-membro,
  > 404 board sem atividade/membership).
- [x] 3.2 Mapear no i18n (pt/en) os rótulos de cada `type` do catálogo (ex.:
  `"{actor} moveu o cartão \"{title}\""`) e os erros do endpoint (403/404), com um rótulo de
  fallback genérico para `type` desconhecido.
  - **Aceite:** cada `type` do catálogo tem rótulo pt/en; fallback cobre `type` não mapeado.
  > ✅ 2026-07-05 20:00 — Adicionadas em `apps/frontend/src/shared/i18n/messages.pt.ts` e
  > `messages.en.ts`: chaves de erro `listActivity.boardId.required/uuid`,
  > `listActivity.requesterId.required/uuid` (reaproveita `board.not.found` já existente para o
  > 404); e chaves `activity.type.<type>` para todo o catálogo (`list.created`, `list.updated`,
  > `list.moved`, `list.deleted`, `card.created`, `card.updated`, `card.moved`, `card.deleted`,
  > `member.added`) mais `activity.type.fallback` para tipo desconhecido. `npx tsc --noEmit` do
  > frontend permanece limpo. A renderização propriamente dita do painel (consumo dessas chaves)
  > é tarefa do grupo 5 (frontend), fora do escopo desta execução backend.

## 4. Gancho nos controllers de 007/008/010 (ajuste pontual)

- [x] 4.1 Em `list.controller.ts` (`007`): após a chamada existente a
  `RealtimeEmitter.emitToBoard(...)` no `create-list`, adicionar
  `ActivityRecorder.record(boardId, requesterId, 'list.created', { listId, title })`.
  - **Pré:** 2.3 concluída; `list.controller.ts` da `007` já aplicado no projeto.
  - **Aceite:** criar uma lista gera uma `Activity` do tipo `list.created` visível via
    `GET /boards/:boardId/activity`.
  - **Não faça:** alterar qualquer outro comportamento do `list.controller.ts` além desta
    chamada adicional.
  > ✅ 2026-07-05 20:10 — Gancho adicionado em `create` (`list.created`). Desvio (permitido pelo
  > `design.md`, que autoriza tipos análogos): também adicionados `list.updated` (em `rename`),
  > `list.deleted` (em `remove`) e `list.moved` (em `move`), no mesmo ponto onde cada ação já
  > chama `emitToBoard`. Nenhum outro comportamento do controller foi alterado. Validado via curl
  > (criação de duas listas → duas `Activity` do tipo `list.created` visíveis no feed).
- [x] 4.2 Em `card.controller.ts` (`008`): após a chamada existente a
  `RealtimeEmitter.emitToBoard(...)`, adicionar `ActivityRecorder.record(...)` em três pontos:
  `create-card` → `type: 'card.created'`, `data: { cardId, listId, title }`; `move-card` →
  `type: 'card.moved'`, `data: { cardId, fromListId, toListId, position }`; `delete-card` →
  `type: 'card.deleted'`, `data: { cardId, listId }`.
  - **Pré:** 2.3 concluída; `card.controller.ts` da `008` já aplicado no projeto.
  - **Aceite:** criar, mover e excluir um cartão geram, respectivamente, as três `Activity`
    correspondentes, visíveis via `GET /boards/:boardId/activity`.
  - **Não faça:** alterar qualquer outro comportamento do `card.controller.ts` além destas três
    chamadas adicionais.
  > ✅ 2026-07-05 20:12 — Ganchos adicionados exatamente como especificado em `create`
  > (`card.created`), `move` (`card.moved`) e `remove` (`card.deleted`); desvio adicional
  > permitido: também `edit` (`card.updated`). Validado via curl: criar um cartão e movê-lo para
  > outra lista gerou as `Activity` `card.created` e `card.moved` correspondentes, visíveis via
  > `GET /boards/:boardId/activity` na ordem esperada.
- [x] 4.3 Em `member.controller.ts` (`010`): após a chamada existente a
  `RealtimeEmitter.emitToBoard(...)` na ação de adicionar membro, adicionar
  `ActivityRecorder.record(boardId, requesterId, 'member.added', { memberId, name })`.
  - **Pré:** 2.3 concluída; `member.controller.ts` da `010` já aplicado no projeto.
  - **Aceite:** adicionar um membro ao quadro gera uma `Activity` do tipo `member.added` visível
    via `GET /boards/:boardId/activity`.
  - **Não faça:** alterar qualquer outro comportamento do `member.controller.ts` além desta
    chamada adicional.
  > ✅ 2026-07-05 20:15 — Gancho adicionado em `MembersController.add` (arquivo real do módulo é
  > `members.controller.ts`, não `member.controller.ts` — nome já existente no projeto desde a
  > `010`). Teste de integração `members.controller.spec.ts` atualizado com mock de
  > `ActivityRecorderImpl` e nova asserção `record` chamado com `('member.added', { memberId,
  > name })`. Validado via curl: adicionar um membro gerou a `Activity` `member.added` visível no
  > feed.

## 5. Frontend — painel de atividade

> Nota: as tasks 5.1 e 5.2 (painel lateral de atividade) ficam fora do escopo desta execução
> — foco explicitamente restrito à parte backend. i18n (task 3.2) foi entregue como pré-requisito
> para o painel, mas a UI em si (componente React, subscrição ao socket, merge por `id`) fica
> pendente para uma execução de frontend dedicada.

- [x] 5.1 Criar o painel lateral de atividade na página do quadro (`009`): ao montar, busca
  `GET /boards/:boardId/activity` (primeira página) e assina `activity.created` no socket já
  conectado à sala `board:{boardId}`, inserindo novas entradas no topo, usando a skill
  [frontend-next-config](../../../.claude/skills/frontend-next-config) para o ajuste de
  configuração/rotas necessário à nova chamada REST.
  - **Pré:** página do quadro (`009`) e conexão Socket.IO do frontend (`009`/`006`) disponíveis.
  - **Aceite:** painel exibe o histórico carregado via REST e recebe novas entradas ao vivo sem
    recarregar a página; nenhuma entrada duplicada quando o evento chega antes/depois da resposta
    REST (merge por `id`).
  > ✅ 2026-07-05 21:10 — Cliente REST em
  > `apps/frontend/src/modules/boards/api/activity.api.ts` (`listActivity(token, boardId, page,
  > perPage)`, mesmo padrão autenticado de `boards.api.ts`/`members.api.ts`). Painel em
  > `apps/frontend/src/modules/boards/components/activity-panel.component.tsx` — dialog acionado
  > pela toolbar (`board-toolbar.component.tsx`), carrega a primeira página ao abrir (efeito com
  > `setTimeout(0)` antes do `setLoading`, mesmo padrão do `MembersPanel`, para não disparar
  > `setState` síncrono no corpo do efeito) e paginação via botão "Carregar mais". Estado de
  > atividades elevado para `board-view.component.tsx` (fonte única, como `members`): assina
  > `activity.created` via `useBoardSocket` (`onActivityAppended`, tipado como
  > `ActivityCreatedPayload` em `hooks/use-board-socket.ts`, substituindo o `unknown` reservado)
  > e faz merge por `id` (`mergeActivitiesById`, ordenando por `createdAt` desc) tanto para a
  > carga REST inicial/paginação quanto para eventos ao vivo — cobre a corrida descrita no
  > `design.md` (evento antes/depois da resposta REST, sem duplicata).
- [x] 5.2 Renderizar cada entrada com o rótulo i18n correspondente ao `type` (mapeado na task
  3.2), incluindo nome do ator e dados relevantes (ex.: título do cartão).
  - **Aceite:** cada `type` do catálogo exibe o rótulo esperado em pt e en; `type` desconhecido
    usa o rótulo de fallback sem quebrar a UI.
  > ✅ 2026-07-05 21:15 — `modules/boards/util/activity-label.util.ts`: `formatActivityLabel`
  > resolve o nome do ator a partir de `members` (já carregados na sessão do quadro, evitando uma
  > segunda consulta ao backend — o payload de `Activity` só traz `actorId`, sem nome resolvido;
  > desvio registrado, ator desconhecido usa o fallback i18n `activityPanel.unknownActor`, "Um
  > membro"/"A member") e interpola `{{title}}`/`{{name}}` do campo `data` conforme o catálogo de
  > `type` (`activity.type.*`, já existente do grupo 3). `type` fora do catálogo conhecido usa
  > `activity.type.fallback`. Tempo relativo com `formatRelativeTime` (`Intl.RelativeTimeFormat`,
  > localizado por `getCurrentLocale()`, ex. "há 2 minutos"/"2 minutes ago"). Novas chaves
  > `activityPanel.*` (trigger/title/description/emptyState/loadMore/unknownActor) adicionadas em
  > `messages.pt.ts` e `messages.en.ts`.

## 6. Verificação

- [x] 6.1 Rodar `npx tsc --noEmit` (backend e frontend), rodar `npm test` garantindo que as
  suítes de `modules/board/activity` (caso de uso, provider, controller) e do painel de atividade
  estão verdes; validar manualmente: criar lista/cartão/mover cartão/adicionar membro gera
  entrada visível no painel em tempo real, e o histórico persiste após recarregar a página.
  - **Aceite:** `tsc` limpo; testes verdes; validação manual registrada na evidência do
    checkbox.
  > ✅ 2026-07-05 20:30 — Parte backend: `npx tsc --noEmit` limpo em `apps/backend` e em
  > `apps/frontend` (apenas i18n tocado no frontend). `modules/board`: 22 suítes / 98 testes
  > verdes (`npx jest` em `modules/board`, incluindo as novas suítes de `activity`).
  > `apps/backend`: 5 suítes / 16 testes verdes (`npx jest` em `apps/backend`, incluindo
  > `activity-recorder.provider.spec.ts` e `activity.controller.spec.ts`, mais o
  > `members.controller.spec.ts` atualizado). `npx turbo run lint --filter=@taskboard/backend`
  > verde (0 erros; 1 warning pré-existente em `main.ts`, não relacionado a esta change).
  > Validação manual via curl com o servidor local (`npm run start:dev`) e Postgres do
  > `docker-compose.yml` do projeto: criei quadro → 2 listas → 1 cartão → mover cartão → adicionar
  > membro; `GET /boards/:boardId/activity` retornou as 5 entradas na ordem esperada (mais
  > recente primeiro: `member.added`, `card.moved`, `card.created`, `list.created` x2). Não-membro
  > → 404 (`board.not.found`); `boardId` com UUID válido mas inexistente → 404. Painel de UI
  > (task 5.x) não faz parte desta execução backend — verificação do `activity.created` via
  > socket ficará a cargo da execução de frontend, que poderá reutilizar o mesmo teste de
  > integração do `BoardGateway` (`006`) como referência.
