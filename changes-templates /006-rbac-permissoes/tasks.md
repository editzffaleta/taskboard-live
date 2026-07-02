<!-- TEMPLATE — tasks do RBAC (DENSA). Checkboxes vazios; marque com evidencia. Cada task tem **Aceite**.
Execucao: por ser densa, o subagente pode quebrar em sub-passos (catalogo → dominio → persistencia →
guards → seed → frontend → telas). Placeholders: {{produto}}, {{namespace}}.
Troque as chaves de permissao de exemplo pelas dos SEUS modulos. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004` (`user`/`role`) e `005` (sessao com `role`/`organizationId`). **Nao faca:**
> tornar o catalogo editavel em runtime (e estatico, versionado no codigo); implementar os modulos de
> dominio que essas permissoes protegem (vem depois, fora do nucleo); refresh/rotacao de token.

## 1. Catalogo de permissoes (pacote compartilhado)

- [ ] 1.1 Criar o catalogo em `packages/shared` (ex.: `src/access/permissions.ts`): chaves granulares por modulo (ex.: `users.manage`, `courses.manage`, `vault.read`, `vault.manage`, `reports.view` — **troque pelos seus modulos**), com tipo/uniao exportada e metadados de exibicao (rotulo/modulo). Exportar pelo indice do pacote (padrao [config-package-shared](../../../.claude/skills/config-package-shared)).
  - **Aceite:** catalogo tipado e exportado; chaves organizadas por modulo; metadados (rotulo/modulo) presentes.
- [ ] 1.2 Definir as regras de **baseline por papel** no pacote: `super_admin` = total; `admin_org` = total no escopo da organizacao; `lider`/`colaborador` = vazio (recebem so dos grupos). Expor uma funcao de **resolucao de permissoes efetivas** reutilizavel por backend e frontend.
  - **Aceite:** funcao pura `efetivas = baseline(role) ∪ permissoes(grupos)` exportada; testavel isoladamente.

## 2. Dominio (modulo access)

- [ ] 2.1 Criar o modulo `access` com a skill [config-new-module](../../../.claude/skills/config-new-module) (`@{{namespace}}`).
  - **Aceite:** modulo + scaffold registrados; `AccessModule` no `AppModule` (conferir/registrar se o script nao fizer).
- [ ] 2.2 Criar o agregado `permission-group` com a skill [module-aggregate](../../../.claude/skills/module-aggregate) (mode `crud`).
  - **Aceite:** model/provider/usecases base + barrels.
- [ ] 2.3 Implementar a entidade `PermissionGroup` com a skill [module-entity](../../../.claude/skills/module-entity): `organizationId` (required), `name` (required, min 2, max 80), `description` (opcional, max 300), `permissions` (lista de chaves **validas do catalogo** — validar cada item), `isSystem` (boolean, default `false`).
  - **Aceite:** entidade com validacao lazy; `permissions` rejeita chave fora do catalogo; teste com cobertura alta.
- [ ] 2.4 Definir o contrato do repositorio com a skill [module-repository](../../../.claude/skills/module-repository): `findById`, `findByOrganization`, `findByName` (unicidade por organizacao) e o suporte a relacao de atribuicao com `user`.
  - **Aceite:** contrato com os metodos; fake in-memory em `test/mock/`.
- [ ] 2.5 Implementar `save-permission-group` (criar/atualizar via `findById`; validar unicidade de `name` por organizacao) e `delete-permission-group` (`DomainError('permission-group.not_found', 404)`; bloquear `isSystem` com `DomainError('permission-group.system_locked', 409)`) com a skill [module-use-case](../../../.claude/skills/module-use-case).
  - **Aceite:** unicidade de nome por org; delete de `isSystem` → 409; inexistente → 404.
- [ ] 2.6 Implementar `assign-groups-to-user` (define o conjunto de grupos do usuario; valida que **todos** pertencem a mesma organizacao do usuario) e a resolucao de permissoes efetivas (reutilizando a funcao de 1.2).
  - **Aceite:** grupo de outra organizacao → erro; efetivas = baseline ∪ grupos.
- [ ] 2.7 Cobrir os casos de uso com testes (fakes): grupo nao encontrado, `isSystem` bloqueado, atribuicao com grupo de outra organizacao, resolucao de efetivas por papel.
  - **Aceite:** todos os cenarios cobertos; suite do modulo verde.

## 3. Back-end (persistencia + autorizacao)

- [ ] 3.1 Sincronizar o `access` com o Prisma: `permission_group` (nome unico por `organizationId`) e a relacao `user_permission_group` com a skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Aceite:** models + relacao criados; unique (`organizationId`,`name`); migration aplicada (sem destrutivo); `prisma:generate` ok.
- [ ] 3.2 Implementar os repositorios Prisma de `permission-group` e da atribuicao em `apps/backend/src/modules/access` com a skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository), escopados por `organizationId` (`003`), sem alterar as interfaces.
  - **Aceite:** repositorios implementam os contratos; `tsc --noEmit` ok.
- [ ] 3.3 Em `apps/backend/src/shared/auth`, criar `@Roles(...)` + `RolesGuard` (le o claim `role`) e `@RequirePermissions(...)` + `PermissionsGuard` (resolve as efetivas via repositorio do `access` + funcao do shared; `super_admin`/`admin_org` fazem short-circuit). Os guards rodam **apos** o guard global de JWT.
  - **Aceite:** `RolesGuard` sem banco; `PermissionsGuard` resolve efetivas e faz short-circuit; negacao → 403.
- [ ] 3.4 Criar o controller do `access` com a skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller): CRUD de grupos em `/permission-groups` e atribuicao em `/users/:id/permission-groups`, sob `@Roles('admin_org','super_admin')`; e `GET /me/permissions` (autenticado) devolvendo catalogo + efetivas do usuario.
  - **Aceite:** endpoints autorizados; `GET /me/permissions` retorna catalogo + efetivas.
- [ ] 3.5 Criar `access.integration.http` cobrindo: CRUD de grupos, atribuicao, erros (inexistente 404, `isSystem` 409, grupo de outra organizacao), acesso negado por papel (403) e `GET /me/permissions`. Validar manualmente.
  - **Aceite:** cenarios cobertos; fluxo `403 → atribuicao → 200` demonstrado.

## 4. Bootstrap do Super Admin (adiamento da 003)

- [ ] 4.1 Adicionar um seed task idempotente (`apps/backend/prisma/seed/tasks`) criando um usuario `super_admin` na organizacao default, com `email`/`password` de `.env` (`SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD`), reutilizando as regras de `user` e o `crypto.provider` da `004`. Registrar as variaveis em `.env.example`.
  - **Aceite:** rodar o seed 2x mantem 1 super admin; variaveis no `.env.example`; senha cifrada.

## 5. Front-end (autorizacao)

- [ ] 5.1 Buscar `GET /me/permissions` na hidratacao da sessao e disponibilizar catalogo + efetivas (ex.: no `AuthContext` ou hook dedicado).
  - **Aceite:** efetivas disponiveis no client apos login; rebusca quando necessario.
- [ ] 5.2 Aplicar o gating na sidebar: a config estatica da `002` ganha `roles` e/ou `permissions` por secao/item; a sidebar filtra pelos dados do usuario (papel + efetivas).
  - **Aceite:** itens sem permissao nao aparecem; estrutura da `002` reutilizada sem reescrever.
- [ ] 5.3 Proteger as rotas privadas por papel/permissao (extensao do `AuthGuard` ou novo `RoleGuard`): acesso nao autorizado redireciona para uma rota neutra/dashboard inicial.
  - **Aceite:** rota protegida nega acesso nao autorizado (redirect), alem do bloqueio real no backend.

## 6. Front-end (telas D7/D8/D9 — modulo access)

- [ ] 6.1 **D7 — Listagem de grupos**: tabela paginada de `permission-groups` (nome, nº de permissoes, nº de membros, acoes), em rota protegida para Admin da Organizacao.
  - **Aceite:** tabela paginada com gating por papel.
- [ ] 6.2 **D8 — Editor de grupo**: formulario (via `form-section-layout`) com `name`, `description` e as permissoes **agrupadas por modulo** a partir do catalogo (checkboxes); criar/editar e excluir (via `delete-confirmation-dialog`, respeitando `isSystem`).
  - **Aceite:** permissoes agrupadas por modulo lidas do catalogo; excluir bloqueado para `isSystem`.
- [ ] 6.3 **D9 — Atribuir grupo**: selecao dos grupos de um colaborador (multi-select) e gravacao via `/users/:id/permission-groups`.
  - **Aceite:** atribuicao persiste e reflete nas efetivas do usuario.
- [ ] 6.4 Adicionar os itens de menu de grupos de permissao na secao administrativa da sidebar (com gating por papel).
  - **Aceite:** itens visiveis apenas para os papeis administrativos.

## 7. i18n e verificacao

- [ ] 7.1 Adicionar as chaves i18n novas em `messages.pt.ts`/`messages.en.ts` (erros: `permission-group.not_found`, `permission-group.system_locked`, acesso negado; rotulos de permissoes/modulos do catalogo).
  - **Aceite:** chaves presentes em pt e en.
- [ ] 7.2 Rodar `npx tsc --noEmit` (backend e frontend), os testes do `access` e o seed do Super Admin (idempotente); registrar evidencia do gating (colaborador sem permissao nao ve itens administrativos e recebe 403 nos endpoints).
  - **Aceite:** `tsc` limpo; testes verdes; seed idempotente; gating validado ponta a ponta.
