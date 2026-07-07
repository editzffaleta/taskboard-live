> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/membros/spec.md` · `openspec/specs/convites/spec.md`
> (se existir) · esta change (`proposal.md`, `design.md`, `tasks.md`,
> `specs/convites/spec.md`, `mockups/`) · e, **somente se o `design.md` citar nominalmente**:
> arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

A `010` já permite ao owner adicionar um membro por e-mail, mas **só funciona se esse e-mail já
tiver conta** no TaskBoard Live (`MemberDirectory.findByEmail` retorna `404` caso contrário).
Isso trava o caso mais comum de colaboração real: convidar alguém que ainda nunca usou o
produto. Esta change fecha essa lacuna com **convite por token**: o owner convida um e-mail
qualquer, recebe um **link copiável** (sem envio de e-mail real — não há provider configurado),
e quem abre o link vê uma prévia pública do quadro e de quem convidou, podendo entrar
diretamente (se já logado) ou passar por registro/login (`004`) antes de entrar — exatamente o
fluxo do mockup `mockups/Aceitar Convite.dc.html`.

## What Changes

- **Novo agregado `Invitation`** no módulo `board` (schema Prisma novo, migration): `{ id,
  boardId, email, token (único), role (fixo `member` nesta change), status
  (pending|accepted|revoked), invitedById, createdAt }`.
- **Caso de uso `create-invitation`**: o owner do quadro convida por e-mail; se o e-mail já é
  `BoardMember` do quadro → erro (nenhum convite criado); se já existe um convite `pending` para
  aquele e-mail+quadro → **reusa** o mesmo (idempotente, mesmo `token`), não cria duplicado.
  Retorna o convite com o `token`, para o frontend montar o link `/convite/:token`.
- **Consulta pública do convite** `GET /invitations/:token` (rota `@Public()`, sem JWT): retorna
  apenas `{ boardName, invitedByName, email, status }` — nunca o `boardId` completo ou dados
  sensíveis do quadro — para alimentar a página pública de aceite.
- **Caso de uso `accept-invitation`** `POST /invitations/:token/accept` (autenticado): valida
  `status === 'pending'`; **exige que o e-mail do usuário autenticado seja igual (case
  -insensitive) ao e-mail do convite** (regra de segurança explícita, ver `design.md`); cria
  `BoardMember role='member'` (idempotente se já for membro); marca o convite `accepted`; emite
  `member.added` reaproveitando o contrato da `010`/`006`.
- **Frontend**: página pública `/convite/[token]` (App Router, grupo `(public)`) que reproduz o
  mockup — busca a prévia, mostra quem convidou e o quadro, e o botão "Entrar no quadro"; se
  deslogado, encaminha para `/join?convite=:token` preservando o token e completa o aceite
  automaticamente após autenticar. O painel "Compartilhar" (`010`) passa a mostrar, ao convidar
  um e-mail, o **link do convite copiável** e o estado `pendente`, além de continuar oferecendo
  a adição direta quando aplicável.

## Capabilities

### New Capabilities
- `convites`: convite de colaboradores por e-mail via link/token, sem exigir conta prévia —
  criação do convite pelo owner, consulta pública da prévia, e aceite por um usuário
  autenticado cujo e-mail corresponda ao convite, resultando em `BoardMember` e notificação em
  tempo real (`member.added`).

### Modified Capabilities
<!-- `membros` (010) não muda seu contrato — add-member/remove-member/list-members continuam
como estão. O painel "Compartilhar" ganha uma nova ação (convidar por link) além das já
existentes; nenhum endpoint da 010 é removido ou alterado. -->

## Impact

- **Backend**: novo model Prisma `Invitation` + migration; agregado `invitation` no módulo
  `board` (entidade, porta de repositório, casos de uso `create-invitation`,
  `accept-invitation`, `get-invitation-preview`, opcionalmente `revoke-invitation`/
  `list-invitations`); controller `invitations.controller.ts` com rotas públicas e autenticadas
  misturadas (`@Public()` só na consulta de prévia); chaves i18n de erro (
  `invitation.not.found`, `invitation.already.member`, `invitation.email.mismatch`,
  `invitation.invalid.status`).
- **Frontend**: página pública `/convite/[token]`; ajuste em `/join` para aceitar
  `?convite=:token` e, após autenticar, chamar o accept e navegar para o quadro; atualização do
  painel "Compartilhar" (`010`) para exibir o link do convite pendente.
- **Domínio**: reaproveita `Board`/`User`/`BoardMember` (`005`); novo model `Invitation`.
- **Tempo real**: reaproveita `RealtimeEmitter.emitToBoard` (`006`) e o evento `member.added`
  já definido pela `010` — nenhum evento novo.
- **Dependências**: `004` (auth/JWT, `/join`), `005` (Board/BoardMember), `006`
  (`RealtimeEmitter`), `010` (`membros` — `MembershipRepository`, `MemberDirectory`, painel
  "Compartilhar", evento `member.added`).
- **Habilita**: convidar qualquer pessoa por e-mail para colaborar no quadro, mesmo sem conta
  prévia — completa o ciclo de colaboração iniciado na `010`.
