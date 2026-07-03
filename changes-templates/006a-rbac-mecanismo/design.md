<!-- TEMPLATE — design do mecanismo RBAC (backend). Placeholders: {{produto}}, {{namespace}}. -->

## Context

A sessao autenticada ja expoe `role` e `organizationId` (`005`); a `003` definiu a convencao de
escopo por organizacao. Falta a autorizacao. O {{produto}} combina um **papel** coarse (na entidade
`user`, desde a `004`) com **grupos de permissao** granulares org-scoped. Esta mudanca implementa o
mecanismo completo no backend e semeia o Super Admin (adiamento da `003`). O consumo no frontend
(gating + telas D7/D8/D9) e a `006b`.

A base do backend ja tem guard global de JWT, `current-user`/`current-organization` decorators e
`public.decorator`. Os guards desta mudanca rodam **apos** o guard global de JWT.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Catalogo de permissoes compartilhado (backend + frontend).
- `permission-group` org-scoped com CRUD e atribuicao a usuarios.
- Resolucao de permissoes efetivas (baseline do papel ∪ grupos).
- Guards de papel e de permissao no backend + endpoints autorizados + `GET /me/permissions`.
- Bootstrap idempotente do Super Admin.

**Non-Goals:**
- Gating de sidebar/rotas e telas D7/D8/D9 — sao a `006b`.
- Catalogo editavel em runtime — e registro estatico versionado no codigo.
- Implementar os modulos de dominio que essas permissoes protegem — vem depois, fora do nucleo.
- Refresh de sessao / rotacao de token — fora do escopo (as `009a`/`009b` reforcam com MFA).

## Decisions

- **Catalogo estatico no pacote compartilhado**: chaves granulares por modulo (constantes
  versionadas), nao linhas de banco. `permission-group` armazena um array de chaves validas do
  catalogo; os guards o referenciam. Alternativa (tabela no banco) descartada por complexidade.
- **Papel coarse + grupos granulares**: `role` define persona e baseline; grupos concedem
  capacidades extras. Efetivas = baseline(role) ∪ permissoes(grupos).
- **Dois guards distintos**: `RolesGuard` le o claim `role` (sem banco); `PermissionsGuard` resolve
  efetivas (leitura dos grupos do usuario), com short-circuit para `super_admin`/`admin_org`.
  Trade-off: uma leitura extra por requisicao no subconjunto delegado — aceitavel; cache depois.
- **Atribuicao via `user_permission_group`**: many-to-many entre `user` (`auth`) e
  `permission_group` (`access`), gerida pelo `access`; `assign-groups-to-user` define o conjunto e
  valida mesma organizacao.
- **`GET /me/permissions`**: evita inflar o JWT com a lista de permissoes (ficaria obsoleta ao
  alterar grupos); o frontend rebusca quando precisar (`006b`).
- **Bootstrap do Super Admin por seed idempotente**: `SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD`
  via `.env`, na organizacao default da `003`, reaproveitando `crypto.provider`/regras do `user` (`004`).
- **Skills**: config-new-module, module-aggregate, module-entity, module-repository,
  module-use-case, backend-prisma-sync-module, backend-prisma-repository, backend-nest-controller;
  catalogo no shared segue config-package-shared.

## Risks / Trade-offs

- [Leitura de banco no PermissionsGuard] → Limitada aos endpoints delegados; short-circuit para
  admins; cache opcional posterior.
- [Split 006a/006b] → O contrato entre as duas e `GET /me/permissions` + o catalogo compartilhado;
  ambos ficam prontos e testados aqui, entao a 006b nao reabre o backend.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
