<!--
TEMPLATE DE CHANGE — 004-registro-usuario (primeiro modulo de dominio).
Substitua os placeholders e remova este comentario antes de usar.
Placeholders:
  {{produto}}    — nome do produto (ex.: AlphaBet)
  {{namespace}}  — scope npm SEM @ (ex.: alphabet) → @{{namespace}}
Os papeis (`colaborador|lider|admin_org|super_admin`) sao o default desta familia de produtos;
ajuste a lista se o seu projeto usar outros papeis.
-->


> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/registro-usuario/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Com a base tecnica (`001`), o design system (`002`) e a fundacao multi-tenant (`003`) prontos, o
{{produto}} precisa do primeiro fluxo de negocio: registrar usuario. No {{produto}} o usuario
**pertence a uma organizacao** e carrega um **papel** — entao o agregado `user` ja nasce multi-tenant
e preparado para o RBAC (`006`) e para o fluxo de convite/aprovacao (`008`). Esta mudanca entrega o
registro ponta a ponta, do modulo `auth` a tela `/join`.

## What Changes

- Criar o modulo de negocio `auth` com o agregado `user`.
- Implementar a entidade `user` com `name`, `email`, `password` e os campos multi-tenant/identidade:
  `organizationId` (vinculo com a organizacao da `003`), `role` (`colaborador|lider|admin_org|super_admin`,
  default `colaborador`) e `status` (`active|inactive|pending`, default `active`). `role` e `status`
  entram **apenas como campos**: a aplicacao de papeis/permissoes e a `006` e o uso de `pending` no
  fluxo de aprovacao e a `008`.
- Definir a interface `crypto.provider.ts` (criptografar e comparar senhas) no modulo `auth`.
- Implementar o caso de uso `register-user`: validar entrada, validar que a organizacao existe,
  validar unicidade do e-mail (**global**, para o login da `005` resolver um unico usuario),
  criptografar a senha, criar o `user` (role e status default) e persistir; retorno `void`. Cobrir
  com testes unitarios reaproveitando fakes.
- Sincronizar o model `user` no Prisma (migration), com FK para `organization` e e-mail unico, e
  implementar o repositorio Prisma (`findById`, `findByEmail`), seguindo a convencao de escopo por
  `organizationId` da `003`.
- Instalar `bcrypt` e implementar o `crypto.provider` com bcrypt no backend.
- Expor `POST /auth/register` via `auth.controller.ts`: resolver a organizacao **default** (semeada
  na `003`) e passar `organizationId` ao caso de uso, instanciado no corpo do metodo; criar testes
  de integracao HTTP (`auth.integration.http`). O registro por convite com organizacao especifica e a `008`.
- Mapear no i18n (pt/en) todos os codigos de erro de `POST /auth/register`.
- No frontend, transformar `app/(public)/join/page.tsx` em um componente com alternancia
  `register`/`login` (alinhado ao design da `002`), integrar o cadastro ao backend (toasters de
  sucesso/erro, sem redirecionar, sem selecao de organizacao) e montar o login apenas visualmente —
  o login funcional e a `005`.

## Capabilities

### New Capabilities
- `registro-usuario`: Fluxo completo de registro de usuario no {{produto}} — modulo `auth` com
  agregado `user` multi-tenant (vinculo com organizacao, papel e status), caso de uso `register-user`
  com testes unitarios, persistencia Prisma com e-mail unico e FK de organizacao, endpoint
  `POST /auth/register` (senha criptografada via bcrypt, associado a organizacao default),
  mapeamento de erros no i18n e tela `/join` com cadastro integrado e login visual.

### Modified Capabilities
<!-- Nenhuma. A multi-tenancy (003) e consumida, nao modificada. -->

## Impact

- **Backend**: novo modulo `auth` (agregado `user`, entidade, `crypto.provider`, `register-user` +
  testes unitarios), repositorio Prisma e provider bcrypt em `apps/backend/src/modules/auth`,
  `auth.controller.ts`, model `user` no Prisma + migration (FK `organization`, e-mail unico), testes
  `auth.integration.http`.
- **Frontend**: `app/(public)/join/page.tsx` (alternancia cadastro/login alinhada ao design da `002`),
  integracao via `fetch` com `POST {NEXT_PUBLIC_API_URL}/auth/register`, toasters via sonner, chaves
  i18n em `messages.pt.ts`/`messages.en.ts`.
- **Dependencias**: biblioteca `bcrypt` no backend; agregado `organization` da `003` (resolucao da default).
- **Contratos**: as interfaces do modulo `auth` (repositorio de `user` e `crypto.provider.ts`) nao
  podem ser alteradas pelas implementacoes.
- **Preparado para o futuro**: `role` e consumido pelo RBAC na `006`; `status = pending` e o registro
  por convite scoped sao usados pelo fluxo de aprovacao na `008`.
