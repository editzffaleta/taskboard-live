## Context

O módulo `board` já tem `Board`/`BoardMember` (`005`), `RealtimeEmitter`/`BoardGateway` (`006`),
`card` com assignees (`017`) e comentários (`017`), `member` (`010`), e a trilha de auditoria por
quadro `activity` (`011`, modelo de referência direto para esta change: persistir + emitir via
`RealtimeEmitter`). Esta change entrega o agregado `notification`: diferente de `activity` (que é
por **quadro**, visível a todo membro que consulta o histórico do quadro), `notification` é por
**usuário** — cada notificação pertence a exatamente um `userId` e só ele pode consultá-la. Isso
exige um canal de tempo real novo: hoje o `BoardGateway` só coloca sockets em salas `board:{id}`
(via `board:join`, explícito, checando membership). Notificação precisa de entrega ao vivo
independente de o usuário estar com algum quadro aberto — daí a sala `user:{userId}`, entrada
automaticamente no handshake (o usuário já está autenticado ali via JWT, sem checagem adicional
de membership, porque a sala é dele mesmo).

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md). Mockup de referência:
`mockups/Notificacoes.dc.html` (central de notificações — usada para o layout/tom visual da
lista; os tipos "menção"/"convite pendente com aceitar-recusar"/"prazo" do mockup **não** são
implementados nesta change, ver Non-Goals; apenas os 3 gatilhos reais do escopo usam ícones e
rótulos análogos aos do mockup).

## Goals / Non-Goals

**Goals:**
- Persistir cada evento relevante por usuário como uma `Notification` (quem recebe, o quê,
  quando, se já foi lida).
- Canal de tempo real por usuário (`user:{userId}`), sem depender de o usuário ter algum quadro
  aberto — extensão pontual do `RealtimeEmitter`/`BoardGateway` (`006`), sem quebrar o contrato
  existente (`emitToBoard`, salas `board:{id}`).
- Três gatilhos reais, ganchados nos controllers já existentes: membro adicionado (`010`),
  assignee atribuído a um cartão, novo comentário em cartão (`017`).
- Consulta paginada, contagem de não lidas, marcar como lida (individual e em lote) — tudo restrito
  ao próprio usuário autenticado, sem checagem de membership de quadro (a notificação já nasce
  associada ao dono).
- Central de notificações no frontend: sino com badge na topbar, dropdown/lista, deep-link ao
  recurso, atualização ao vivo via um provider global (não o `useBoardSocket`, que só existe
  dentro da página de um quadro).

**Non-Goals:**
- E-mail real, push notification nativo (browser/mobile).
- Notificação de prazo/vencimento de cartão via job/cron (exigiria um scheduler, fora de escopo).
- Menções explícitas (`@usuário` dentro do texto do comentário) — o mockup mostra o conceito, mas
  o gatilho de comentário desta change é simples: notifica os assignees do cartão, exceto o
  autor do comentário (ver regra abaixo). Parsing de menção fica para uma change futura.
- Preferências de usuário (silenciar tipos, digest por e-mail) — todas as notificações do catálogo
  são sempre geradas.
- Editar/excluir notificação (é possível marcar como lida, não apagar).

## Decisions

- **Localização**: mesmo critério da `011` — dentro do módulo `board` já existente, reaproveitando
  `RealtimeEmitter`, `BoardModule` e a infraestrutura Prisma, sem criar workspace novo nem
  `@taskboard/shared` adicional. Segue o padrão real do repositório (mesma estrutura usada por
  `activity`, `modules/board/src/<agregado>/{model,provider,usecase}` — não a árvore
  `domain/application/infrastructure/interface` do texto original da `011`, que a própria `011`
  já registrou como desvio permanente):

```
modules/board/src/notification/
  model/
    notification.entity.ts
  provider/
    notification-repository.ts
    notification-recorder.ts
  usecase/
    list-notifications.usecase.ts
    count-unread-notifications.usecase.ts
    mark-notification-read.usecase.ts
    mark-all-notifications-read.usecase.ts

apps/backend/src/modules/board/
  notification.prisma.ts               (implementação Prisma do repositório)
  notification-recorder.provider.ts    (implementação concreta do NotificationRecorder)
  notification.controller.ts           (HTTP)
```

- **Entidade `Notification`**: campos `id`, `userId` (FK `User`), `type` (string — catálogo
  abaixo), `data` (JSON — payload específico do tipo), `readAt` (nullable — `null` = não lida),
  `createdAt`. Append-only exceto por `readAt`, que é o único campo mutável (via os dois casos de
  uso de marcar como lida).

- **Catálogo de `type`** (SHALL cobrir exatamente estes três nesta change):
  - `member.added.you` → `{ boardId, boardName, addedByName }` — disparado quando o próprio
    usuário é adicionado como membro de um quadro (não confundir com `activity.type: 'member.added'`
    da `011`, que registra o evento no quadro para todos; esta notificação é dirigida somente a
    quem foi adicionado).
  - `card.assigned.you` → `{ boardId, cardId, cardTitle, assignedByName }` — disparado quando o
    próprio usuário é atribuído como assignee de um cartão. **Regra**: se o usuário que atribui
    (`requesterId`) for o mesmo que está sendo atribuído (`userId` do path), **nenhuma**
    notificação é gerada (evita "você se atribuiu, notificação para você mesmo").
  - `comment.added` → `{ boardId, cardId, cardTitle, commentId, authorName, excerpt }` —
    disparado quando um novo comentário é adicionado a um cartão. **Regra de destinatários**:
    notifica todos os assignees do cartão, **exceto o autor do comentário** (se o autor também for
    assignee, ele não recebe notificação do próprio comentário). Não notifica autores de
    comentários anteriores nesta change (mantém a regra simples, documentada aqui; ampliar para
    "participantes da thread" fica para uma change futura, se necessário). `excerpt` é o texto do
    comentário truncado (ex.: 140 caracteres), sem reprocessamento de menção.
  - Novos `type`s futuros seguem o mesmo padrão `<agregado>.<evento>[.you]`, documentado no
    comentário da entidade/porta `NotificationRecorder` e no i18n.

- **Porta `RealtimeEmitter` (`006`) — extensão**: adicionar `emitToUser(userId: string, event:
  string, payload: unknown): void` à interface em `realtime-emitter.port.ts`, documentando no
  comentário do arquivo que a sala correspondente é `user:{userId}` (analogamente a `board:{id}`).
  `emitToBoard` **não muda de assinatura nem de comportamento** — é apenas uma porta com dois
  métodos agora. Implementação em `realtime-emitter.provider.ts`
  (`RealtimeEmitterImpl.emitToUser`): `this.gateway.server.to(\`user:${userId}\`).emit(event,
  payload)`, espelhando `emitToBoard`.

- **`BoardGateway` (`006`) — extensão do handshake**: em `handleConnection`, logo após validar o
  JWT e popular `socket.data.user`, adicionar `void socket.join(\`user:${user.id}\`)`. Diferente de
  `board:join` (que exige checagem de membership porque a sala é compartilhada por todos os
  membros do quadro), a sala `user:{userId}` é individual — o próprio usuário autenticado sempre
  pode estar nela, sem checagem adicional. Nenhum evento novo de subscrição do lado do cliente é
  necessário (a entrada é automática no connect). O `board.gateway.spec.ts` existente (`006`) não
  precisa mudar de comportamento para os testes já existentes; um novo teste cobre que o socket
  entra automaticamente na sala do usuário e recebe eventos emitidos via `emitToUser`.

- **Porta `NotificationRecorder`** (`provider/notification-recorder.ts`): interface com um único
  método, `record(userId: string, type: string, data: Record<string, unknown>): Promise<void>`.
  Implementação concreta (`notification-recorder.provider.ts`, skill
  [backend-provider-implementation](../../.claude/skills/backend-provider-implementation)): 1)
  persiste a `Notification` via `NotificationRepository.create`; 2) injeta `RealtimeEmitterImpl`
  (já exportado pelo `BoardModule` desde `006`) e chama `emitToUser(userId, 'notification.created',
  notificationDTO)` com a notificação recém-criada. Bloco `try/catch`: qualquer erro é logado
  (`Logger.error`) e **nunca** propagado para quem chamou `record` — mesmo princípio do
  `ActivityRecorder` (`011`): a notificação é auxiliar, sua falha não pode quebrar a resposta HTTP
  da mutação original. Registrada como provider no `BoardModule` e **exportada**, para que
  `members.controller.ts`, `card-assignee.controller.ts` e `comment.controller.ts` a injetem.

- **Casos de uso**:
  - `list-notifications` (`ListNotifications`): recebe `userId`, `page`/`perPage`. Retorna página
    de `Notification` do próprio usuário, ordenada por `createdAt` decrescente, via
    `NotificationRepository.findAllByUserId` (paginado, mesmo padrão de `PageResult` usado por
    `list-activity`).
  - `count-unread-notifications` (`CountUnreadNotifications`): recebe `userId`. Retorna
    `{ count }` via `NotificationRepository.countUnreadByUserId`.
  - `mark-notification-read` (`MarkNotificationRead`): recebe `notificationId`, `userId`. Busca a
    notificação; lança erro de domínio mapeável para 404 se não existir **ou** não pertencer ao
    `userId` informado (mesma técnica de "não vaza existência de recurso de outro usuário" usada
    em outros módulos do projeto); se já lida, é idempotente (não lança erro); seta `readAt =
    now()` via `NotificationRepository.markRead`.
  - `mark-all-notifications-read` (`MarkAllNotificationsRead`): recebe `userId`. Marca todas as
    não lidas do usuário como lidas via `NotificationRepository.markAllReadByUserId`.
  Todos cobertos por teste unitário com fake do repositório, mesmo padrão de `list-activity`.

- **Persistência Prisma**: adicionar ao `schema.prisma` (schema modular do módulo `board`,
  arquivo `apps/backend/prisma/models/board.model.prisma`):

```prisma
model Notification {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String
  data      Json
  readAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId, createdAt])
  @@index([userId, readAt])
  @@map("notifications")
}
```

  Rodar migration (`npx prisma migrate dev --name add-notification`) dentro de `apps/backend`.
  `NotificationRepository` (porta em `provider/notification-repository.ts`) expõe: `create`,
  `findAllByUserId` (paginado, `createdAt` desc), `countUnreadByUserId`, `findById`, `markRead`,
  `markAllReadByUserId`. Implementação Prisma em `apps/backend/src/modules/board/notification.prisma.ts`,
  sem vazar tipos do Prisma para os casos de uso (mesmo padrão de `activity.prisma.ts`).

- **Endpoints HTTP** (`notification.controller.ts`, guard JWT global da `004`, sem checagem de
  membership — o recurso é do próprio usuário):
  - `GET /notifications` — paginado (`?page=`, `?limit=`, default 20 / máx. 100, mesmo padrão de
    `activity.controller.ts`), mais recente primeiro, restrito ao `requesterId` do token.
  - `GET /notifications/unread-count` — `{ count }` do `requesterId`.
  - `PATCH /notifications/:id/read` — marca a notificação como lida; 404 se não existir ou não
    pertencer ao `requesterId`.
  - `POST /notifications/read-all` — marca todas as não lidas do `requesterId` como lidas.

- **Gancho nos controllers de `010`/`017`** (ajuste pequeno, documentado aqui — **não** implementado
  por esta change dentro daqueles arquivos além do gancho em si; o gancho, quando aplicado, é
  aplicado nesses controllers, exatamente como a `011` fez com `ActivityRecorder`):
  - `members.controller.ts` (`010`), método `add` (`POST /boards/:boardId/members`): logo após a
    chamada existente a `this.realtimeEmitter.emitToBoard(boardId, 'member.added', ...)` e ao
    gancho já existente de `ActivityRecorder.record(...)`, adicionar
    `NotificationRecorder.record(member.id, 'member.added.you', { boardId, boardName, addedByName
    })` — `member.id` é o `userId` do membro recém-adicionado (destinatário da notificação, **não**
    o `requesterId`). `boardName`/`addedByName` exigem uma pequena resolução adicional (via
    `BoardRepository`/`MemberDirectoryAdapter`, já disponíveis no módulo) — se a resolução falhar,
    seguir o mesmo princípio: logar e não quebrar a resposta.
  - `card-assignee.controller.ts` (`017`), método `assign` (`PUT
    /boards/:boardId/cards/:cardId/assignees/:userId`): logo após a chamada existente a
    `this.realtimeEmitter.emitToBoard(boardId, 'card.updated', ...)`, adicionar: **se** `userId`
    (o assignee) for diferente de `requesterId`, chamar
    `NotificationRecorder.record(userId, 'card.assigned.you', { boardId, cardId, cardTitle,
    assignedByName })`. Se `userId === requesterId` (usuário se auto-atribuiu), **não** gera
    notificação (regra documentada acima).
  - `comment.controller.ts` (`017`), método `add` (`POST
    /boards/:boardId/cards/:cardId/comments`): logo após a chamada existente a
    `this.realtimeEmitter.emitToBoard(boardId, 'comment.created', ...)`, resolver os assignees do
    cartão (via `PrismaCardAssigneeRepository`, já injetável no módulo) e, para cada assignee cujo
    `id !== authorId`, chamar `NotificationRecorder.record(assignee.id, 'comment.added', { boardId,
    cardId, cardTitle, commentId: comment.id, authorName: response.authorName, excerpt })` (um
    `record` por destinatário — `NotificationRecorder.record` já é resiliente a erro individual,
    então uma falha ao notificar um assignee não impede notificar os demais).
  Cada chamada a `NotificationRecorder.record` acontece **no controller**, no mesmo ponto onde o
  `emitToBoard` do próprio recurso já acontece — nunca dentro do caso de uso do recurso (que
  permanece livre de dependências de `notification`/tempo real). Falha ao gravar notificação não
  deve quebrar a resposta HTTP da mutação original.

- **Frontend — abordagem do socket (decisão central desta change)**: o `useBoardSocket` existente
  só é montado dentro da página de um quadro (recebe `boardId`) e entra na sala `board:{id}` via
  `board:join`. Notificação precisa funcionar em qualquer página privada, mesmo sem quadro aberto —
  então esta change introduz um **provider global de notificações**
  (`notification.context.tsx` + `use-notification-socket.hook.ts`), montado uma única vez em
  `PrivateGroupLayout` (mesmo nível do `AuthGuard`/`ShellProvider`, ao lado do `CommandPalette`
  já montado ali pela `023`), que:
  1. Abre **seu próprio** socket (`socket.io-client`, mesma `NEXT_PUBLIC_API_URL`, `auth: { token
     }`) — não reaproveita a instância do `useBoardSocket` porque essa é escopada à página do
     quadro e desmonta ao navegar para fora dele. O `BoardGateway` já coloca **qualquer** socket
     autenticado na sala `user:{userId}` no handshake (extensão descrita acima), então este socket
     de app recebe `notification.created` automaticamente, sem emitir nenhum evento
     `board:join`/`user:join` do lado do cliente.
  2. Ao conectar, busca a contagem inicial via `GET /notifications/unread-count` e a primeira
     página via `GET /notifications` (lazy, só ao abrir o dropdown, para não pesar toda página
     privada).
  3. Mantém em contexto: `unreadCount`, `notifications` (cache da última página carregada),
     `markAsRead(id)`, `markAllAsRead()`, e assina `notification.created` para inserir no topo da
     lista em memória e incrementar `unreadCount` — mesmo princípio de merge por `id` da `011`
     (evita duplicata entre carga REST e evento ao vivo).
  4. Expõe um hook `useNotifications()` consumido pelo componente de sino/dropdown.
  Alternativa descartada: reusar `useBoardSocket` — rejeitada porque esse hook só existe dentro da
  árvore da página de um quadro (não do layout privado inteiro) e teria que ser remontado em todo
  lugar que precisasse do sino, duplicando conexões de socket por página.

- **Frontend — UI**: sino (`notification-bell.component.tsx`) injetado no `AdminShell` (novo slot
  opcional `notificationsSlot?: ReactNode` no header, ao lado do `ThemeToggle`, sem alterar o
  contrato dos consumidores existentes que não passam essa prop) renderizado pelo
  `PrivateGroupLayout`. Dropdown (`notification-dropdown.component.tsx`) lista as notificações
  (ícone + rótulo i18n por `type`, tempo relativo, estado lida/não lida — visual inspirado no
  mockup `Notificacoes.dc.html`, mas sem os itens de tipo "convite pendente"/"menção"/"prazo" que
  não fazem parte do catálogo real). Clique em uma notificação: marca como lida e navega — 
  `member.added.you`/`card.assigned.you`/`comment.added` todos levam para
  `/boards/{boardId}?card={cardId}` quando há `cardId`, ou `/boards/{boardId}` quando só há
  `boardId` (deep-link consumido pela página do quadro, `009`, para abrir o cartão automaticamente
  se já suportar `?card=`; se não suportar, apenas navegar ao quadro, sem quebrar). Rótulos i18n
  (pt/en) mapeiam cada `type` do catálogo para uma frase legível, com fallback genérico para `type`
  desconhecido (mesmo princípio da `011`).

## Risks / Trade-offs

- [Gravação de notificação falhar e quebrar a mutação original] → `NotificationRecorder.record`
  nunca propaga exceção; erros são logados e a resposta da mutação segue normalmente — mesmo
  princípio de `ActivityRecorder` (`011`).
- [`comment.added` gerar volume alto em cartões com muitos assignees] → aceitável nesta change
  (escopo pequeno); throttling/agrupamento fica para uma change futura se necessário.
- [Socket de app-level duplicar conexão com o socket do `useBoardSocket` quando o usuário está
  dentro de um quadro] → aceito como trade-off simples: dois sockets simultâneos (um de app, um de
  quadro) por usuário conectado a uma página de quadro; ambos entram na sala `user:{userId}`, mas
  a UI só reage ao evento pelo socket de app (o `useBoardSocket` não assina `notification.created`
  nesta change) — sem duplicidade de notificação exibida.
- [`emitToUser` chamado para um `userId` sem nenhum socket conectado] → comportamento nativo do
  Socket.IO: emitir para uma sala vazia é uma operação sem efeito (sem erro); a notificação já foi
  persistida e aparece na próxima vez que o usuário abrir a aplicação e consultar `GET
  /notifications`.
- [Usuário tentar marcar como lida uma notificação de outro usuário] → `mark-notification-read`
  verifica `userId` da notificação contra o `requesterId` do token; não encontrado/não pertence →
  404 (nunca vaza a existência do recurso de outro usuário).
