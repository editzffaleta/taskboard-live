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

Com a base tecnica (`001`) e o design system (`002`) prontos, o TaskBoard Live precisa do primeiro
fluxo de negocio: registrar usuario. O TaskBoard Live nao tem organizacao nem papel global — o
usuario e simplesmente `{ id, name, email, password }`, e a autorizacao por quadro (owner/membro)
sera resolvida nas changes de dominio do kanban. Esta mudanca entrega o registro ponta a ponta, do
modulo `auth` a tela `/join`.

## What Changes

- Criar o modulo de negocio `auth` com o agregado `user`.
- Implementar a entidade `user` com apenas `name`, `email` e `password`. Sem `organizationId`, sem
  `role`, sem `status`.
- Definir a interface `crypto.provider.ts` (criptografar e comparar senhas) no modulo `auth`.
- Implementar o caso de uso `register-user`: validar entrada, validar unicidade **global** do e-mail,
  criptografar a senha, criar o `user` e persistir; retorno `void`. Cobrir com testes unitarios
  reaproveitando fakes.
- Sincronizar o model `user` no Prisma (migration), com e-mail unico, e implementar o repositorio
  Prisma (`findById`, `findByEmail`).
- Instalar `bcrypt` e implementar o `crypto.provider` com bcrypt no backend.
- Expor `POST /auth/register` via `auth.controller.ts`, instanciando o caso de uso no corpo do
  metodo; criar testes de integracao HTTP (`auth.integration.http`).
- Mapear no i18n (pt/en) todos os codigos de erro de `POST /auth/register`.
- No frontend, transformar `app/(public)/join/page.tsx` em um componente com alternancia
  `register`/`login` (alinhado ao design da `002`), integrar o cadastro ao backend (toasters de
  sucesso/erro, sem redirecionar) e montar o login apenas visualmente — o login funcional e a `004`.

## Capabilities

### New Capabilities
- `registro-usuario`: Fluxo completo de registro de usuario no TaskBoard Live — modulo `auth` com
  agregado `user` simples (`name`, `email`, `password`, sem organizacao/papel/status), caso de uso
  `register-user` com testes unitarios, persistencia Prisma com e-mail unico global, endpoint
  `POST /auth/register` (senha criptografada via bcrypt), mapeamento de erros no i18n e tela `/join`
  com cadastro integrado e login visual.

### Modified Capabilities
<!-- Nenhuma. -->

## Impact

- **Backend**: novo modulo `auth` (agregado `user`, entidade, `crypto.provider`, `register-user` +
  testes unitarios), repositorio Prisma e provider bcrypt em `apps/backend/src/modules/auth`,
  `auth.controller.ts`, model `user` no Prisma + migration (e-mail unico), testes
  `auth.integration.http`.
- **Frontend**: `app/(public)/join/page.tsx` (alternancia cadastro/login alinhada ao design da `002`),
  integracao via `fetch` com `POST {NEXT_PUBLIC_API_URL}/auth/register`, toasters via sonner, chaves
  i18n em `messages.pt.ts`/`messages.en.ts`.
- **Dependencias**: biblioteca `bcrypt` no backend.
- **Contratos**: as interfaces do modulo `auth` (repositorio de `user` e `crypto.provider.ts`) nao
  podem ser alteradas pelas implementacoes.
- **Fora de escopo**: qualquer papel global, status de usuario, organizacao ou tenant. Autorizacao
  por quadro (owner/membro) e resolvida nas changes de dominio do kanban.
