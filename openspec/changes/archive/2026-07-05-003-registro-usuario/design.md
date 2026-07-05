## Context

A base tecnica (`001`) e o design system (`002`) ja existem: monorepo Turbo, Prisma, pacote
compartilhado, tratamento de erros e base JWT no backend, estrutura/tema do frontend. Esta mudanca
entrega o registro de usuario.

**Backend**: modulo de negocio novo `auth`, com agregado `user`. O `user` **nao** tem organizacao,
papel ou status — apenas `name`, `email`, `password`. Persistencia via Prisma; criptografia via
`bcrypt`. O endpoint de registro e exposto por um controller simples que instancia o caso de uso no
corpo do metodo.

**Frontend**: a rota `app/(public)/join/page.tsx` ja existe (`001`) e agora segue o tema da `002`. A
URL base da API vem de `NEXT_PUBLIC_API_URL`. Endpoint: `POST {NEXT_PUBLIC_API_URL}/auth/register`,
corpo `{ name, email, password }`, retorna 201 sem corpo. Erros seguem `ApiErrorResponse`
(`shared/types/api-error.type.ts`) com `errors: string[]` de chaves i18n — cada item vira um toaster.
O `Toaster` (sonner) ja esta montado. O i18n fica em `shared/i18n/`.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Implementar o registro ponta a ponta (modulo `auth` → endpoint → tela `/join`).
- Persistir o usuario com senha criptografada (bcrypt), e-mail unico global; cobrir com testes.
- Mapear todos os erros de `POST /auth/register` no i18n (pt/en).
- Integrar o cadastro no frontend com toasters, sem redirecionar.

**Non-Goals:**
- Implementar o login funcional — apenas estrutura visual (e a `004`).
- Qualquer nocao de organizacao, papel global ou status de usuario.
- Autorizacao por quadro (owner/membro) — resolvida nas changes de dominio do kanban.

## Decisions

- **`user` minimo desde o inicio**: apenas `name`, `email`, `password`. Sem campos de tenant/papel —
  o TaskBoard Live nao tem multi-tenancy nem RBAC global; a autorizacao por quadro e resolvida por
  membership no agregado de quadro, nao no usuario.
- **E-mail unico global**: o login da `004` recebe `{ email, password }` e o e-mail precisa resolver
  um unico usuario.
- **Interfaces do modulo `auth` imutaveis pelas implementacoes**: o repositorio de `user` e
  `crypto.provider.ts` sao as portas; Prisma e bcrypt nao as alteram.
- **Implementacoes tecnicas diretas em `apps/backend/src/modules/auth`, sem subpasta**; **caso de uso
  instanciado no corpo do metodo do controller**; **`fetch` nativo no frontend**; **sem
  redirecionamento apos cadastro**.
- **Skills dedicadas como implementacao principal**: config-new-module, module-aggregate,
  module-entity, module-use-case, backend-prisma-sync-module, backend-prisma-repository,
  backend-provider-implementation, backend-nest-controller.

## Risks / Trade-offs

- [Codigos de erro do backend divergirem das chaves i18n] → Task dedicada para listar os codigos de
  `POST /auth/register` e garantir chaves pt/en antes da validacao manual.
- [Implementacao alterar a interface do modulo `auth`] → Restricao explicita: implementacoes nao
  alteram contratos; validar via revisao e build.
- [Skill indicada nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
