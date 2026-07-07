## Context

O módulo `board` já tem os agregados `board`, `membership` (`010`), `activity`, `notification`
etc., cada um em `modules/board/src/<agregado>/{model,provider,usecase}`, exposto via
`@taskboard/board` e consumido pelo `apps/backend/src/modules/board/*` (repositórios Prisma
concretos + controllers). `MembershipRepository` (`findByBoardAndUser`, `create`, `delete`,
`listByBoardId`) e a porta `MemberDirectory` (`findByEmail`, `findById`) já existem
(`modules/board/src/membership/provider/`). O `RealtimeEmitter.emitToBoard` (`006`) e o evento
`member.added` (payload `{ boardId, user: { id, name, email }, role }`) já são usados pelo
`MembersController.add` (`010`, `apps/backend/src/modules/board/members.controller.ts`). O
schema Prisma do módulo vive em `apps/backend/prisma/models/board.model.prisma` (modular).

O front tem `/join` (`apps/frontend/src/app/(public)/join/page.tsx`) para registro/login, e
`AuthContext` (`apps/frontend/src/modules/auth/context/auth.context.tsx`) expõe `user`,
`status: 'loading'|'authenticated'|'unauthenticated'` e `login(token)`. O grupo de rotas
`(public)` já existe para páginas sem guard de autenticação.

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Permitir convidar por e-mail alguém **sem conta** via link/token, sem depender de provider de
  e-mail real.
- Prévia pública segura do convite (sem vazar dados sensíveis do quadro a quem não é membro).
- Aceite seguro: só o dono legítimo do e-mail convidado pode transformar o convite em
  `BoardMember`.
- Fluxo de front cobrindo logado e deslogado, preservando o token através do `/join`.
- Reaproveitar `member.added` (`006`/`010`) — nenhum evento novo de tempo real.

**Non-Goals:**
- Envio de e-mail transacional real — não há provider configurado; o convite é sempre um
  **link copiável** que o owner compartilha manualmente (WhatsApp, Slack, etc.).
- Expiração automática por cron/job agendado — fora de escopo; o campo de expiração não existe
  nesta change (o texto "expira em 7 dias" do mockup é apenas copy estático da tela, não uma
  regra de negócio implementada).
- Papéis além de `owner`/`member`; o convite sempre resulta em `role='member'`.
- Alterar os endpoints/casos de uso já existentes da `010` (`add-member`, `remove-member`,
  `list-members` continuam intactos).

## Decisions

- **Novo agregado `invitation`** em `modules/board/src/invitation/{model,provider,usecase}`,
  mesmo padrão dos demais agregados do módulo `board`:
  - `model/invitation.entity.ts`: `Invitation extends Entity<InvitationState>` com
    `{ id, boardId, email, token, role: 'member', status: 'pending'|'accepted'|'revoked',
    invitedById, createdAt }`; `validate()` com `RequiredRule`/`UuidRule`/`InRule` seguindo o
    padrão de `Membership`.
  - `provider/invitation.repository.ts` (porta): `findByToken(token)`,
    `findPendingByBoardAndEmail(boardId, email)`, `create(...)`, `markAccepted(id)`,
    `listPendingByBoardId(boardId)` (para o painel "Compartilhar" mostrar convites pendentes).
  - `usecase/create-invitation.usecase.ts`, `usecase/get-invitation-preview.usecase.ts`,
    `usecase/accept-invitation.usecase.ts` (e, opcionalmente,
    `usecase/revoke-invitation.usecase.ts`), reaproveitando `MembershipRepository` e
    `MemberDirectory` (`membership` da `010`) — o agregado `invitation` **depende** de
    `membership` dentro do mesmo módulo `board` (import interno permitido, ambos vivem em
    `@taskboard/board`).
- **Model Prisma novo** em `apps/backend/prisma/models/board.model.prisma` (mesmo arquivo, novo
  bloco `model Invitation`):
  ```prisma
  model Invitation {
    id           String   @id @default(uuid())
    boardId      String
    email        String
    token        String   @unique
    role         String   @default("member")
    status       String   @default("pending")
    invitedById  String
    createdAt    DateTime @default(now())

    board     Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
    invitedBy User  @relation(fields: [invitedById], references: [id], onDelete: Cascade)

    @@index([boardId, email])
    @@map("invitations")
  }
  ```
  Requer `npx prisma migrate dev --name add-invitation` (ou equivalente) dentro de
  `apps/backend`; adicionar a relação inversa `invitations Invitation[]` em `Board` e em `User`
  (`apps/backend/prisma/models/auth.model.prisma`) se o schema exigir (Prisma gera erro se a
  relação não tiver o lado inverso — resolver conforme o erro do `prisma generate`).
- **Token**: string aleatória opaca (`crypto.randomBytes(24).toString('base64url')` ou
  equivalente), gerada no caso de uso `create-invitation` (não no banco), armazenada em texto
  puro em `token` (não é segredo de longo prazo tipo senha — é um capability token de uso único
  por convite; se o repositório usa esse padrão em outro lugar, seguir o mesmo). Único por
  `@@unique` no schema; colisão é praticamente impossível com 24 bytes, mas se o `create` no
  banco falhar por unicidade, tratar como erro 500 (não é um cenário de negócio a testar).
- **`create-invitation` (`create-invitation.usecase.ts`)**: input
  `{ boardId, requesterId, email }`.
  1. Verifica `requesterId` é owner do quadro via `MembershipRepository.findByBoardAndUser`
     (mesma checagem de `AddMember`) → `DomainError('board.owner.required', 403)` caso não seja.
  2. Resolve `email` via `MemberDirectory.findByEmail`; **se o usuário já existir E já for
     `BoardMember` do quadro** → `DomainError('invitation.already.member', 409)` (não cria
     convite para quem já está dentro). Se o usuário existir mas ainda não for membro, o convite
     é criado normalmente (permite convidar por link mesmo quem já tem conta, unificando o fluxo
     do painel "Compartilhar" — ver decisão de integração com a `010` abaixo).
  3. Busca convite `pending` existente para `boardId`+`email`
     (`findPendingByBoardAndEmail`); se existir, **retorna o mesmo** (mesmo `token`) —
     idempotente, evita gerar links diferentes a cada clique em "convidar" repetido.
  4. Caso contrário, gera `token`, cria `Invitation` `pending`, `role='member'`, retorna.
- **Consulta pública (`get-invitation-preview.usecase.ts` + `GET /invitations/:token`,
  `@Public()`)**: busca por `token`; se não existir → `NotFoundError('invitation.not.found')`
  (404, resposta genérica, sem detalhar se é "token inválido" ou "expirado" — não há campo de
  expiração nesta change, então o único estado "morto" possível é `revoked` ou inexistente).
  Retorna **apenas** `{ boardName, invitedByName, email, status }` — busca `Board.name` via
  `BoardRepository.findById` e o nome do convidante via `MemberDirectory.findById(invitedById)`;
  **nunca** retorna `boardId`, lista de membros, ou qualquer dado do quadro além do nome (a
  página pública não é autenticada, então não pode vazar mais que isso).
- **Regra de segurança do aceite (`accept-invitation.usecase.ts`,
  `POST /invitations/:token/accept`, autenticado)**: input `{ token, currentUserId }`.
  1. Busca convite por `token`; não existir → `NotFoundError('invitation.not.found')` (404).
  2. `status !== 'pending'` → `DomainError('invitation.invalid.status', 409)` (já aceito ou
     revogado — não pode ser aceito de novo).
  3. **Decisão de segurança**: resolve `currentUserId` via `MemberDirectory.findById`; **exige
     que `user.email.toLowerCase() === invitation.email.toLowerCase()`** — caso contrário
     `DomainError('invitation.email.mismatch', 403)`. Motivo: o link do convite não carrega
     nenhum segredo além do `token` (é compartilhado por WhatsApp/Slack, potencialmente
     visível a terceiros); sem essa checagem, qualquer pessoa logada que obtivesse o link
     poderia entrar no quadro no lugar do convidado. Essa regra é exatamente o que o mockup
     comunica com "Entrando como `ana.costa@empresa.com` · Trocar de conta" — o convite é
     amarrado a um e-mail específico, e o front deve deixar isso explícito antes do clique.
  4. Se o usuário já for `BoardMember` do quadro (ex.: aceitou por engano duas vezes, ou já
     tinha sido adicionado via `add-member` da `010`) → **idempotente**, não duplica
     `BoardMember`, apenas marca o convite `accepted` e retorna sucesso (não é erro de negócio,
     evita 409 confuso numa página de "boas-vindas").
  5. Caso contrário, cria `BoardMember role='member'` via `MembershipRepository.create`, marca
     `Invitation.status = 'accepted'`.
  6. O controller emite `member.added` (mesmo payload da `010`) **somente se** um `BoardMember`
     novo foi de fato criado no passo 5 (não reemitir se já era membro).
- **Integração com a `010` (decisão explícita)**: a `010` mantém `add-member`/`POST
  /boards/:boardId/members` como está (adição direta e imediata para quem já tem conta,
  continua útil para fluxos futuros/automação). O painel "Compartilhar" passa a oferecer, ao
  digitar um e-mail, o fluxo de **convite por link** desta change como caminho principal
  (`POST /boards/:boardId/invitations`) — sempre cria/retorna um convite com `token`, existindo
  ou não conta para aquele e-mail — porque o mockup e o pedido do produto focam no link
  copiável como a experiência de convite. O endpoint direto da `010` **não é removido nem
  chamado automaticamente por esta change**; ele continua disponível caso algum outro fluxo
  queira adicionar sem convite.
- **Endpoints** (`invitations.controller.ts`, skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller)):
  - `POST /boards/:boardId/invitations` `{ email }` (autenticado) → `create-invitation`;
    resposta `{ id, email, token, status, link }` (o `link` é montado no controller a partir de
    uma env `FRONTEND_URL` + `/convite/:token`, documentar em `.env.example` se ainda não
    existir).
  - `GET /invitations/:token` (`@Public()`, sem JWT) → `get-invitation-preview`.
  - `POST /invitations/:token/accept` (autenticado) → `accept-invitation`; emite `member.added`
    condicionalmente (ver acima).
  - Opcional: `GET /boards/:boardId/invitations` (lista convites pendentes, só owner) e
    `DELETE /boards/:boardId/invitations/:id` (revoga, só owner) — reaproveitam a mesma
    checagem de `board.owner.required` de `AddMember`; incluídas como tasks separadas e
    marcáveis como concluídas apenas se o tempo do escopo permitir (não bloqueiam o fluxo
    principal de aceite).
- **Frontend — página pública `/convite/[token]`**
  (`apps/frontend/src/app/(public)/convite/[token]/page.tsx`, skill
  [frontend-next-config](../../../.claude/skills/frontend-next-config)): no mount, `GET
  /invitations/:token` (sem token de auth); renderiza a prévia (`boardName`, `invitedByName`,
  `email`) reproduzindo o layout do mockup (`mockups/Aceitar Convite.dc.html`: card com
  gradiente, avatares, "X convidou você", botão "Entrar no quadro"). Usa `useAuth()` para saber
  `status`:
  - `status === 'authenticated'`: botão "Entrar no quadro" chama
    `POST /invitations/:token/accept` e, em sucesso, `router.push('/boards/:boardId')` (o
    `boardId` vem da resposta do accept, já que a prévia pública não o expõe).
  - `status === 'unauthenticated'`: botão leva para `/join?convite=:token` (preserva o `token`
    via query string); se o e-mail do convite for conhecido, pré-preencher o campo e-mail do
    formulário de registro/login em `/join` como conveniência (não obrigatório).
  - Erro `invitation.email.mismatch` no accept (usuário logado com e-mail diferente): mensagem
    explícita + link "Trocar de conta" (logout) — mesmo texto do mockup.
- **Frontend — `/join?convite=:token`**: após `login`/registro concluído com sucesso, se a
  query string tiver `convite`, chamar `POST /invitations/:token/accept` automaticamente e
  então navegar para o quadro; se o accept falhar por `invitation.email.mismatch` (a pessoa
  criou/logou com um e-mail diferente do convidado), mostrar o erro e manter na página de
  boas-vindas em vez de redirecionar silenciosamente.
- **Painel "Compartilhar" (`010`)**: o formulário de convite passa a chamar `POST
  /boards/:boardId/invitations`; em sucesso, mostra o `link` retornado num campo copiável
  (`navigator.clipboard.writeText`) com estado "convite pendente" (usa
  `listPendingByBoardId`/endpoint opcional de listagem, se implementado, para exibir os
  convites pendentes existentes ao reabrir o painel).
- **i18n**: chaves de erro pt/en — `invitation.not.found`, `invitation.already.member`,
  `invitation.email.mismatch`, `invitation.invalid.status`, mais as de validação
  (`createInvitation.*`, `acceptInvitation.*`) seguindo o padrão de `addMember.*` da `010`.

## Risks / Trade-offs

- [Link de convite compartilhado indevidamente] → Mitigado pela checagem de e-mail no aceite
  (`invitation.email.mismatch`); quem obtém o link não consegue entrar no quadro sem logar com o
  e-mail exato convidado. Trade-off aceito: quem convida errado (digitou o e-mail errado) só
  descobre no momento do aceite, não há verificação prévia de "e-mail existe/está correto".
- [Convite sem expiração] → Non-goal explícito nesta change; se necessário no futuro, adicionar
  campo `expiresAt` + checagem em `accept-invitation`/`get-invitation-preview` numa change
  posterior, sem quebrar o schema atual (campo novo, nullable).
- [Duplicidade de convite ao clicar "convidar" várias vezes para o mesmo e-mail] → Resolvido pela
  idempotência de `create-invitation` (reusa o `pending` existente em vez de criar outro).
- [Aceite de convite por quem já é membro] → Tratado como idempotente (não erro), evitando UX
  ruim numa página pensada para ser o primeiro contato do convidado com o produto.
