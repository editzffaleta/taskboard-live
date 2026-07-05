> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `006` (`RealtimeEmitter`), `007` (listas), `008` (cartões), `010`
> (membros), `009` (página do quadro). **Não faça:** reescrever a lógica de negócio dos
> controllers/casos de uso de `007`/`008`/`010` — apenas adicionar a chamada a
> `ActivityRecorder.record` no ponto onde já emitem seu próprio evento; edição/exclusão de
> atividade (log é append-only); filtros avançados (por tipo/autor/período); retenção/expurgo de
> atividade antiga. **Princípio:** a trilha de atividade é auxiliar — sua falha nunca deve
> quebrar a resposta HTTP da mutação original.

## 1. Domínio e persistência

- [ ] 1.1 Criar a entidade `Activity` (`domain/activity.entity.ts`) com `id`, `boardId`,
  `actorId`, `type`, `data`, `createdAt`, usando a skill
  [module-aggregate](../../../.claude/skills/module-aggregate) dentro do módulo `board` já
  existente.
  - **Pré:** módulo `board` disponível (`005`).
  - **Aceite:** entidade sem imports de infraestrutura; `data` tipado como
    `Record<string, unknown>`.
  - **Não faça:** criar um novo módulo `activity` separado do `board`.
- [ ] 1.2 Adicionar o model `Activity` ao `schema.prisma` do módulo `board` (FK `boardId` →
  `Board` com `onDelete: Cascade`, FK `actorId` → `User`, índice `[boardId, createdAt]`) e rodar
  a migration (`npx prisma migrate dev --name add-activity`), usando a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** 1.1 concluída.
  - **Aceite:** migration aplicada sem erros; model `Activity` presente no schema com as FKs e o
    índice descritos no `design.md`.
- [ ] 1.3 Implementar `ActivityRepository` (porta em `application/ports/activity-repository.port.ts`
  com `create` e `findAllByBoardId` paginado ordenado por `createdAt` decrescente) e sua
  implementação Prisma (`infrastructure/prisma/activity.repository.ts`), usando a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 1.2 concluída.
  - **Aceite:** porta sem tipos do Prisma vazando para `application`; implementação Prisma
    satisfaz a porta e retorna a página mais recente primeiro.

## 2. Provider `ActivityRecorder` e caso de uso `list-activity`

- [ ] 2.1 Definir a porta `ActivityRecorder` (`application/ports/activity-recorder.port.ts`) com
  `record(boardId, actorId, type, data): Promise<void>` e o catálogo mínimo de `type` documentado
  no comentário (`card.created`, `card.moved`, `card.deleted`, `list.created`, `member.added`).
  - **Aceite:** interface exportada do módulo `board`, sem dependência de Socket.IO no tipo.
- [ ] 2.2 Implementar `ActivityRecorderImpl` (`infrastructure/activity-recorder.provider.ts`) com
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
- [ ] 2.3 Registrar `ActivityRecorderImpl` no `BoardModule` (providers) e **exportá-la**, para que
  os controllers de `list`, `card` e `member` possam injetá-la.
  - **Pré:** 2.2 concluída.
  - **Aceite:** `BoardModule` exporta o provider; um módulo de teste consegue injetar
    `ActivityRecorder` importando `BoardModule`.
- [ ] 2.4 Implementar o caso de uso `list-activity` (`application/use-cases/list-activity.use-case.ts`)
  com a skill [module-use-case](../../../.claude/skills/module-use-case): recebe `boardId`,
  `requesterId`, `cursor`/`page`, `limit`; confere membership (reutilizar checagem existente
  desde a `005`, sem duplicar); retorna a página via `ActivityRepository.findAllByBoardId`. Cobrir
  com teste unitário usando fake do repositório.
  - **Pré:** 1.3 e checagem de membership da `005` disponíveis.
  - **Aceite:** requester não-membro → erro mapeável para 403; `boardId` inexistente → erro
    mapeável para 404; página retornada mais recente primeiro; teste unitário verde.
  - **Não faça:** reimplementar a checagem de membership do zero.

## 3. Endpoint HTTP

- [ ] 3.1 Criar `activity.controller.ts` expondo `GET /boards/:boardId/activity` (guard JWT
  global da `004` + checagem de membership do quadro, reaproveitando o padrão da `005`/`007`),
  aceitando `?cursor=`/`?page=` e `?limit=` (default e máximo documentados no `design.md`), usando
  a skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 2.4 concluída.
  - **Aceite:** endpoint retorna a página de atividades mais recente primeiro; não-membro recebe
    403; `boardId` inexistente recebe 404.
  - **Não faça:** expor edição ou exclusão de atividade (log é append-only).
- [ ] 3.2 Mapear no i18n (pt/en) os rótulos de cada `type` do catálogo (ex.:
  `"{actor} moveu o cartão \"{title}\""`) e os erros do endpoint (403/404), com um rótulo de
  fallback genérico para `type` desconhecido.
  - **Aceite:** cada `type` do catálogo tem rótulo pt/en; fallback cobre `type` não mapeado.

## 4. Gancho nos controllers de 007/008/010 (ajuste pontual)

- [ ] 4.1 Em `list.controller.ts` (`007`): após a chamada existente a
  `RealtimeEmitter.emitToBoard(...)` no `create-list`, adicionar
  `ActivityRecorder.record(boardId, requesterId, 'list.created', { listId, title })`.
  - **Pré:** 2.3 concluída; `list.controller.ts` da `007` já aplicado no projeto.
  - **Aceite:** criar uma lista gera uma `Activity` do tipo `list.created` visível via
    `GET /boards/:boardId/activity`.
  - **Não faça:** alterar qualquer outro comportamento do `list.controller.ts` além desta
    chamada adicional.
- [ ] 4.2 Em `card.controller.ts` (`008`): após a chamada existente a
  `RealtimeEmitter.emitToBoard(...)`, adicionar `ActivityRecorder.record(...)` em três pontos:
  `create-card` → `type: 'card.created'`, `data: { cardId, listId, title }`; `move-card` →
  `type: 'card.moved'`, `data: { cardId, fromListId, toListId, position }`; `delete-card` →
  `type: 'card.deleted'`, `data: { cardId, listId }`.
  - **Pré:** 2.3 concluída; `card.controller.ts` da `008` já aplicado no projeto.
  - **Aceite:** criar, mover e excluir um cartão geram, respectivamente, as três `Activity`
    correspondentes, visíveis via `GET /boards/:boardId/activity`.
  - **Não faça:** alterar qualquer outro comportamento do `card.controller.ts` além destas três
    chamadas adicionais.
- [ ] 4.3 Em `member.controller.ts` (`010`): após a chamada existente a
  `RealtimeEmitter.emitToBoard(...)` na ação de adicionar membro, adicionar
  `ActivityRecorder.record(boardId, requesterId, 'member.added', { memberId, name })`.
  - **Pré:** 2.3 concluída; `member.controller.ts` da `010` já aplicado no projeto.
  - **Aceite:** adicionar um membro ao quadro gera uma `Activity` do tipo `member.added` visível
    via `GET /boards/:boardId/activity`.
  - **Não faça:** alterar qualquer outro comportamento do `member.controller.ts` além desta
    chamada adicional.

## 5. Frontend — painel de atividade

- [ ] 5.1 Criar o painel lateral de atividade na página do quadro (`009`): ao montar, busca
  `GET /boards/:boardId/activity` (primeira página) e assina `activity.created` no socket já
  conectado à sala `board:{boardId}`, inserindo novas entradas no topo, usando a skill
  [frontend-next-config](../../../.claude/skills/frontend-next-config) para o ajuste de
  configuração/rotas necessário à nova chamada REST.
  - **Pré:** página do quadro (`009`) e conexão Socket.IO do frontend (`009`/`006`) disponíveis.
  - **Aceite:** painel exibe o histórico carregado via REST e recebe novas entradas ao vivo sem
    recarregar a página; nenhuma entrada duplicada quando o evento chega antes/depois da resposta
    REST (merge por `id`).
- [ ] 5.2 Renderizar cada entrada com o rótulo i18n correspondente ao `type` (mapeado na task
  3.2), incluindo nome do ator e dados relevantes (ex.: título do cartão).
  - **Aceite:** cada `type` do catálogo exibe o rótulo esperado em pt e en; `type` desconhecido
    usa o rótulo de fallback sem quebrar a UI.

## 6. Verificação

- [ ] 6.1 Rodar `npx tsc --noEmit` (backend e frontend), rodar `npm test` garantindo que as
  suítes de `modules/board/activity` (caso de uso, provider, controller) e do painel de atividade
  estão verdes; validar manualmente: criar lista/cartão/mover cartão/adicionar membro gera
  entrada visível no painel em tempo real, e o histórico persiste após recarregar a página.
  - **Aceite:** `tsc` limpo; testes verdes; validação manual registrada na evidência do
    checkbox.
