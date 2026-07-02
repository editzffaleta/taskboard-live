<!-- TEMPLATE — design do RBAC. Placeholders: {{produto}}, {{namespace}}. -->

## Context

A sessao autenticada ja expoe `role` e `organizationId` (`005`), e a `003` definiu a convencao de
escopo por organizacao. Falta a autorizacao. O {{produto}} combina um **papel** coarse (na entidade
`user`, desde a `004`) com **grupos de permissao** granulares e org-scoped, geridos pelo Admin da
Organizacao (telas D7/D8/D9). Esta mudanca implementa o mecanismo completo e semeia o Super Admin
(adiamento da `003`).

A base do backend ja tem guard global de JWT, `current-user`/`current-organization` decorators e
`public.decorator`. Os guards de autorizacao desta mudanca rodam **apos** o guard global de JWT.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Catalogo de permissoes compartilhado (backend + frontend).
- `permission-group` org-scoped com CRUD e atribuicao a usuarios.
- Resolucao de permissoes efetivas (baseline do papel ∪ grupos).
- Guards de papel e de permissao no backend; gating de sidebar/rotas no frontend.
- Bootstrap idempotente do Super Admin.
- Telas D7/D8/D9.

**Non-Goals:**
- Tornar o catalogo editavel em runtime — e um registro estatico versionado no codigo.
- Implementar os modulos de dominio que essas permissoes protegem — eles vem depois, fora do nucleo universal.
- Refresh de sessao / rotacao de token — fora do escopo (a `009` reforca a autenticacao com MFA).

## Decisions

- **Catalogo de permissoes estatico no pacote compartilhado**: chaves granulares por modulo
  (constantes versionadas), nao linhas de banco. `permission-group` armazena um array de chaves
  validas do catalogo. O editor de grupo (D8) le o catalogo do pacote; os guards o referenciam.
  Alternativa (tabela de permissoes no banco) descartada por complexidade desnecessaria.
- **Papel coarse + grupos granulares**: `role` define persona/area e baseline; grupos concedem
  capacidades extras. `super_admin` = total (plataforma, ignora escopo de organizacao); `admin_org` =
  total dentro da sua organizacao; `lider`/`colaborador` = apenas o que os grupos concedem. Efetivas
  = baseline do papel ∪ permissoes dos grupos.
- **Dois guards distintos**: `RolesGuard` le o claim `role` (sem banco) e cobre a maioria dos
  endpoints administrativos; `PermissionsGuard` resolve as efetivas (com leitura de banco dos grupos
  do usuario) e cobre os endpoints de capacidade delegada. `super_admin`/`admin_org` fazem
  short-circuit no `PermissionsGuard`. Trade-off: o `PermissionsGuard` adiciona uma leitura por
  requisicao protegida nesse subconjunto — aceitavel para um painel administrativo; cache pode ser
  adicionado depois.
- **Atribuicao via relacao `user_permission_group`**: many-to-many entre `user` (modulo `auth`) e
  `permission_group` (modulo `access`), gerida pelo `access`. `assign-groups-to-user` define o
  conjunto de grupos do usuario e valida que pertencem a mesma organizacao.
- **`GET /me/permissions`**: o frontend obtem o catalogo e as efetivas do usuario logado para dirigir
  o gating, evitando inflar o JWT com a lista completa (que ficaria obsoleta ao alterar grupos).
- **Bootstrap do Super Admin por seed idempotente**: credenciais via `.env`
  (`SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD`), na organizacao default da `003`. Reaproveita o
  `crypto.provider`/regras do `user` (`004`).
- **Skills**: config-new-module, module-aggregate, module-entity, module-repository, module-use-case,
  backend-prisma-sync-module, backend-prisma-repository, backend-nest-controller; o catalogo no shared
  segue o padrao do pacote (config-package-shared).

## Risks / Trade-offs

- [Tamanho da mudanca] → E a mais densa do plano. Esta agrupada por responsabilidade (catalogo →
  dominio → persistencia → guards → seed → frontend → telas) e pode ser dividida (mecanismo de
  autorizacao vs. telas D7/D8/D9) na execucao.
- [Leitura de banco no PermissionsGuard] → Limitada aos endpoints de capacidade delegada e com
  short-circuit para `super_admin`/`admin_org`; cache opcional posterior.
- [Permissoes efetivas obsoletas no client] → O frontend rebusca `GET /me/permissions` quando
  necessario; o gating de UI e conveniencia, a autorizacao real e no backend.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
