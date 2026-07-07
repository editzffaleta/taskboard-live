> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/notificacoes/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · `openspec/changes/024-notificacoes/mockups/`
> · e, **somente se o `design.md` citar nominalmente**: arquivos de código listados,
> `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O TaskBoard Live já mutação o quadro em tempo real (`006`) e registra uma trilha de auditoria
por quadro (`activity`, `011`), mas essa trilha só é visível para quem está com o quadro aberto.
Um usuário que é adicionado a um quadro, atribuído a um cartão, ou mencionado por um comentário em
um cartão sob sua responsabilidade não fica sabendo disso a menos que abra o quadro certo na hora
certa. Esta mudança introduz **notificações por usuário**: um agregado `notification` que
persiste, entrega ao vivo (via um canal Socket.IO por usuário, não por quadro) e disponibiliza uma
central de notificações no frontend (sino na topbar + lista), cobrindo os eventos já existentes de
adicionar membro (`010`), atribuir cartão e comentar (`017`).

## What Changes

- Criar o agregado `notification` dentro do módulo de negócio `board` já existente (mesmo
  critério da `011`/`activity`: reusa o `BoardModule` e o `RealtimeEmitter` sem workspace novo).
- Implementar a entidade `Notification` (`id`, `userId`, `type`, `data` JSON, `readAt` nullable,
  `createdAt`).
- Estender a porta `RealtimeEmitter` (`006`) com `emitToUser(userId, event, payload)`, além do
  `emitToBoard` já existente.
- Estender o `BoardGateway` (`006`) para, no handshake já autenticado, também entrar o socket na
  sala `user:{userId}` (além das salas `board:{id}` entradas via `board:join`).
- Implementar o provider `NotificationRecorder` (espelhando `ActivityRecorder` da `011`):
  `record(userId, type, data)` persiste a `Notification` via repositório Prisma e emite
  `notification.created` via `RealtimeEmitter.emitToUser(userId, 'notification.created', payload)`.
  Erro na gravação é logado e nunca propagado — a notificação é auxiliar, nunca crítica ao fluxo
  principal.
- Caso de uso `list-notifications` (paginado, mais recente primeiro, restrito ao próprio usuário),
  `count-unread-notifications`, `mark-notification-read` e `mark-all-notifications-read`.
- Sincronizar o model `Notification` no Prisma (migration), com FK `userId` → `User`.
- Expor endpoints autenticados: `GET /notifications` (paginado), `GET /notifications/unread-count`,
  `PATCH /notifications/:id/read`, `POST /notifications/read-all` — todos restritos ao próprio
  usuário autenticado (sem conceito de membership aqui: notificação não pertence a um quadro).
- **Ajuste pontual nos controllers já existentes das changes `010` e `017`** (mesmo padrão da
  `011`): logo após a mutação ter sucesso (mesmo ponto onde já chamam
  `RealtimeEmitter.emitToBoard`), os controllers `members.controller.ts` (`010`),
  `card-assignee.controller.ts` e `comment.controller.ts` (`017`) passam a chamar também
  `NotificationRecorder.record(userId, type, data)` para os gatilhos listados no `design.md`. Esta
  change **não** reescreve esses controllers — apenas documenta o gancho a ser adicionado neles.
- Frontend: sino de notificações na topbar (`AdminShell`) com badge de não lidas, dropdown/central
  listando notificações (ícone/texto por `type`, tempo relativo, lida/não lida), clique navega ao
  recurso (quadro ou cartão via deep-link `?card=`), marcar como lida individualmente e marcar
  todas. Entrega ao vivo via um provider global de notificações (`notification.context.tsx`) que
  conecta um socket de nível de app (independente do `useBoardSocket`, que só existe dentro da
  página de um quadro) e assina `notification.created`.
- Mapear no i18n (pt/en) os rótulos de cada `type` de notificação e os erros dos endpoints.

## Capabilities

### New Capabilities
- `notificacoes`: agregado `notification` do módulo `board` do TaskBoard Live — registro
  persistente de eventos relevantes por usuário (membro adicionado a um quadro, atribuição de
  cartão, novo comentário em cartão sob responsabilidade do usuário), canal de entrega em tempo
  real por usuário (`user:{userId}` via `RealtimeEmitter.emitToUser`), consulta paginada e
  contagem de não lidas restritas ao próprio usuário, marcação de lida/todas lidas, e central de
  notificações no frontend (sino + dropdown na topbar).

### Modified Capabilities
<!-- Nenhuma: os controllers de members (010), card-assignee e comment (017) recebem apenas uma
chamada adicional a `NotificationRecorder.record`, sem alterar seu comportamento funcional
existente. A porta `RealtimeEmitter` (006) ganha um novo método (`emitToUser`), sem alterar a
assinatura de `emitToBoard` já em uso. -->

## Impact

- **Backend**: novo agregado `notification` dentro do módulo `board` (entidade `Notification`,
  provider `NotificationRecorder`, casos de uso `list-notifications`,
  `count-unread-notifications`, `mark-notification-read`, `mark-all-notifications-read`, com
  testes unitários usando fakes), repositório Prisma em `apps/backend/src/modules/board`,
  `notification.controller.ts` expondo os quatro endpoints, model `Notification` no Prisma +
  migration com FK `userId`. Extensão da porta `RealtimeEmitter` (`006`) com `emitToUser` e do
  `BoardGateway` (`006`) para entrar cada socket autenticado na sala `user:{userId}` no handshake.
  Ajuste pontual (chamada a `NotificationRecorder.record`) em `members.controller.ts` (`010`),
  `card-assignee.controller.ts` e `comment.controller.ts` (`017`).
- **Frontend**: sino de notificações na topbar (`AdminShell`, montado a partir do
  `PrivateGroupLayout`), provider global de notificações (contexto + socket de nível de app),
  central/dropdown com paginação, marcação de lida/todas, deep-link ao recurso, labels i18n.
- **Contratos**: `emitToBoard` (`006`) permanece inalterado; `emitToUser` é um método novo na
  mesma porta. `ActivityRecorder`/`activity` (`011`) não são tocados — `NotificationRecorder` é um
  agregado irmão, não uma extensão de `activity`.
- **Fora de escopo**: e-mail real, notificações de prazo/vencimento por job/cron, push
  notification nativo (browser/mobile), preferências de usuário sobre quais tipos notificar,
  menções explícitas (`@usuário`) em comentários (mockup mostra o conceito, mas o gatilho real
  desta change é "assignees do cartão, exceto o comentarista" — ver regra no `design.md`).
- **Dependências**: `006` (`RealtimeEmitter`/`BoardGateway`), `010` (membros), `017` (assignees de
  cartão e comentários), `004` (auth/JWT, para o próprio usuário autenticado).
- **Habilita**: central de notificações do usuário, base para futuras extensões (menções, prazos)
  sem redesenhar o transporte.
