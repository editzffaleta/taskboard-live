<!-- TEMPLATE — design do registro de usuario. Placeholders: {{produto}}, {{namespace}}. -->

## Context

A base tecnica (`001`), o design system (`002`) e a fundacao multi-tenant (`003`) ja existem:
monorepo Turbo, Prisma, pacote compartilhado, tratamento de erros e base JWT no backend,
estrutura/tema do frontend e o agregado `organization` com a convencao de escopo por `organizationId`.
Esta mudanca entrega o registro de usuario.

**Backend**: modulo de negocio novo `auth`, com agregado `user`. O `user` e multi-tenant — pertence
a uma `organization` (`003`) e carrega `role` e `status`. Persistencia via Prisma; criptografia via
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
- Nascer multi-tenant: `user` vinculado a uma `organization`, com `role` e `status`.
- Persistir o usuario com senha criptografada (bcrypt), e-mail unico e FK de organizacao; cobrir com testes.
- Mapear todos os erros de `POST /auth/register` no i18n (pt/en).
- Integrar o cadastro no frontend com toasters, sem redirecionar.

**Non-Goals:**
- Implementar o login funcional — apenas estrutura visual (e a `005`).
- Aplicar regras de papel/permissao — `role` e so campo aqui; enforcement e a `006`.
- Registro por convite com organizacao especifica ou aprovacao (`status = pending`) — e a `008`.
- Selecao de organizacao na `/join` — o registro associa a organizacao default da `003`.

## Decisions

- **`user` multi-tenant desde o inicio**: incluir `organizationId`, `role` e `status` ja no model
  evita re-migracoes a cada mudanca seguinte. `role`/`status` sao apenas campos nesta fase.
- **E-mail unico global (nao por organizacao)**: o login da `005` recebe `{ email, password }` sem
  informar a organizacao, entao o e-mail precisa resolver um unico usuario. Alternativa (unico por
  organizacao) descartada por exigir desambiguacao de tenant no login. Consequencia aceita: um e-mail
  pertence a uma unica organizacao.
- **Organizacao default no registro**: sem sistema de convite ainda, o controller resolve a
  organizacao default (semeada na `003`) e a passa ao caso de uso. O `register-user` recebe
  `organizationId` como entrada (mantendo-o reutilizavel), de modo que a `008` apenas forneca a
  organizacao do convite.
- **Interfaces do modulo `auth` imutaveis pelas implementacoes**: o repositorio de `user` e
  `crypto.provider.ts` sao as portas; Prisma e bcrypt nao as alteram.
- **Implementacoes tecnicas diretas em `apps/backend/src/modules/auth`, sem subpasta**; **caso de uso
  instanciado no corpo do metodo do controller**; **`fetch` nativo no frontend**; **sem
  redirecionamento apos cadastro**.
- **Skills dedicadas como implementacao principal**: config-new-module, module-aggregate,
  module-entity, module-use-case, backend-prisma-sync-module, backend-prisma-repository,
  backend-nest-controller.

## Risks / Trade-offs

- [Codigos de erro do backend divergirem das chaves i18n] → Task dedicada para listar os codigos de
  `POST /auth/register` e garantir chaves pt/en antes da validacao manual.
- [Implementacao alterar a interface do modulo `auth`] → Restricao explicita: implementacoes nao
  alteram contratos; validar via revisao e build.
- [E-mail unico global limitar multi-organizacao por pessoa] → Aceito nesta fase; se a `025`/SSO
  exigir revisao, o ajuste sera tratado la.
- [Skill indicada nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
