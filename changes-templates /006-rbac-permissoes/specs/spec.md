<!--
TEMPLATE — delta de capability da 006 (rbac-permissoes). Placeholders: {{produto}}.
NOTA DE DIVERGENCIA: no AlphaBet original esta mudanca NAO tinha specs/spec.md. Como ela declara uma
capability nova (`rbac-permissoes`) e o objetivo aqui e ser mais robusto/verificavel, este delta foi
ADICIONADO. Se preferir espelhar o original exatamente, remova este arquivo (a 006 vira so
proposal/design/tasks, e o `openspec validate` pode sinalizar a ausencia de spec).
-->

## ADDED Requirements

### Requirement: Catalogo de permissoes compartilhado

O sistema SHALL prover um catalogo de permissoes estatico no pacote compartilhado, com chaves
granulares por modulo, consumivel por backend e frontend, e MUST NOT torna-lo editavel em runtime.

#### Scenario: Catalogo disponivel e tipado

- **WHEN** backend ou frontend importam o catalogo do pacote compartilhado
- **THEN** obtem as chaves de permissao por modulo, com tipo/uniao e metadados de exibicao (rotulo/modulo)
- **AND** o catalogo e um registro estatico versionado no codigo (nao editavel em runtime)

### Requirement: Agregado permission-group org-scoped

O sistema SHALL prover o agregado `permission-group` no modulo `access`, pertencente a uma
organizacao, com permissoes validadas contra o catalogo.

#### Scenario: Entidade de grupo valida

- **WHEN** um `PermissionGroup` e criado
- **THEN** exige `organizationId` e `name` (2 a 80 caracteres), aceita `description` opcional (ate 300) e `isSystem` (default `false`)
- **AND** cada item de `permissions` deve ser uma chave valida do catalogo

#### Scenario: Nome unico por organizacao

- **WHEN** se tenta salvar um grupo com `name` ja usado na mesma organizacao
- **THEN** a unicidade por organizacao e garantida (dominio + indice unico no Prisma)

#### Scenario: Grupo de sistema nao e excluido

- **WHEN** se tenta excluir um grupo com `isSystem = true`
- **THEN** a exclusao e bloqueada com `DomainError('permission-group.system_locked', 409)`
- **AND** excluir um grupo inexistente lanca `DomainError('permission-group.not_found', 404)`

### Requirement: Atribuicao de grupos e permissoes efetivas

O sistema SHALL atribuir grupos a usuarios via relacao `user_permission_group` (validando mesma
organizacao) e SHALL resolver permissoes efetivas como a baseline do papel unida as permissoes dos
grupos do usuario.

#### Scenario: Atribuicao valida a organizacao

- **WHEN** `assign-groups-to-user` recebe grupos para um usuario
- **THEN** define o conjunto de grupos do usuario
- **AND** rejeita a operacao se algum grupo pertencer a outra organizacao

#### Scenario: Resolucao de permissoes efetivas por papel

- **WHEN** as permissoes efetivas de um usuario sao resolvidas
- **THEN** `super_admin` tem acesso total (plataforma) e `admin_org` tem acesso total na sua organizacao
- **AND** `lider`/`colaborador` recebem apenas as permissoes dos grupos atribuidos (baseline vazia)
- **AND** as efetivas sao a uniao da baseline do papel com as permissoes dos grupos

### Requirement: Autorizacao no backend por papel e por permissao

O backend SHALL prover `@Roles(...)`/`RolesGuard` (le o claim `role`) e
`@RequirePermissions(...)`/`PermissionsGuard` (resolve as efetivas), rodando apos o guard global de
JWT; `super_admin`/`admin_org` SHALL fazer short-circuit no `PermissionsGuard`.

#### Scenario: Endpoint protegido por papel

- **WHEN** um usuario sem o papel exigido chama um endpoint sob `@Roles(...)`
- **THEN** a requisicao e negada com 403

#### Scenario: Endpoint protegido por permissao

- **WHEN** um usuario chama um endpoint sob `@RequirePermissions(...)` sem a permissao efetiva
- **THEN** a requisicao e negada com 403
- **AND** `super_admin` e `admin_org` sao autorizados sem leitura de grupos (short-circuit)

#### Scenario: CRUD de grupos, atribuicao e me/permissions

- **WHEN** o controller do `access` e exercitado com o backend rodando
- **THEN** `/permission-groups` (CRUD) e `/users/:id/permission-groups` (atribuicao) estao sob `@Roles('admin_org','super_admin')`
- **AND** `GET /me/permissions` (autenticado) devolve o catalogo e as permissoes efetivas do usuario logado

### Requirement: Bootstrap do Super Admin

O sistema SHALL semear, de forma idempotente, um usuario `super_admin` na organizacao default, com
credenciais lidas de variaveis de ambiente.

#### Scenario: Seed idempotente do Super Admin

- **WHEN** o seed do Super Admin e executado (com `SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD`)
- **THEN** um usuario `super_admin` e criado na organizacao default, com senha cifrada
- **AND** executar o seed novamente nao duplica o usuario

### Requirement: Gating de UI por papel e permissao

O frontend SHALL aplicar o gating por papel/permissao na sidebar e nas rotas privadas, consumindo as
permissoes efetivas do usuario, e SHALL prover as telas de grupos (D7/D8/D9).

#### Scenario: Sidebar filtra por papel e permissao

- **WHEN** a sidebar e renderizada para um usuario
- **THEN** apenas os itens cujos `roles`/`permissions` o usuario satisfaz sao exibidos
- **AND** a estrutura por secoes da `002` e reutilizada sem reescrita

#### Scenario: Telas de grupos disponiveis

- **WHEN** um Admin da Organizacao acessa a area de grupos de permissao
- **THEN** D7 lista os grupos, D8 edita um grupo com as permissoes agrupadas por modulo e D9 atribui grupos a um colaborador

#### Scenario: Gating de UI nao substitui a autorizacao real

- **WHEN** um colaborador sem permissao tenta acessar um recurso administrativo
- **THEN** o item nao aparece no menu e a rota nega o acesso
- **AND** a autorizacao efetiva e garantida pelo backend (403), independentemente do gating de UI

### Requirement: i18n e build sem erros

Os erros e rotulos novos SHALL estar mapeados no i18n (pt/en) e o projeto SHALL permanecer sem erros
de TypeScript/build.

#### Scenario: Chaves i18n e verificacao

- **WHEN** o typecheck/build e executado em `apps/backend` e `apps/frontend`
- **THEN** nao ha erros de TypeScript nem de build
- **AND** existem as chaves i18n dos erros (`permission-group.not_found`, `permission-group.system_locked`, acesso negado) e dos rotulos de permissoes/modulos em pt e en
