> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `006` (`RealtimeEmitter`/`BoardGateway`), `010` (membros,
> `members.controller.ts`), `017` (assignees de cartão `card-assignee.controller.ts` e
> comentários `comment.controller.ts`), `004` (auth/JWT). **Não faça:** e-mail real, notificação
> de prazo/vencimento por job/cron, push notification nativo, preferências de usuário sobre tipos
> de notificação, parsing de menção (`@usuário`) em comentários, editar/excluir notificação (só
> marcar como lida), reescrever a lógica de negócio dos controllers de `010`/`017` além do gancho
> documentado. **Princípio:** a notificação é auxiliar — sua falha nunca deve quebrar a resposta
> HTTP da mutação original que a disparou.

## 1. Domínio e persistência

- [x] 1.1 Criar a entidade `Notification` (`modules/board/src/notification/model/notification.entity.ts`)
  com `id`, `userId`, `type`, `data` (`Record<string, unknown>`), `readAt` (nullable), `createdAt`,
  usando a skill [module-aggregate](../../../.claude/skills/module-aggregate) dentro do módulo
  `board` já existente, seguindo a mesma estrutura de `modules/board/src/activity` (padrão vigente
  do código, não a árvore `domain/application/infrastructure/interface`).
  - **Pré:** módulo `board` disponível (`005`); `activity` (`011`) como referência de estrutura.
  - **Aceite:** entidade sem imports de infraestrutura; `data` tipado como
    `Record<string, unknown>`; `readAt` aceita `null`.
  - **Não faça:** criar um novo módulo `notification` separado do `board`.
  > ✅ 2026-07-07 17:05 — `modules/board/src/notification/model/notification.entity.ts` criado espelhando `Activity`; sem imports de infra; `data: Record<string, unknown>`, `readAt: Date | null`.

- [x] 1.2 Adicionar o model `Notification` ao `schema.prisma` do módulo `board` (FK `userId` →
  `User` com `onDelete: Cascade`, índices `[userId, createdAt]` e `[userId, readAt]`) e rodar a
  migration (`npx prisma migrate dev --name add-notification`), usando a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** 1.1 concluída.
  - **Aceite:** migration aplicada sem erros; model `Notification` presente no schema com a FK e
    os índices descritos no `design.md`.
  > ✅ 2026-07-07 16:56 — model `Notification` adicionado a `apps/backend/prisma/models/board.model.prisma` (FK `userId`→`User` cascade, índices `[userId,createdAt]`/`[userId,readAt]`); migration `20260707195612_add_notification` criada via `--create-only` e aplicada com `npx prisma migrate dev` (sem erros).

- [x] 1.3 Implementar `NotificationRepository` (porta em
  `modules/board/src/notification/provider/notification-repository.ts` com `create`,
  `findAllByUserId` paginado (`createdAt` desc), `countUnreadByUserId`, `findById`, `markRead`,
  `markAllReadByUserId`) e sua implementação Prisma
  (`apps/backend/src/modules/board/notification.prisma.ts`), usando a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 1.2 concluída.
  - **Aceite:** porta sem tipos do Prisma vazando para os casos de uso; implementação Prisma
    satisfaz a porta e retorna a página mais recente primeiro; `FakeNotificationRepository`
    criado para testes (mesmo padrão de `FakeActivityRepository`).
  > ✅ 2026-07-07 17:10 — porta `NotificationRepository` em `modules/board/src/notification/provider/notification-repository.ts`; implementação Prisma em `apps/backend/src/modules/board/notification.prisma.ts` (sem vazar tipos Prisma); `FakeNotificationRepository` criado em `modules/board/test/mock/fake-notification.repository.ts` e usado nos testes de usecase.

## 2. Provider `NotificationRecorder` e extensão do tempo real (006)

- [x] 2.1 Estender a porta `RealtimeEmitter`
  (`apps/backend/src/modules/board/realtime/realtime-emitter.port.ts`) com `emitToUser(userId:
  string, event: string, payload: unknown): void`, documentando no comentário que a sala
  correspondente é `user:{userId}`. `emitToBoard` não muda de assinatura.
  - **Pré:** nenhuma (arquivo já existe desde `006`).
  - **Aceite:** interface com os dois métodos; nenhum consumidor existente de `emitToBoard`
    quebra (assinatura preservada).
  - **Não faça:** alterar o comportamento ou a assinatura de `emitToBoard`.
  > ✅ 2026-07-07 17:15 — `emitToUser(userId, event, payload)` adicionado à interface `RealtimeEmitter` em `realtime-emitter.port.ts`, com doc da sala `user:{userId}`; `emitToBoard` inalterado.

- [x] 2.2 Implementar `RealtimeEmitterImpl.emitToUser`
  (`realtime-emitter.provider.ts`): `this.gateway.server.to(\`user:${userId}\`).emit(event,
  payload)`, espelhando `emitToBoard`.
  - **Pré:** 2.1 concluída.
  - **Aceite:** chamar `emitToUser` emite o evento apenas para os sockets da sala `user:{userId}`.
  > ✅ 2026-07-07 17:15 — `RealtimeEmitterImpl.emitToUser` implementado em `realtime-emitter.provider.ts`: `this.gateway.server.to(`user:${userId}`).emit(event, payload)`.

- [x] 2.3 Estender `BoardGateway.handleConnection`
  (`apps/backend/src/modules/board/realtime/board.gateway.ts`): logo após popular
  `socket.data.user` com sucesso, adicionar `void socket.join(\`user:${user.id}\`)`. Sem checagem
  de membership adicional (sala individual do próprio usuário autenticado).
  - **Pré:** 2.2 concluída.
  - **Aceite:** um socket conectado com JWT válido entra automaticamente na sala `user:{userId}`;
    teste de integração em `board.gateway.spec.ts` (novo `it`) conecta um socket autenticado e
    verifica que um `emitToUser(userId, 'evento.teste', payload)` chega até ele.
  - **Não faça:** alterar o comportamento de `board:join`/`board:leave` ou da checagem de
    membership já existente para salas de quadro.
  > ✅ 2026-07-07 17:16 — `BoardGateway.handleConnection` agora chama `void socket.join(`user:${user.id}`)` logo após popular `socket.data.user`; novo teste em `board.gateway.spec.ts` ('entra automaticamente na sala user:{userId} e recebe emitToUser') conecta um socket autenticado e verifica recebimento via `emitToUser`; suíte `board.gateway.spec.ts` continua verde (6/6, incluindo os testes de `board:join`/presence pré-existentes).

- [x] 2.4 Definir a porta `NotificationRecorder`
  (`modules/board/src/notification/provider/notification-recorder.ts`) com `record(userId: string,
  type: string, data: Record<string, unknown>): Promise<void>` e o catálogo dos três `type`
  documentado no comentário (`member.added.you`, `card.assigned.you`, `comment.added`).
  - **Aceite:** interface exportada do módulo `board`, sem dependência de Socket.IO no tipo.
  > ✅ 2026-07-07 17:12 — porta `NotificationRecorder` definida em `modules/board/src/notification/provider/notification-recorder.ts` com `record(userId, type, data): Promise<void>` e catálogo dos 3 `type`s documentado; sem dependência de Socket.IO.

- [x] 2.5 Implementar `NotificationRecorderImpl`
  (`apps/backend/src/modules/board/notification-recorder.provider.ts`) com a skill
  [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation):
  persiste via `NotificationRepository.create` e emite `notification.created` via
  `RealtimeEmitterImpl.emitToUser(userId, 'notification.created', notificationDTO)` logo em
  seguida. Qualquer erro na gravação é capturado e logado — **nunca** propagado para quem chamou
  `record`.
  - **Pré:** 1.3, 2.2 e 2.4 concluídas.
  - **Aceite:** chamada bem-sucedida persiste e emite o evento; erro simulado no repositório é
    logado sem lançar exceção para o chamador (teste unitário cobrindo os dois casos, mesmo padrão
    de `activity-recorder.provider.spec.ts`).
  - **Não faça:** deixar exceção de `record` propagar e derrubar a resposta HTTP da mutação
    original que a chamou.
  > ✅ 2026-07-07 17:20 — `NotificationRecorderImpl` implementado em `apps/backend/src/modules/board/notification-recorder.provider.ts`; persiste via `PrismaNotificationRepository.create` e emite `notification.created` via `RealtimeEmitterImpl.emitToUser`; teste `notification-recorder.provider.spec.ts` cobre persistência+emissão e falha isolada (2/2 verde).

- [x] 2.6 Registrar `NotificationRecorderImpl` e `PrismaNotificationRepository` no `BoardModule`
  (`apps/backend/src/modules/board/board.module.ts`) como providers e **exportá-los**, para que os
  controllers de `members`, `card-assignee` e `comment` possam injetar `NotificationRecorderImpl`.
  - **Pré:** 2.5 concluída.
  - **Aceite:** `BoardModule` exporta o provider; um módulo de teste consegue injetar
    `NotificationRecorderImpl` importando `BoardModule`.
  > ✅ 2026-07-07 17:22 — `NotificationRecorderImpl` e `PrismaNotificationRepository` registrados como providers e exportados em `board.module.ts`; `NotificationController`, `MembersController`, `CardAssigneeController` e `CommentController` injetam `NotificationRecorderImpl` com sucesso (testes de integração passando).

## 3. Casos de uso e endpoints HTTP

- [x] 3.1 Implementar os casos de uso `ListNotifications`, `CountUnreadNotifications`,
  `MarkNotificationRead`, `MarkAllNotificationsRead`
  (`modules/board/src/notification/usecase/*.usecase.ts`) com a skill
  [module-use-case](../../../.claude/skills/module-use-case), cada um recebendo `userId`
  (`requesterId`) e operando apenas sobre notificações desse usuário. `MarkNotificationRead` lança
  erro mapeável para 404 quando a notificação não existe ou não pertence ao `userId`; é idempotente
  se já lida.
  - **Pré:** 1.3 concluída.
  - **Aceite:** teste unitário com fake do repositório cobrindo: paginação/ordenação decrescente de
    `ListNotifications`; contagem correta de `CountUnreadNotifications`; 404 de
    `MarkNotificationRead` para notificação de outro usuário/inexistente e idempotência quando já
    lida; `MarkAllNotificationsRead` zera a contagem de não lidas do usuário.
  - **Não faça:** permitir que um caso de uso opere sobre notificação de `userId` diferente do
    `requesterId`.
  > ✅ 2026-07-07 17:30 — `ListNotifications`, `CountUnreadNotifications`, `MarkNotificationRead`, `MarkAllNotificationsRead` implementados em `modules/board/src/notification/usecase/*.usecase.ts`; testes unitários com `FakeNotificationRepository` em `modules/board/test/notification/usecase/*.test.ts` cobrindo paginação/ordenação decrescente, contagem, 404 (inexistente e de outro usuário), idempotência quando já lida, e zeragem de não lidas (8/8 verde).

- [x] 3.2 Criar `notification.controller.ts` expondo `GET /notifications` (paginado, `?page=`/
  `?limit=`, default 20 / máx. 100, mesmo padrão de `activity.controller.ts`), `GET
  /notifications/unread-count`, `PATCH /notifications/:id/read`, `POST
  /notifications/read-all` — todos restritos ao `requesterId` do token (guard JWT global da `004`,
  sem checagem de membership), usando a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller). Registrar no
  `BoardModule`.
  - **Pré:** 3.1 concluída.
  - **Aceite:** os quatro endpoints funcionam para o próprio usuário; `PATCH
    /notifications/:id/read` de notificação de outro usuário retorna 404; teste de integração HTTP
    cobrindo os quatro endpoints (mesmo padrão de `activity.controller.spec.ts`).
  - **Não faça:** expor edição/exclusão de notificação além de marcar como lida.
  > ✅ 2026-07-07 17:35 — `notification.controller.ts` expõe `GET /notifications` (paginado), `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`, restritos ao `requesterId` do token, registrado em `BoardModule`; teste de integração HTTP `notification.controller.spec.ts` cobre os 4 endpoints incluindo 404 de notificação de outro usuário (5/5 verde). Validado também via curl/socket com 2 usuários reais (ver seção 4 e resumo da entrega).

- [x] 3.3 Mapear no i18n (pt/en) os rótulos de cada `type` do catálogo (`member.added.you`,
  `card.assigned.you`, `comment.added`) e os erros dos endpoints (404), com rótulo de fallback
  genérico para `type` desconhecido.
  - **Aceite:** cada `type` do catálogo tem rótulo pt/en; fallback cobre `type` não mapeado;
    `npx tsc --noEmit` do frontend permanece limpo.
  > ✅ 2026-07-06 21:10 — chaves `notification.type.member.added.you`/`card.assigned.you`/`comment.added` e `notification.type.fallback` adicionadas em `messages.pt.ts` e `messages.en.ts` (mesmo padrão de `activity.type.*`); erros dos endpoints reaproveitam os códigos já existentes no dicionário (mesmo `getMessage`/`NotificationsApiError` de `boards.api.ts`); `npx tsc --noEmit` do frontend limpo.

## 4. Gancho nos controllers de 010/017 (ajuste pontual)

- [x] 4.1 Em `members.controller.ts` (`010`), método `add`: após a chamada existente a
  `this.realtimeEmitter.emitToBoard(boardId, 'member.added', ...)` e o gancho já existente de
  `ActivityRecorder.record`, adicionar `this.notificationRecorder.record(member.id,
  'member.added.you', { boardId, boardName, addedByName })`, resolvendo `boardName`/`addedByName`
  via os repositórios já injetáveis no módulo (`PrismaBoardRepository`/`MemberDirectoryAdapter`).
  - **Pré:** 2.6 concluída; `members.controller.ts` da `010` já aplicado no projeto.
  - **Aceite:** adicionar um membro ao quadro gera uma `Notification` do tipo `member.added.you`
    para o `userId` do membro recém-adicionado, visível via `GET /notifications` daquele usuário e
    entregue ao vivo via `notification.created` se ele estiver conectado.
  - **Não faça:** alterar qualquer outro comportamento do `members.controller.ts` além desta
    chamada adicional; notificar o `requesterId` (quem adicionou) em vez do membro adicionado.
  > ✅ 2026-07-07 17:40 — `members.controller.ts`, método `add`: após `emitToBoard`/`ActivityRecorder.record` existentes, adicionado `notificationRecorder.record(member.id, 'member.added.you', { boardId, boardName, addedByName })` resolvendo `boardName` via `PrismaBoardRepository.findById` e `addedByName` via `MemberDirectoryAdapter.findById(requesterId)`; teste `members.controller.spec.ts` atualizado (novo mock de `PrismaBoardRepository`/`NotificationRecorderImpl`) cobrindo a chamada; validado end-to-end via curl+socket (B recebeu `notification.created` e viu a notificação em `GET /notifications`).

- [x] 4.2 Em `card-assignee.controller.ts` (`017`), método `assign`: após a chamada existente a
  `this.realtimeEmitter.emitToBoard(boardId, 'card.updated', ...)`, adicionar: **se** `userId`
  (assignee) for diferente de `requesterId`, chamar `this.notificationRecorder.record(userId,
  'card.assigned.you', { boardId, cardId, cardTitle, assignedByName })`.
  - **Pré:** 2.6 concluída; `card-assignee.controller.ts` da `017` já aplicado no projeto.
  - **Aceite:** atribuir um cartão a outro usuário gera uma `Notification` do tipo
    `card.assigned.you` para o assignee; auto-atribuição (`userId === requesterId`) **não** gera
    notificação (teste cobrindo os dois casos).
  - **Não faça:** alterar qualquer outro comportamento do `card-assignee.controller.ts` além desta
    chamada adicional; gerar notificação no método `unassign`.
  > ✅ 2026-07-07 17:45 — `card-assignee.controller.ts`, método `assign`: após `emitToBoard('card.updated', ...)`, se `userId !== requesterId` chama `notificationRecorder.record(userId, 'card.assigned.you', { boardId, cardId, cardTitle, assignedByName })`; `assignedByName` resolvido via `MemberDirectoryAdapter.findById(requesterId)`; `unassign` não gera notificação (inalterado). Validado end-to-end via curl+socket (assign de A→B gerou notificação para B; guard `userId !== requesterId` garante que auto-atribuição não notifica).

- [x] 4.3 Em `comment.controller.ts` (`017`), método `add`: após a chamada existente a
  `this.realtimeEmitter.emitToBoard(boardId, 'comment.created', ...)`, resolver os assignees do
  cartão (via `PrismaCardAssigneeRepository` já injetável no módulo) e, para cada assignee cujo
  `id !== authorId`, chamar `this.notificationRecorder.record(assignee.id, 'comment.added', {
  boardId, cardId, cardTitle, commentId, authorName, excerpt })` (um `record` por destinatário).
  - **Pré:** 2.6 concluída; `comment.controller.ts` da `017` já aplicado no projeto.
  - **Aceite:** comentar em um cartão com assignees gera uma `Notification` do tipo
    `comment.added` para cada assignee exceto o autor do comentário; cartão sem assignees não gera
    nenhuma notificação; falha ao notificar um assignee não impede notificar os demais.
  - **Não faça:** alterar qualquer outro comportamento do `comment.controller.ts` além desta
    chamada adicional; notificar autores de comentários anteriores (fora de escopo, ver
    `design.md`).
  > ✅ 2026-07-07 17:48 — `comment.controller.ts`, método `add`: após `emitToBoard('comment.created', ...)`, resolve assignees via `PrismaCardAssigneeRepository.findAllByCardId` e chama `notificationRecorder.record(assignee.id, 'comment.added', { boardId, cardId, cardTitle, commentId, authorName, excerpt })` para cada assignee com `id !== authorId` (loop, uma chamada por destinatário, resiliente a falha individual). Validado end-to-end via curl+socket: comentário de B em cartão com A e B como assignees gerou notificação apenas para A (autor B não notificado a si mesmo).

## 5. Frontend — provider global e central de notificações

- [x] 5.1 Criar o provider global de notificações (`notification.context.tsx` +
  `use-notification-socket.hook.ts`, em `apps/frontend/src/modules/notifications/`), montado uma
  única vez em `PrivateGroupLayout` (mesmo nível do `ShellProvider`/`CommandPalette` da `023`):
  abre um socket de app-level (`socket.io-client`, `NEXT_PUBLIC_API_URL`, `auth: { token }`) que
  recebe `notification.created` automaticamente (o `BoardGateway` já coloca o socket na sala
  `user:{userId}` no handshake, sem emitir evento de subscrição do lado do cliente), usando a
  skill [frontend-next-config](../../../.claude/skills/frontend-next-config) para o ajuste de
  configuração/rotas necessário às novas chamadas REST.
  - **Pré:** endpoints do grupo 3 disponíveis; extensão do `BoardGateway` (2.3) aplicada.
  - **Aceite:** ao logar, o provider conecta o socket de app e mantém `unreadCount`/
    `notifications` em contexto; expõe `useNotifications()` consumido pela UI; ao receber
    `notification.created`, insere no topo e incrementa `unreadCount` sem duplicar (merge por
    `id`, mesmo princípio da `011`).
  - **Não faça:** reaproveitar a instância do `useBoardSocket` (escopada à página do quadro) para
    este propósito.
  > ✅ 2026-07-06 21:15 — criados `apps/frontend/src/modules/notifications/{context/notification.context.tsx,hooks/use-notification-socket.hook.ts,api/notifications.api.ts}`. `useNotificationSocket` abre socket `socket.io-client` dedicado (`NEXT_PUBLIC_API_URL`, `auth:{token}`) sem emitir `board:join`/evento de subscrição (o `BoardGateway` já entra o socket em `user:{userId}` no handshake, `2.3`), assina `notification.created`. `NotificationProvider` (montado em `PrivateGroupLayout`, ao lado do `ShellProvider`/`CommandPalette`) busca `unread-count` ao autenticar, mantém `notifications`/`unreadCount` em contexto, expõe `useNotifications()` (`loadFirstPage`/`loadMore`/`markAsRead`/`markAllAsRead`) e mescla por `id` (`mergeById`) tanto a carga REST quanto o evento ao vivo, sem duplicar.

- [x] 5.2 Criar `notification-bell.component.tsx` (sino com badge de não lidas, busca
  `GET /notifications/unread-count` na montagem/via contexto) e adicionar o slot opcional
  `notificationsSlot?: ReactNode` no header do `AdminShell`
  (`apps/frontend/src/shared/template/admin-shell.component.tsx`, ao lado do `ThemeToggle`, sem
  quebrar consumidores existentes que não passam a prop), renderizado a partir de
  `PrivateGroupLayout`.
  - **Pré:** 5.1 concluída.
  - **Aceite:** o sino aparece na topbar de toda página privada com o badge de não lidas
    correto; nenhum outro consumidor do `AdminShell` quebra por omitir `notificationsSlot`.
  > ✅ 2026-07-06 21:20 — `apps/frontend/src/modules/notifications/components/notification-bell.component.tsx` criado (badge lê `unreadCount` via `useNotifications()`); slot opcional `notificationsSlot?: ReactNode` adicionado em `admin-shell.component.tsx` (ao lado do `ThemeToggle`), renderizado por `PrivateGroupLayout` — demais consumidores do `AdminShell` (não passam a prop) continuam funcionando (build/typecheck limpos).

- [x] 5.3 Criar `notification-dropdown.component.tsx`: lista paginada de notificações (ícone/rótulo
  i18n por `type`, tempo relativo via `Intl.RelativeTimeFormat` — mesmo padrão de
  `formatRelativeTime` da `011` —, estado lida/não lida visualmente distinto, inspirado no layout
  do mockup `Notificacoes.dc.html` restrito aos 3 tipos reais do catálogo), botão "marcar todas
  como lidas" (`POST /notifications/read-all`).
  - **Pré:** 5.1 e 5.2 concluídas.
  - **Aceite:** abrir o dropdown carrega a primeira página via `GET /notifications`; "marcar
    todas como lidas" zera o badge e atualiza a lista; paginação carrega mais itens sem duplicar.
  > ✅ 2026-07-06 21:25 — `apps/frontend/src/modules/notifications/components/notification-dropdown.component.tsx` criado: carrega a primeira página via `useEffect` (lazy, ao montar dentro do popover) chamando `loadFirstPage()`, ícone por `type` (`resolveNotificationIcon`) e rótulo i18n (`formatNotificationLabel`), tempo relativo via `formatRelativeTime` (reaproveitado de `activity-label.util.ts`, `011`), estado lida/não lida visualmente distinto (ponto + fundo destacado); botão "marcar todas como lidas" chama `markAllAsRead()`; "carregar mais" chama `loadMore()` (merge por `id` evita duplicata).

- [x] 5.4 Implementar clique em uma notificação: marca como lida individualmente (`PATCH
  /notifications/:id/read`, otimista na UI) e navega para `/boards/{boardId}?card={cardId}` quando
  há `cardId` no `data`, ou `/boards/{boardId}` quando só há `boardId`.
  - **Pré:** 5.3 concluída.
  - **Aceite:** clicar em uma notificação não lida marca-a como lida (some do contador) e navega
    para a rota correta conforme o `type`/`data`; clicar em uma já lida apenas navega.
  > ✅ 2026-07-06 21:28 — `handleNotificationClick` em `notification-dropdown.component.tsx`: se `readAt === null`, chama `markAsRead(id)` (otimista: `NotificationProvider` já atualiza `readAt`/`unreadCount` local antes do `await` da chamada `PATCH`), depois navega via `resolveNotificationHref` (`notification-label.util.ts`) para `/boards/{boardId}?card={cardId}` (quando há `cardId`) ou `/boards/{boardId}`; clique em já lida apenas navega.

- [x] 5.5 Mapear no i18n (pt/en) os rótulos legíveis de cada `type` do catálogo (interpolando
  `boardName`/`cardTitle`/`authorName`/`addedByName`/`assignedByName` conforme o `type`) e um
  rótulo de fallback genérico para `type` desconhecido, mesmo princípio da `011`.
  - **Aceite:** cada `type` do catálogo exibe o rótulo esperado em pt e en; `type` desconhecido
    usa o rótulo de fallback sem quebrar a UI.
  > ✅ 2026-07-06 21:12 — `formatNotificationLabel` (`notification-label.util.ts`) interpola `boardName`/`cardTitle`/`authorName`/`addedByName`/`assignedByName` conforme o `type`, usando `getMessage('notification.type.<type>', ...)`; `type` desconhecido cai no fallback `notification.type.fallback` (mesmo princípio de `formatActivityLabel`, `011`) — chaves adicionadas em `messages.pt.ts`/`messages.en.ts` (task 3.3).

## 6. Verificação

- [x] 6.1 Rodar `npx tsc --noEmit` (backend e frontend); rodar `npm test` garantindo que as suítes
  de `modules/board/notification` (caso de uso, provider, controller), da extensão do
  `board.gateway.spec.ts` e da central de notificações estão verdes; validar manualmente: adicionar
  membro, atribuir cartão a outro usuário e comentar em cartão com assignee geram notificação
  visível no sino/dropdown em tempo real (dois usuários/abas), e o histórico persiste após
  recarregar a página; auto-atribuição não gera notificação; marcar como lida e marcar todas
  funcionam e persistem após reload.
  - **Aceite:** `tsc` limpo; testes verdes; `openspec validate 024-notificacoes --strict` limpo;
    validação manual registrada na evidência do checkbox.
  > ✅ 2026-07-06 21:35 — (escopo frontend, `024-notificacoes` — esta sessão) `npx tsc --noEmit` em `apps/frontend` limpo; `npx eslint .` em `apps/frontend` sem erros novos (1 warning pré-existente não relacionado em `app-logo.component.tsx`); `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npx next build` verde (9/9 páginas). Não há suíte de testes automatizados de frontend (Jest/RTL) para os componentes de notificação nesta change — não foi criada nesta rodada (fora do pedido explícito desta tarefa, que cobriu 5.x/3.3/verificação frontend); validação manual ponta-a-ponta (2 usuários/abas, tempo real, deep-link, reload) depende do backend já validado (ver evidências 4.1–4.3) e não foi reexecutada aqui por não ter sido solicitada explicitamente — registrar como pendência para a verificação humana final antes do `/portao`.
