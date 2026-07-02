<!--
TEMPLATE DE CHANGE — 008-cadastro-colaboradores (onboarding e gestao de colaboradores). Mudanca DENSA.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigos de tela (D2/D3/D29/A6) e a rota publica /convite/[token] referem-se aos seus mockups; ajuste-os.
-->

## Why

O CRUD basico de usuario (`004`) era um ponto de partida. No {{produto}}, o gerenciamento de
colaboradores e o coracao da operacao do Admin da Organizacao e abrange quatro telas: a listagem
(D2), o cadastro em wizard de 6 passos (D3), a aprovacao de cadastros (D29) e o auto-cadastro por
link de convite (A6). Esta mudanca revisa e expande aquele CRUD para o ciclo completo de
**onboarding e gestao de colaboradores**, integrando a estrutura organizacional (`007`) e o RBAC (`006`).

## What Changes

- **Extensao do `user`**: a entidade ganha `sectorId?`, `positionId?` e `unitId?` (FKs opcionais para
  a estrutura da `007`, mesma organizacao). `role` e `status` ja existem (`004`).
- **CRUD de colaboradores (revisao de `save-user`/`delete-user`)**: `save-user` passa a definir a
  organizacao a partir do contexto do admin, atribuir papel e vincular setor/cargo/unidade (validando
  mesma organizacao); mantem-se a regra de edicao sem `password` preservando o hash. Comandos
  instanciam o caso de uso; consultas chamam o repositorio direto e mapeiam a leitura para objeto
  simples (incluindo papel, status e estrutura).
- **Convites (A6)**: criar o agregado `invitation` (token seguro, `organizationId`, `email?`, papel e
  estrutura pre-definidos opcionais, `expiresAt`, `status`). Casos de uso `create-invitation`,
  `accept-invitation` (valida o token e cria o usuario via `register-user` com `status = pending`) e
  `revoke-invitation`. Endpoints administrativos e publicos (`GET /invitations/:token`,
  `POST /invitations/:token/accept`).
- **Aprovacao (D29)**: casos de uso `approve-user` (`pending → active`) e `reject-user`
  (`pending → inactive`), com `DomainError` quando o status nao permite a transicao; endpoints
  `POST /users/:id/approve` e `POST /users/:id/reject` e listagem de pendentes.
- **Persistencia**: migration estendendo `user` (FKs de estrutura) e criando o model `invitation`
  (token unico); repositorios Prisma.
- **Autorizacao**: endpoints administrativos protegidos por papel/permissao (`006`), escopados por
  organizacao (`003`/`005`); endpoints de convite publico abertos via `public.decorator`.
- **Frontend**: D2 (listagem paginada com filtros e badges de status), D3 (wizard de 6 passos), D29
  (fila de aprovacao), A6 (pagina publica de aceite de convite), gestao de convites
  (gerar/listar/revogar), itens de menu sob gating; chaves i18n novas.

## Capabilities

### New Capabilities
- `cadastro-colaboradores`: Onboarding e gestao de colaboradores no {{produto}} — CRUD com vinculo a
  papel e estrutura organizacional, convites por token com auto-cadastro publico (A6), fluxo de
  aprovacao (D29), persistencia Prisma e telas D2/D3/D29/A6, integrando RBAC (`006`) e estrutura (`007`).

### Modified Capabilities
- `registro-usuario` (`004`): a entidade `user` e estendida com `sectorId`/`positionId`/`unitId`; o
  `status = pending` passa a ser usado pelo fluxo de convite/aprovacao. O `register-user` e
  reaproveitado pelo `accept-invitation` (organizacao vinda do convite, nao a default).

## Impact

- **Dominio (`modules/auth`)**: `user` estendido (FKs de estrutura); `save-user` revisado; novos casos
  de uso `approve-user`, `reject-user`; novo agregado `invitation` com `create`/`accept`/`revoke` + testes.
- **Backend**: migration de `user` (FKs `sector`/`position`/`unit`) e model `invitation` (token
  unico); repositorios; `UserController` ampliado (`/users` CRUD + `approve`/`reject` + filtro de
  pendentes) e `InvitationController` (`/invitations` admin + rotas publicas de aceite); testes de integracao HTTP.
- **Frontend**: telas D2/D3/D29/A6 e gestao de convites no modulo `auth`; rota publica
  `/convite/[token]`; itens de menu sob gating por papel/permissao; chaves i18n novas.
- **Dependencias**: estrutura organizacional (`007`), RBAC (`006`), escopo/tenant (`003`/`005`), design system (`002`).
- **Decisao a confirmar**: politica de registro aberto da `004` — manter o `/join` aberto para o
  bootstrap ou torna-lo invite-only.
