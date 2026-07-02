<!-- TEMPLATE — tasks do mecanismo RBAC. Checkboxes vazios; marque com evidencia. Cada task tem
**Aceite**. Placeholders: {{produto}}, {{namespace}}. Troque as chaves de exemplo pelas dos SEUS modulos. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004` (`user`/`role`) e `005` (sessao com `role`/`organizationId`). **Nao faca:**
> catalogo editavel em runtime; gating de UI ou telas D7/D8/D9 (e a `006b`); modulos de dominio que
> as permissoes protegem; refresh/rotacao de token.

## 1. Catalogo de permissoes (pacote compartilhado)

- [ ] 1.1 Criar o catalogo em `packages/shared` (ex.: `src/access/permissions.ts`): chaves granulares por modulo (ex.: `users.manage`, `courses.manage`, `vault.read`, `vault.manage`, `reports.view` — **troque pelos seus modulos**), com tipo/uniao exportada e metadados de exibicao (rotulo/modulo). Exportar pelo indice do pacote (padrao [config-package-shared](../../../.claude/skills/config-package-shared)).
  - **Aceite:** catalogo tipado e exportado; chaves organizadas por modulo; metadados presentes.
- [ ] 1.2 Definir as regras de **baseline por papel** no pacote: `super_admin` = total; `admin_org` = total no escopo da organizacao; `lider`/`colaborador` = vazio. Expor a funcao pura de **resolucao de efetivas** reutilizavel por backend e frontend.
  - **Aceite:** `efetivas = baseline(role) ∪ permissoes(grupos)` exportada; testavel isoladamente.

## 2. Dominio (modulo access)

- [ ] 2.1 Criar o modulo `access` com a skill [config-new-module](../../../.claude/skills/config-new-module) (`@{{namespace}}`).
  - **Aceite:** modulo + scaffold registrados; `AccessModule` no `AppModule`.
- [ ] 2.2 Criar o agregado `permission-group` com a skill [module-aggregate](../../../.claude/skills/module-aggregate) (mode `crud`).
  - **Aceite:** model/provider/usecases base + barrels.
- [ ] 2.3 Implementar a entidade `PermissionGroup` com a skill [module-entity](../../../.claude/skills/module-entity): `organizationId` (required), `name` (required, min 2, max 80), `description` (opcional, max 300), `permissions` (lista de chaves **validas do catalogo**), `isSystem` (boolean, default `false`).
  - **Aceite:** validacao lazy; `permissions` rejeita chave fora do catalogo; teste com cobertura alta.
- [ ] 2.4 Definir o contrato do repositorio com a skill [module-repository](../../../.claude/skills/module-repository): `findById`, `findByOrganization`, `findByName` (unicidade por organizacao) e o suporte a atribuicao com `user`.
  - **Aceite:** contrato com os metodos; fake in-memory em `test/mock/`.
- [ ] 2.5 Implementar `save-permission-group` (criar/atualizar; unicidade de `name` por organizacao) e `delete-permission-group` (`DomainError('permission-group.not_found', 404)`; `isSystem` → `DomainError('permission-group.system_locked', 409)`) com a skill [module-use-case](../../../.claude/skills/module-use-case).
  - **Aceite:** unicidade por org; delete de `isSystem` → 409; inexistente → 404.
- [ ] 2.6 Implementar `assign-groups-to-user` (define o conjunto de grupos do usuario; **todos** da mesma organizacao) e a resolucao de efetivas (reutilizando 1.2).
  - **Aceite:** grupo de outra organizacao → erro; efetivas = baseline ∪ grupos.
- [ ] 2.7 Cobrir os casos de uso com testes (fakes): grupo nao encontrado, `isSystem` bloqueado, atribuicao com grupo de outra organizacao, resolucao de efetivas por papel.
  - **Aceite:** cenarios cobertos; suite do modulo verde.

## 3. Back-end (persistencia + autorizacao)

- [ ] 3.1 Sincronizar o `access` com o Prisma: `permission_group` (unique `organizationId`+`name`) e `user_permission_group`, com a skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Aceite:** models + relacao criados; unique composto; migration aplicada; `prisma:generate` ok.
- [ ] 3.2 Implementar os repositorios Prisma de `permission-group` e da atribuicao em `apps/backend/src/modules/access` com a skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository), escopados por `organizationId` (`003`), sem alterar as interfaces.
  - **Aceite:** repositorios implementam os contratos; `tsc --noEmit` ok.
- [ ] 3.3 Em `apps/backend/src/shared/auth`, criar `@Roles(...)` + `RolesGuard` (le o claim `role`, sem banco).
  - **Aceite:** endpoint sob `@Roles` nega papel errado com 403; roda apos o guard global de JWT.
- [ ] 3.4 Em `apps/backend/src/shared/auth`, criar `@RequirePermissions(...)` + `PermissionsGuard` (resolve efetivas via repositorio do `access` + funcao do shared; `super_admin`/`admin_org` short-circuit).
  - **Aceite:** sem permissao efetiva → 403; admins autorizados sem leitura de grupos.
- [ ] 3.5 Criar o controller do `access` com a skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller): CRUD em `/permission-groups` e atribuicao em `/users/:id/permission-groups`, sob `@Roles('admin_org','super_admin')`; e `GET /me/permissions` (autenticado) devolvendo catalogo + efetivas.
  - **Aceite:** endpoints autorizados; `GET /me/permissions` retorna catalogo + efetivas.
- [ ] 3.6 Criar `access.integration.http`: CRUD de grupos, atribuicao, erros (404/409/outra org), negado por papel (403) e `GET /me/permissions`. Validar manualmente.
  - **Aceite:** cenarios cobertos; fluxo `403 → atribuicao → 200` demonstrado.

## 4. Bootstrap do Super Admin (adiamento da 003)

- [ ] 4.1 Seed task idempotente (`apps/backend/prisma/seed/tasks`) criando um `super_admin` na organizacao default, com `SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD` do `.env`, reutilizando regras do `user` e o `crypto.provider` (`004`). Registrar as variaveis em `.env.example`.
  - **Aceite:** rodar o seed 2x mantem 1 super admin; variaveis no `.env.example`; senha cifrada.

## 5. i18n e verificacao

- [ ] 5.1 Adicionar as chaves i18n de **erro** em `messages.pt.ts`/`messages.en.ts`: `permission-group.not_found`, `permission-group.system_locked`, acesso negado.
  - **Aceite:** chaves presentes em pt e en.
- [ ] 5.2 Rodar `npx tsc --noEmit` em `apps/backend` e `apps/frontend`, os testes do `access` e o seed (2x, idempotente).
  - **Aceite:** `tsc` limpo nos dois apps; testes verdes; seed idempotente comprovado.
