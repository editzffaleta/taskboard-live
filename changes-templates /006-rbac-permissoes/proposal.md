<!--
TEMPLATE DE CHANGE — 006-rbac-permissoes (autorizacao completa). Mudanca DENSA.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
As chaves de permissao de exemplo (courses.manage, vault.read, ...) sao do dominio do AlphaBet;
troque pelas chaves dos SEUS modulos. Os papeis (super_admin|admin_org|lider|colaborador) sao o
default desta familia de produtos.
-->

## Why

A sessao ja carrega `role` e `organizationId` (`005`), mas nada ainda e autorizado: qualquer usuario
autenticado acessaria qualquer endpoint ou item de menu. O {{produto}} tem dois niveis de acesso —
o **papel** (Colaborador, Lider, Admin da Organizacao, Super Admin), que define a persona/area, e os
**grupos de permissao** (telas D7/D8/D9), que o Admin da Organizacao usa para conceder capacidades
granulares a colaboradores e lideres. Esta mudanca entrega o RBAC ponta a ponta (modelo, atribuicao,
guards e gating de UI) e **resolve o ultimo adiamento da `003`**: o bootstrap do usuario Super Admin,
agora que usuario (`004`) e papeis existem. Tudo daqui em diante (`007`+) depende deste mecanismo.

## What Changes

- Criar o **catalogo de permissoes** (chaves granulares por modulo, ex.: `courses.manage`,
  `vault.read`, `users.manage`) no pacote compartilhado, consumivel pelo backend (guards) e pelo
  frontend (editor de grupo).
- Criar o modulo `access` com o agregado `permission-group` (org-scoped): entidade `PermissionGroup`
  (`name`, `description?`, `permissions[]` validadas contra o catalogo, `isSystem`), contrato e repositorio.
- Implementar `save-permission-group`, `delete-permission-group` (bloqueando grupos `isSystem`) e
  `assign-groups-to-user` (valida que os grupos sao da mesma organizacao), com testes unitarios.
- Definir a **resolucao de permissoes efetivas**: `super_admin` = acesso total (plataforma);
  `admin_org` = acesso total dentro da sua organizacao; `lider`/`colaborador` recebem apenas o que os
  grupos atribuidos concedem. Efetivas = baseline do papel ∪ uniao das permissoes dos grupos.
- Sincronizar no Prisma os models `permission_group` (nome unico por organizacao) e a relacao
  `user_permission_group`, com repositorios.
- Adicionar a autorizacao no backend: decorators `@Roles(...)` + `RolesGuard` (le o claim `role`) e
  `@RequirePermissions(...)` + `PermissionsGuard` (resolve as efetivas; `super_admin`/`admin_org` fazem
  short-circuit). Expor o CRUD de grupos e a atribuicao em endpoints autorizados, alem de
  `GET /me/permissions` (catalogo + efetivas do usuario) para o frontend.
- **Bootstrap do Super Admin (adiamento da `003`)**: seed idempotente criando um usuario `super_admin`
  na organizacao default, com credenciais configuraveis por `.env`.
- No frontend: aplicar o **gating por papel/permissao** na sidebar (a config estatica da `002` ganha
  `roles`/`permissions` por item) e nas rotas privadas; e entregar as telas **D7** (listagem de
  grupos), **D8** (editor de grupo com permissoes agrupadas por modulo) e **D9** (atribuir grupos a
  um colaborador).
- Mapear no i18n (pt/en) os erros e rotulos novos.

## Capabilities

### New Capabilities
- `rbac-permissoes`: Autorizacao completa do {{produto}} — catalogo de permissoes no pacote
  compartilhado, modulo `access` com `permission-group` (CRUD + atribuicao a usuarios), resolucao de
  permissoes efetivas por papel e grupos, guards de papel e de permissao no backend, bootstrap do
  Super Admin via seed, e gating de sidebar/rotas + telas de grupos (D7/D8/D9) no frontend.

### Modified Capabilities
<!-- Nenhuma. role/organizationId (004/005) e a convencao de escopo (003) sao consumidos, nao modificados. -->

## Impact

- **Pacote compartilhado**: catalogo de permissoes (chaves por modulo) e as regras de baseline por
  papel, consumiveis por backend e frontend.
- **Dominio (`modules/access`)**: agregado `permission-group`, entidade, contrato, casos de uso
  (`save`/`delete`/`assign-groups-to-user`) e a resolucao de permissoes efetivas + testes unitarios.
- **Backend**: models Prisma `permission_group` e `user_permission_group` + repositorios;
  decorators/guards `@Roles`/`RolesGuard` e `@RequirePermissions`/`PermissionsGuard` em
  `apps/backend/src/shared/auth`; controller de grupos/atribuicao e `GET /me/permissions`;
  `access.integration.http`; seed do Super Admin.
- **Frontend**: gating por papel/permissao na sidebar (config da `002`) e nas rotas; carregamento das
  permissoes efetivas; telas D7/D8/D9 no modulo `access`; chaves i18n novas.
- **Dependencias**: papel/organizacao da sessao (`005`), escopo por `organizationId` (`003`),
  organizacao default (`003`).
- **Habilita**: todas as mudancas `007`+ passam a proteger endpoints e itens de menu por papel/permissao.
