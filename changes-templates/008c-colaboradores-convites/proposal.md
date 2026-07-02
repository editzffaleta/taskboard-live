<!--
TEMPLATE DE CHANGE — 008c-colaboradores-convites (convites por token + auto-cadastro publico A6).
Split da antiga 008 (densa): CRUD/wizard na 008a; aprovacao na 008b.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
O codigo de tela (A6) e a rota publica /convite/[token] referem-se aos seus mockups; ajuste-os.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/cadastro-colaboradores/spec.md` e
> `openspec/specs/registro-usuario/spec.md` (se existirem) · esta change (`proposal.md`,
> `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o `design.md`
> citar nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O onboarding self-service do {{produto}} precisa ser controlado: o `/join` aberto da `004` foi
pensado para o bootstrap, nao para o dia a dia multi-organizacao. Esta mudanca entrega o caminho
definitivo: o admin gera um **convite por token** (com organizacao, e opcionalmente papel/estrutura
pre-definidos), compartilha o link, e o colaborador se auto-cadastra pela pagina publica **A6** —
nascendo `pending` para a fila de aprovacao da `008b`.

## What Changes

- Criar o agregado `invitation` no modulo `auth`: `organizationId`, `email?`, papel/estrutura
  pre-definidos opcionais, `token` (aleatorio seguro, unico), `expiresAt`, `status`
  (`pending|accepted|expired|revoked`).
- Casos de uso `create-invitation`, `accept-invitation` (valida o token e cria o usuario via
  `register-user` com a organizacao/papel/estrutura do convite e `status = pending`; convite →
  `accepted`) e `revoke-invitation`.
- **Persistencia**: model Prisma `invitation` (token unico) + repositorio.
- **Endpoints**: admin (`POST /invitations`, listar, revogar) sob papel; publicos
  (`GET /invitations/:token` validar; `POST /invitations/:token/accept`) via `public.decorator`.
- **Frontend**: **A6** (rota publica `/convite/[token]` de aceite) e **gestao de convites** no admin
  (gerar/listar/revogar; link exibido para compartilhar); itens de menu sob gating; i18n.
- **Decisao a confirmar**: manter o `/join` aberto (bootstrap) ou torna-lo invite-only.

## Capabilities

### New Capabilities
<!-- Nenhuma. Esta mudanca completa a capability criada pela 008a. -->

### Modified Capabilities
- `cadastro-colaboradores` (`008a`): a capability ganha o ciclo de convites (criar → validar →
  aceitar → revogar), a pagina publica A6 e a gestao de convites do admin.
- `registro-usuario` (`004`): o `register-user` passa a ser reaproveitado pelo `accept-invitation`
  (organizacao vinda do convite, nao a default) e o `status = pending` passa a fluir pelo
  convite/aprovacao.

## Impact

- **Dominio (`modules/auth`)**: agregado `invitation` + `create`/`accept`/`revoke` + testes.
- **Backend**: model `invitation` (token unico) + repositorio; `InvitationController` (admin +
  rotas publicas); integracao HTTP.
- **Frontend**: A6 (`/convite/[token]`) e gestao de convites no modulo `auth`; menu sob gating; i18n.
- **Dependencias**: `008a` (user com estrutura), `008b` (fila que ativa o `pending`), `004`
  (`register-user`), `006a`/`006b` (autorizacao/gating), `003` (organizacoes).
- **Habilita**: onboarding multi-organizacao sem cadastro aberto.
