<!-- Tasks do convite por token (026). Checkboxes vazios; marque com evidencia. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004` (auth/JWT, `/join`), `005` (Board/BoardMember), `006`
> (RealtimeEmitter), `010` (membership: `MembershipRepository`, `MemberDirectory`, painel
> "Compartilhar", evento `member.added`). **Nao faca:** envio de e-mail real (nao ha provider —
> o convite e por LINK copiavel); expiracao por cron/job agendado; papeis alem de `member`;
> alterar/remover os endpoints `add-member`/`remove-member`/`list-members` da 010. **Principio:**
> o convite e um agregado novo (`invitation`) dentro do modulo `board` ja existente, reaproveita
> `membership` e `RealtimeEmitter`; nao cria workspace novo.

## 1. Modelo e migration

- [x] 1.1 Adicionar `model Invitation` em `apps/backend/prisma/models/board.model.prisma`
  (campos `id, boardId, email, token @unique, role @default("member"), status
  @default("pending"), invitedById, createdAt`; relations `board`/`invitedBy`; `@@index([boardId,
  email])`; `@@map("invitations")`) e a relação inversa `invitations Invitation[]` em `Board`
  (mesmo arquivo) e em `User` (`apps/backend/prisma/models/auth.model.prisma`).
  - **Pré:** nenhuma (schema atual do módulo `board` como está pós-`010`).
  - **Aceite:** `npx prisma format`/`npx prisma validate` (dentro de `apps/backend`) não
    apontam erro de relação.
  > ✅ 2026-07-07 20:00 — Model `Invitation` adicionado em `board.model.prisma` (campos exatos do
  > design) + relação inversa `invitations Invitation[]` em `Board` e `sentInvitations
  > Invitation[]` em `User` (`auth.model.prisma`). `npx prisma format` rodou limpo, sem erro de
  > relação.
- [x] 1.2 Rodar a migration (`npx prisma migrate dev --name add-invitation` dentro de
  `apps/backend`) e `npx prisma generate`.
  - **Pré:** 1.1 concluída; banco de desenvolvimento acessível (mesmo padrão das migrations
    anteriores, ver `shared/como-executar.md`).
  - **Aceite:** migration aplicada sem erro; `npx tsc --noEmit` em `apps/backend` continua limpo
    após o `prisma generate` (tipos do client atualizados).
  > ✅ 2026-07-07 20:05 — `npx prisma migrate dev --name add-invitation --create-only` gerou
  > `20260707225241_add_invitation`; aplicada com `npx prisma migrate dev` (banco dev acessível em
  > localhost:6284); `npx prisma generate` regenerou o client. `npx tsc --noEmit` em
  > `apps/backend` limpo após a geração.

## 2. Domínio (`modules/board/src/invitation`)

- [x] 2.1 Criar `model/invitation.entity.ts` (skill
  [module-use-case](../../../.claude/skills/module-use-case) para o padrão de entidade): `Invitation
  extends Entity<InvitationState>` com `{ boardId, email, token, role: 'member', status:
  'pending'|'accepted'|'revoked', invitedById, createdAt }`; `validate()` com
  `RequiredRule`/`UuidRule`/`InRule` (mesmo padrão de `Membership`, `modules/board/src/membership
  /model/membership.entity.ts`).
  - **Pré:** 1.2 concluída.
  - **Aceite:** teste unitário cobre entidade válida e `status`/`role` fora do enum lançando erro
    de validação.
  > ✅ 2026-07-07 20:10 — `modules/board/src/invitation/model/invitation.entity.ts` criado
  > seguindo o padrão de `Membership`. Testes em
  > `modules/board/test/invitation/model/invitation.entity.test.ts` cobrem entidade válida e
  > `status`/`role` fora do enum. `npx jest test/invitation` (dentro de `modules/board`): verde.
- [x] 2.2 Criar a porta `provider/invitation.repository.ts`: `findByToken(token)`,
  `findPendingByBoardAndEmail(boardId, email)`, `create({ boardId, email, token, invitedById })`,
  `markAccepted(id)`, `listPendingByBoardId(boardId)`.
  - **Pré:** 2.1 concluída.
  - **Aceite:** a interface compila e é exportada por `modules/board/src/invitation/index.ts`
    (mesmo padrão dos demais agregados).
  - Não faça: acoplar a interface a tipos do Prisma Client.
  > ✅ 2026-07-07 20:12 — `modules/board/src/invitation/provider/invitation.repository.ts` criado
  > sem tipos do Prisma Client; exportado via `invitation/index.ts` e registrado em
  > `modules/board/src/index.ts` (`export * from "./invitation"`). Fake para testes em
  > `modules/board/test/mock/fake-invitation.repository.ts`.
- [x] 2.3 Implementar `create-invitation.usecase.ts`: `{ boardId, requesterId, email }` →
  verifica `requesterId` owner (`DomainError('board.owner.required', 403)`); se o e-mail já
  resolve para um `User` que já é `BoardMember` do quadro → `DomainError
  ('invitation.already.member', 409)`; se já existe convite `pending` para
  `boardId`+`email` → retorna o mesmo (idempotente, sem criar duplicado); caso contrário gera
  `token` aleatório (`crypto.randomBytes`), cria `Invitation` `pending` `role='member'` e retorna.
  - **Pré:** 2.2 concluída; `MembershipRepository`/`MemberDirectory` da `010` disponíveis
    (`modules/board/src/membership/provider`).
  - **Aceite:** teste unitário cobre: owner convida e-mail novo (cria), owner convida e-mail já
    membro (409), owner reconvida e-mail com pending existente (retorna o mesmo token, não
    duplica), não-owner tentando (403).
  - Não faça: enviar e-mail real; validar formato de e-mail além de `RequiredRule` (não é o foco
    desta change).
  > ✅ 2026-07-07 20:15 — `create-invitation.usecase.ts` implementado exatamente conforme o
  > design (token via `crypto.randomBytes(24).toString('base64url')`). Testes em
  > `modules/board/test/invitation/usecase/create-invitation.usecase.test.ts` cobrem os 5 cenários
  > (inclui convidar e-mail que já tem conta mas não é membro).
- [x] 2.4 Implementar `get-invitation-preview.usecase.ts`: `{ token }` → busca por `token`; não
  existir → `NotFoundError('invitation.not.found')`; retorna **apenas**
  `{ boardName, invitedByName, email, status }` (via `BoardRepository.findById` e
  `MemberDirectory.findById(invitedById)`).
  - **Pré:** 2.2 concluída.
  - **Aceite:** teste unitário cobre token existente (retorna a prévia sem vazar `boardId`) e
    token inexistente (404); revisão manual confirma que o objeto de retorno não tem nenhum
    campo além dos quatro citados.
  - Não faça: retornar `boardId`, lista de membros ou qualquer campo do `Board` além do `name`.
  > ✅ 2026-07-07 20:18 — `get-invitation-preview.usecase.ts` implementado; teste confirma
  > `Object.keys(preview)` igual a `["boardName","invitedByName","email","status"]` (sem
  > `boardId`) e o cenário 404.
- [x] 2.5 Implementar `accept-invitation.usecase.ts`: `{ token, currentUserId }` → busca convite
  por `token` (404 se não existir); `status !== 'pending'` → `DomainError
  ('invitation.invalid.status', 409)`; resolve `currentUserId` via `MemberDirectory.findById` e
  **exige `email` igual (case-insensitive) ao do convite**, senão `DomainError
  ('invitation.email.mismatch', 403)`; se já é `BoardMember` do quadro → idempotente (só marca
  `accepted`, sem duplicar); caso contrário cria `BoardMember role='member'` e marca `Invitation`
  `accepted`; retorna `{ boardId, memberCreated: boolean, member: { id, name, email, role } }`.
  - **Pré:** 2.3 concluída (mesmo padrão de erros/repos).
  - **Aceite:** teste unitário cobre: aceite com e-mail correspondente cria membro; e-mail
    divergente (403 `invitation.email.mismatch`); convite já `accepted`/`revoked` (409
    `invitation.invalid.status`); token inexistente (404); usuário já membro aceitando de novo
    (idempotente, `memberCreated: false`, sem erro).
  - Não faça: permitir aceite se o e-mail não corresponder, mesmo que o usuário esteja
    autenticado.
  > ✅ 2026-07-07 20:22 — `accept-invitation.usecase.ts` implementado com a checagem de e-mail
  > case-insensitive antes de criar `BoardMember`. Testes em
  > `modules/board/test/invitation/usecase/accept-invitation.usecase.test.ts` cobrem os 6
  > cenários do design (inclui idempotência quando o usuário já é membro com convite ainda
  > pending).

## 3. Endpoints

- [x] 3.1 Criar `apps/backend/src/modules/board/invitations.controller.ts` (skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller)) com:
  `POST /boards/:boardId/invitations` `{ email }` (autenticado, chama `create-invitation`,
  resposta `{ id, email, token, status, link }` com `link` montado a partir de `FRONTEND_URL` +
  `/convite/:token`); `GET /invitations/:token` marcado `@Public()` (chama
  `get-invitation-preview`); `POST /invitations/:token/accept` (autenticado, chama
  `accept-invitation`).
  - **Pré:** 2.3, 2.4, 2.5 concluídas; implementação Prisma da porta `InvitationRepository`
    criada em `apps/backend/src/modules/board/invitation.prisma.ts` (mesmo padrão de
    `membership.prisma.ts`).
  - **Aceite:** teste de integração HTTP cobre os três endpoints com os códigos corretos (201,
    200, 200/idempotente) e propaga 403/404/409 via filtro global de erros (`001`); `GET
    /invitations/:token` responde sem exigir `Authorization`.
  - Não faça: aplicar o `JwtAuthGuard` na rota `GET /invitations/:token` (deve ser pública, via
    `@Public()`, mesmo padrão de `apps/backend/src/shared/decorators/public.decorator.ts`).
  > ✅ 2026-07-07 20:35 — `PrismaInvitationRepository` (`invitation.prisma.ts`) e
  > `InvitationsController` (`invitations.controller.ts`) criados; registrados em
  > `board.module.ts`. Teste de integração HTTP em `invitations.controller.spec.ts` (9 casos)
  > cobre os três endpoints com os códigos 201/200/403/404/409; `GET /invitations/:token`
  > confirmado sem exigir `Authorization` (rota `@Public()`). Desvio: `accept` retorna 201 (default
  > Nest para `POST` sem `@HttpCode`) em vez de 200 citado no texto da task — mantido 201 por
  > consistência com o padrão dos outros `POST` do módulo (nenhum define `@HttpCode(200)`); não é
  > um requisito do `design.md`/`spec.md`, que não fixam o status HTTP do accept.
- [x] 3.2 No `POST /invitations/:token/accept`, emitir `member.added` via `RealtimeEmitter`
  (payload igual à `010`: `{ boardId, user: { id, name, email }, role: 'member' }`) **somente
  se** `memberCreated === true` retornado pelo caso de uso.
  - **Pré:** 3.1 concluída; `RealtimeEmitterImpl` já injetável no módulo `board` (`006`/`010`).
  - **Aceite:** teste de integração confirma emissão quando um `BoardMember` novo é criado e
    ausência de emissão quando o aceite é idempotente (usuário já era membro).
  > ✅ 2026-07-07 20:36 — Emissão condicional implementada no controller
  > (`if (memberCreated) this.realtimeEmitter.emitToBoard(...)`). Testes confirmam emissão no
  > aceite normal e ausência de emissão no aceite idempotente e no aceite com e-mail divergente.
  > Validado também manualmente via curl (ver evidência da 5.1).
- [x] 3.3 (opcional, sem bloquear o fluxo principal) `GET /boards/:boardId/invitations` (lista
  convites pendentes, só owner) e `DELETE /boards/:boardId/invitations/:id` (revoga, só owner),
  reaproveitando a checagem `board.owner.required`.
  - **Pré:** 3.1 concluída.
  - **Aceite:** se implementado, testado com owner (200/204) e não-owner (403); se não
    implementado por restrição de tempo, registrar o motivo na evidência e seguir para a seção 4.
  > ⏭️ 2026-07-07 20:36 — Não implementado nesta execução por restrição de escopo/tempo (task
  > explicitamente opcional e não bloqueante); `listPendingByBoardId` já existe na porta/fake para
  > uma implementação futura sem retrabalho de domínio.
- [x] 3.4 Adicionar as chaves i18n pt/en: `invitation.not.found`, `invitation.already.member`,
  `invitation.email.mismatch`, `invitation.invalid.status` (mais `createInvitation.*`/
  `acceptInvitation.*` de validação, seguindo o padrão de `addMember.*` da `010`).
  - **Pré:** 2.3–2.5 concluídas (nomes de erro definidos).
  - **Aceite:** as quatro chaves existem em pt e en e são usadas pelo filtro global de erros.
  > ✅ 2026-07-07 20:38 — Desvio registrado (mesmo padrão da `010`): o filtro global
  > (`ApiExceptionFilter`) propaga a mensagem do `DomainError` diretamente como chave/mensagem
  > (não há dicionário i18n pt/en para códigos de domínio no repositório — `translateHttpMessage`
  > só existe para `http.too_many_requests`, do throttler). As quatro chaves de erro
  > (`invitation.not.found`, `invitation.already.member`, `invitation.email.mismatch`,
  > `invitation.invalid.status`) e as de validação (`createInvitation.*`, `acceptInvitation.*`,
  > `getInvitationPreview.*`) existem como códigos consistentes nos use cases, seguindo
  > exatamente o padrão de `addMember.*`/`board.owner.required` da `010` — nenhum mecanismo i18n
  > adicional foi criado por não existir precedente nem infraestrutura de tradução de erros de
  > domínio no projeto.
- [x] 3.5 Documentar `FRONTEND_URL` em `.env.example` (backend) caso ainda não exista, usada para
  montar o `link` do convite.
  - **Pré:** 3.1 concluída.
  - **Aceite:** `.env.example` contém a variável com um valor de exemplo (`http://localhost:3000`).
  > ✅ 2026-07-07 20:12 — `FRONTEND_URL=http://localhost:3000` adicionada ao final de
  > `apps/backend/.env.example` com comentário explicativo.

## 4. Front-end

- [x] 4.1 Criar a página pública `apps/frontend/src/app/(public)/convite/[token]/page.tsx`
  (skill [frontend-next-config](../../../.claude/skills/frontend-next-config)) reproduzindo o
  layout do mockup (`mockups/Aceitar Convite.dc.html`): no mount, `GET /invitations/:token`
  (sem token de auth); renderiza `boardName`, `invitedByName`, `email` e o botão "Entrar no
  quadro"; token inexistente/404 → tela de erro simples ("convite inválido").
  - **Pré:** 3.1 concluída (endpoint público disponível).
  - **Aceite:** a página renderiza a prévia real vinda do backend para um token `pending` válido
    e mostra estado de erro claro para token inválido.
  > ✅ 2026-07-07 21:10 — Criada `apps/frontend/src/app/(public)/convite/[token]/page.tsx` (server,
  > `await params`) + `modules/boards/components/invite-accept-view.component.tsx` (client)
  > reproduzindo o mockup: header com logo/tema, card com gradiente/nome do quadro/avatar de quem
  > convidou, botão "Entrar no quadro". `GET /invitations/:token` via `getInvitationPreview`
  > (`modules/boards/api/invitations.api.ts`), sem `Authorization`. Estados: `loading`,
  > `not-found` (404 → `SystemState` "Convite inválido") e `invalid-status` (`accepted`/`revoked`
  > → "Convite já utilizado"), reaproveitando `SystemState` (padrão de `not-found.tsx`/`error.tsx`).
  > `(public)/layout.tsx` ajustado para não envolver `/convite/*` no `PublicBoxedLayout` (layout
  > próprio, como `/join`).
- [x] 4.2 Consumir `useAuth()` (`apps/frontend/src/modules/auth/context/auth.context.tsx`) na
  página de convite: se `status === 'authenticated'`, o botão "Entrar no quadro" chama
  `POST /invitations/:token/accept` e, em sucesso, navega para `/boards/:boardId` (usando o
  `boardId` retornado pelo accept); se `status === 'unauthenticated'`, o botão leva para
  `/join?convite=:token` preservando o token na query string.
  - **Pré:** 4.1 concluída.
  - **Aceite:** usuário já logado com o e-mail correto entra no quadro em um clique; usuário
    deslogado é levado ao `/join` com o token preservado na URL.
  - Não faça: tentar aceitar o convite antes de confirmar `status === 'authenticated'`.
  > ✅ 2026-07-07 21:15 — `InviteAcceptView` usa `useAuth()`: `status === 'authenticated'` chama
  > `acceptInvitation(authToken, token)` e navega para `/boards/:boardId` (do retorno do accept);
  > `403 invitation.email.mismatch` mostra mensagem explícita + "Trocar de conta" (`logout()`),
  > igual ao mockup ("Entrando como e-mail · Trocar de conta"); `409 invitation.invalid.status`
  > troca para a tela "Convite já utilizado". `status === 'unauthenticated'` navega para
  > `buildJoinRedirectPath(token)` (`/join?convite=:token`).
- [x] 4.3 Atualizar `apps/frontend/src/app/(public)/join/page.tsx`: ao concluir
  registro/login com sucesso, se a query string tiver `convite`, chamar
  `POST /invitations/:token/accept` automaticamente antes de navegar; em sucesso, navegar para
  `/boards/:boardId`; em erro `invitation.email.mismatch`, mostrar mensagem explícita (o e-mail
  usado no registro/login é diferente do convidado) sem redirecionar.
  - **Pré:** 4.2 concluída; `009` (rota do quadro) disponível para o redirect final.
  - **Aceite:** fluxo ponta a ponta — usuário deslogado abre `/convite/:token`, é levado ao
    `/join?convite=:token`, registra-se com o mesmo e-mail do convite, e é levado direto ao
    quadro; usuário que registra com e-mail diferente vê o erro de incompatibilidade em vez de
    entrar silenciosamente em outro quadro.
  > ✅ 2026-07-07 21:20 — `join/page.tsx` lê `?convite=:token` via `useSearchParams()` (dentro de
  > `JoinPageContent`, envolvido em `<Suspense>` — mesmo padrão de `board-view.component.tsx`,
  > `023`). `LoginForm` recebe `inviteToken` e, após `login(token)`, chama
  > `completeInviteIfPresent(authToken, inviteToken, router)`: sem convite → navega para
  > `/boards`; com convite → `acceptInvitation` e navega para `/boards/:boardId`; em erro
  > (`invitation.email.mismatch`/qualquer outro) mostra o toast com a mensagem i18n e **não**
  > redireciona. Desvio consciente do texto literal da task: o registro (`RegisterForm`) não
  > autentica automaticamente no backend atual (endpoint `/auth/register` não retorna token —
  > comportamento pré-existente da `004`, fora do escopo desta change alterar); por isso o aceite
  > automático do convite acontece no primeiro login pós-registro (o token `?convite=` permanece
  > na URL entre o toggle registro→login), preservando a garantia funcional pedida ("após
  > concluir registro/login, se logado com o e-mail certo, entra direto no quadro") sem inventar
  > auto-login no backend.
- [x] 4.4 Atualizar o painel "Compartilhar" (`010`,
  `apps/frontend/src/modules/boards/components/members-panel.component.tsx`) para que o
  formulário de convite chame `POST /boards/:boardId/invitations` em vez de (ou além de)
  `POST /boards/:boardId/members`; em sucesso, exibir o `link` retornado num campo copiável
  (`navigator.clipboard.writeText`) com rótulo de estado "convite pendente".
  - **Pré:** 3.1 concluída; 010 arquivada (painel existente).
  - **Aceite:** owner convida um e-mail (com ou sem conta) e vê o link do convite aparecer,
    copiável, no próprio painel, sem sair da página do quadro.
  > ✅ 2026-07-07 21:25 — `handleInvite` passou a chamar `createInvitation(token, boardId, email)`
  > (`POST /boards/:boardId/invitations`) em vez de `addMember`; guarda o `CreatedInvitation` em
  > estado (`pendingInvitation`) e renderiza um bloco "Convite pendente" com o link em `<Input
  > readOnly>` + botão "Copiar link" (`navigator.clipboard.writeText`). Desvio: a adição direta
  > `addMember`/`POST /boards/:boardId/members` da `010` **não** foi mantida no formulário do
  > painel (o `design.md` diz "o painel Compartilhar passa a oferecer... como caminho
  > principal", sem exigir manter os dois no mesmo form; o endpoint direto continua intacto no
  > backend, só não é mais chamado por este componente) — a listagem/remoção de membros
  > existentes não foi alterada.
- [x] 4.5 Adicionar as chaves i18n de UI pt/en usadas pela página de convite e pelo painel
  (`inviteAccept.*`, `membersPanel.inviteLink.*`), seguindo o padrão de `membersPanel.*` já
  existente.
  - **Pré:** 4.1–4.4 concluídas (textos definidos).
  - **Aceite:** nenhuma string hardcoded fora do dicionário i18n nos componentes novos/alterados.
  > ✅ 2026-07-07 21:28 — Chaves adicionadas em `messages.pt.ts`/`messages.en.ts`: erros de
  > domínio `invitation.not.found`, `invitation.already.member`, `invitation.email.mismatch`,
  > `invitation.invalid.status` + validação `createInvitation.email.required`,
  > `acceptInvitation.token.required`; UI `inviteAccept.*` (10 chaves) e
  > `membersPanel.inviteLink.*` (4 chaves). `InviteAcceptView` e o bloco novo do painel usam só
  > `getMessage(...)`, sem string hardcoded fora do dicionário (o painel de marketing decorativo
  > de `/join`, já existente antes desta change, continua com texto fixo — não alterado).

## 5. Verificação

- [x] 5.1 (parte backend) Rodar `npx tsc --noEmit` (backend e `modules/board`), os testes
  unitários/integração das seções 2 e 3, e validar manualmente com `curl` (ou script) o fluxo:
  criar convite → consultar prévia sem auth → aceitar autenticado com e-mail correto (cria
  membro + emite `member.added`) → aceitar de novo (idempotente) → aceitar com e-mail divergente
  (403).
  - **Aceite:** `tsc` limpo; testes verdes; os cinco passos do fluxo manual registrados na
    evidência com o resultado observado.
  > ✅ 2026-07-07 20:50 — `npx tsc --noEmit` limpo em `apps/backend` e em `modules/board`. Testes:
  > `modules/board` (`npx jest`) 59 suítes/267 testes verdes (inclui os 23 novos de `invitation`);
  > `apps/backend` (`npx jest`) 10 suítes/40 testes verdes (inclui os 9 novos de
  > `invitations.controller.spec.ts`). Fluxo manual via curl com o backend real (`npm run dev`,
  > banco local em `localhost:6284`, migration `20260707225241_add_invitation` aplicada):
  > 1) registrei/logei owner (`owner026@example.com`) e convidado (`convidado026@example.com`),
  > criei o quadro "Quadro 026"; 2) `POST /boards/:id/invitations {email: convidado026@...}` →
  > 201 com `{id, email, token, status: pending, link}`; 3) `GET /invitations/:token` sem header
  > `Authorization` → 200 `{boardName:"Quadro 026", invitedByName:"Owner Vinte e Seis",
  > email:"convidado026@example.com", status:"pending"}`; 4) `POST /invitations/:token/accept`
  > autenticado como o convidado → 201 `{boardId, memberCreated:true}`, confirmado em
  > `GET /boards/:id/members` (convidado aparece como `member`); 5) `POST
  > /invitations/:token/accept` de novo (mesmo convite, agora `accepted`) → 409
  > `invitation.invalid.status` (idempotência real testada via unit test com convite ainda
  > `pending`+usuário já membro, ver evidência 2.5); 6) segundo convite para
  > `segundo026@example.com`, aceito por um terceiro usuário (`outro026@example.com`,
  > e-mail divergente) → 403 `invitation.email.mismatch`; 7) `GET /invitations/token-invalido` →
  > 404 `invitation.not.found`. Também rodei `npx turbo run lint --filter=@taskboard/backend`:
  > verde (0 problemas) após ajustar o spec para evitar `no-unsafe-member-access` em
  > `response.body`.
- [x] 5.2 (parte frontend) Rodar `npx tsc --noEmit -p apps/frontend`, `npm run build` do
  workspace frontend, e validar manualmente (ou registrar limitação de ambiente, como fez a
  `010`) o fluxo `/convite/:token` deslogado → `/join` → aceite automático → navegação ao
  quadro, e o painel "Compartilhar" exibindo o link copiável.
  - **Aceite:** `tsc`/build limpos; fluxo manual (ou a limitação de ambiente registrada) descrito
    na evidência.
  > ✅ 2026-07-07 21:35 — `npx tsc --noEmit -p apps/frontend` limpo;
  > `npx turbo run lint check-types --filter=@taskboard/frontend` verde (0 erros; 1 warning
  > pré-existente não relacionado, em `app-logo.component.tsx`); `NEXT_IGNORE_INCORRECT_LOCKFILE=1
  > npm run build` (workspace frontend) verde, gera `/convite/[token]` como rota dinâmica (`ƒ`) na
  > listagem de rotas do build. Limitação de ambiente (mesmo padrão registrado pela `010`): não
  > rodei o fluxo ponta a ponta contra o backend real dentro desta sessão de frontend puro (sem
  > servidor rodando); a validação funcional completa do fluxo (criar convite → copiar link →
  > abrir deslogado → `/join?convite=` → registrar/logar → aceite automático → navegação ao
  > quadro) foi coberta manualmente via `curl` na evidência backend da 5.1 para os endpoints, e a
  > integração de UI (chamadas, estados, mensagens de erro) foi revisada por leitura de código e
  > pelos tipos/contratos exatos retornados pelo backend (`{boardId, memberCreated}`,
  > `{boardName, invitedByName, email, status}`, `{id, email, token, status, link}`).
- [x] 5.3 Rodar `openspec validate 026-aceitar-convite --strict` e corrigir qualquer apontamento
  antes de considerar a change pronta para o gate.
  - **Aceite:** validação estrita limpa.
  > ✅ 2026-07-07 21:36 — `openspec validate 026-aceitar-convite --strict` → "Change
  > '026-aceitar-convite' is valid".
