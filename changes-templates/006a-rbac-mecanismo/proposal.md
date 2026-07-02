<!--
TEMPLATE DE CHANGE — 006a-rbac-mecanismo (autorizacao: mecanismo backend completo).
Split da antiga 006 (densa): mecanismo aqui; gating/telas na 006b.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
As chaves de permissao de exemplo (courses.manage, vault.read, ...) sao do dominio do AlphaBet;
troque pelas chaves dos SEUS modulos. Papeis default: super_admin|admin_org|lider|colaborador.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/rbac-permissoes/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

A sessao ja carrega `role` e `organizationId` (`005`), mas nada ainda e autorizado: qualquer usuario
autenticado acessaria qualquer endpoint. O {{produto}} tem dois niveis de acesso — o **papel**
(persona/area) e os **grupos de permissao** granulares que o Admin da Organizacao concede. Esta
mudanca entrega o **mecanismo completo no backend** (catalogo, agregado, resolucao de efetivas,
guards, endpoints) e **resolve o ultimo adiamento da `003`**: o bootstrap do Super Admin. O gating de
UI e as telas D7/D8/D9 ficam na `006b`. Tudo de `007`+ depende deste mecanismo.

## What Changes

- Criar o **catalogo de permissoes** (chaves granulares por modulo, ex.: `courses.manage`,
  `vault.read`, `users.manage`) no pacote compartilhado, consumivel por backend e frontend.
- Criar o modulo `access` com o agregado `permission-group` (org-scoped): entidade `PermissionGroup`
  (`name`, `description?`, `permissions[]` validadas contra o catalogo, `isSystem`), contrato e repositorio.
- Implementar `save-permission-group`, `delete-permission-group` (bloqueando grupos `isSystem`) e
  `assign-groups-to-user` (valida mesma organizacao), com testes unitarios.
- Definir a **resolucao de permissoes efetivas**: `super_admin` = total (plataforma); `admin_org` =
  total na sua organizacao; `lider`/`colaborador` = apenas o que os grupos concedem.
  Efetivas = baseline do papel ∪ uniao das permissoes dos grupos.
- Sincronizar no Prisma `permission_group` (nome unico por organizacao) e `user_permission_group`,
  com repositorios.
- Autorizacao no backend: `@Roles(...)` + `RolesGuard` (claim `role`) e `@RequirePermissions(...)` +
  `PermissionsGuard` (efetivas; `super_admin`/`admin_org` short-circuit). Expor CRUD de grupos,
  atribuicao e `GET /me/permissions` (catalogo + efetivas) para o frontend consumir na `006b`.
- **Bootstrap do Super Admin (adiamento da `003`)**: seed idempotente com credenciais via `.env`.
- Mapear no i18n (pt/en) os **erros** novos do mecanismo.

## Capabilities

### New Capabilities
- `rbac-permissoes`: Mecanismo de autorizacao do {{produto}} — catalogo de permissoes compartilhado,
  modulo `access` com `permission-group` (CRUD + atribuicao), resolucao de efetivas por papel e
  grupos, guards de papel e de permissao no backend, endpoints autorizados + `GET /me/permissions`,
  e bootstrap do Super Admin via seed. (O gating de UI e as telas entram pela `006b`.)

### Modified Capabilities
<!-- Nenhuma. role/organizationId (004/005) e a convencao de escopo (003) sao consumidos, nao modificados. -->

## Impact

- **Pacote compartilhado**: catalogo de permissoes (chaves por modulo) e regras de baseline por
  papel, consumiveis por backend e frontend.
- **Dominio (`modules/access`)**: agregado `permission-group`, entidade, contrato, casos de uso
  (`save`/`delete`/`assign-groups-to-user`), resolucao de efetivas + testes unitarios.
- **Backend**: models Prisma `permission_group` e `user_permission_group` + repositorios;
  decorators/guards em `apps/backend/src/shared/auth`; controller de grupos/atribuicao e
  `GET /me/permissions`; `access.integration.http`; seed do Super Admin.
- **Dependencias**: papel/organizacao da sessao (`005`), escopo por `organizationId` e organizacao
  default (`003`), `user`/`crypto.provider` (`004`).
- **Habilita**: `006b` (gating/telas) e todas as mudancas `007`+ protegem endpoints por papel/permissao.
