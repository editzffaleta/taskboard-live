<!-- TEMPLATE — tasks do registro de usuario. Checkboxes vazios; marque com evidencia.
Cada task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `003` (multi-tenancy). **Nao faca:** login funcional (e a `005`); enforcement de
> papel/permissao (e a `006`); convite/aprovacao com `status = pending` (e a `008`); selecao de
> organizacao na `/join` (o registro usa a organizacao default).

## 1. Modulo auth (dominio)

- [ ] 1.1 Criar o modulo `auth` com a skill [config-new-module](../../../.claude/skills/config-new-module) usando `@{{namespace}}`.
  - **Aceite:** `modules/auth`, `apps/backend/src/modules/auth` (module+controller registrados no AppModule) e scaffold frontend; `build`/teste do workspace verdes. **Conferir:** o `AuthModule` realmente foi registrado no `AppModule` (se o script nao registrar, registrar manualmente).
- [ ] 1.2 Criar o agregado `user` com a skill [module-aggregate](../../../.claude/skills/module-aggregate) (mode `example`, so um caso de uso inicial).
  - **Aceite:** `modules/auth/src/user/{model,provider,usecase}`, contrato `UserRepository` e `src/index.ts` com `./user`.
- [ ] 1.3 Implementar a entidade `user` com a skill [module-entity](../../../.claude/skills/module-entity): `name` (person name), `email` (email), `password` (hash pass), `organizationId` (required, uuid), `role` (required, in `colaborador|lider|admin_org|super_admin`, default `colaborador`), `status` (required, in `active|inactive|pending`, default `active`). Registrar que `role`/`status` sao **apenas campos** aqui.
  - **Aceite:** entidade com validacao lazy + regras compartilhadas + defaults no construtor; teste com **100% de cobertura**; evidencia notando enforcement de papeis = `006`, `pending` = `008`.
- [ ] 1.4 Criar a interface `crypto.provider.ts` no provider do `user` (`hash(plain)` e `compare(plain, hashed)`); adicionar `findByEmail(email)` ao contrato `UserRepository`.
  - **Aceite:** `CryptoProvider` e `findByEmail` no contrato (porta), exportados nos barrels.
- [ ] 1.5 Implementar `register-user` com a skill [module-use-case](../../../.claude/skills/module-use-case): validar entrada, validar organizacao (via repo de `organization` da `003`), validar unicidade global do e-mail (`findByEmail`), criptografar a senha, criar o `user` (defaults) e persistir; retorno `void`.
  - **Aceite:** `RegisterUser implements UseCase<RegisterUserIn, void>`; organizacao inexistente → `NotFoundError` (`user.organization.not.found`); e-mail duplicado → `DomainError` 409 (`user.email.already.registered`); senha via `CryptoProvider.hash`.
- [ ] 1.6 Cobrir `register-user` com testes unitarios usando fakes (`FakeUserRepository`, `FakeCryptoProvider`, `FakeOrganizationRepository`), incluindo e-mail duplicado e organizacao inexistente.
  - **Aceite:** fakes em `test/mock/`; teste com caminho feliz, validate, senha fraca/comum, entrada invalida, org inexistente e duplicado; **100% de cobertura** em `register-user`.

## 2. Back-end (persistencia + endpoint)

- [ ] 2.1 Sincronizar o model `user` com a skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module): FK `organizationId` → `organization`, e-mail unico **global** e os campos `role`/`status`.
  - **Aceite:** `auth.model.prisma` com `User` → `users`, FK + back-relation no `Organization`, `email @unique`, defaults; migration aplicada (sem operacao destrutiva); `prisma:generate` ok.
- [ ] 2.2 Implementar o repositorio Prisma de `user` em `apps/backend/src/modules/auth` com a skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository): `findById`, `findByEmail` (global) e `findPage` escopado por `organizationId` (convencao da `003`), sem alterar a interface.
  - **Aceite:** `PrismaUserRepository implements UserRepository`; `auth.module.ts` com `DbModule` e a classe registrada; `tsc --noEmit` ok.
- [ ] 2.3 Instalar `bcrypt` e implementar `crypto.provider.ts` em `apps/backend/src/modules/auth` usando bcrypt, sem alterar a interface.
  - **Aceite:** `bcrypt` + `@types/bcrypt` instalados; `BcryptCryptoProvider implements CryptoProvider` (salt rounds 10) registrado no `AuthModule`.
- [ ] 2.4 Criar `auth.controller.ts` com a skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller) expondo `POST /auth/register`: resolver a organizacao default (`findBySlug('default')`), instanciar `register-user` no corpo do metodo injetando repo + crypto, e repassar o `organizationId` resolvido.
  - **Aceite:** rota `@Public()` `@HttpCode(201)`; corpo `{ name, email, password }` (sem `organizationId` exposto); `AuthModule` importa `TenancyModule`; 404 se a org default faltar.
- [ ] 2.5 Criar `auth.integration.http` (Rest Client) cobrindo sucesso (201), e-mail duplicado (409) e dados invalidos/senha fraca (422). Validar manualmente com o backend rodando.
  - **Aceite:** cenarios cobertos; validacao manual: 201 sem corpo, 409 e 422 com `ApiErrorResponse`; usuario persistido com hash e org default (confirmar no banco).

## 3. Mapeamento de erros e i18n

- [ ] 3.1 Listar na evidencia todos os codigos de erro de `POST /auth/register` (ler `auth.integration.http` e o `api-exception.filter.ts`).
  - **Aceite:** lista completa dos codigos em `errors[]` (422 de validacao, 409 duplicado, 404 org, 500 fallback, e defensivos da entidade).
- [ ] 3.2 Garantir que todos os codigos estao em `messages.pt.ts` e `messages.en.ts` (adicionar as ausentes, no padrao existente, incluindo `INTERNAL_SERVER_ERROR`).
  - **Aceite:** todas as chaves presentes em pt e en.

## 4. Front-end

- [ ] 4.1 Transformar `app/(public)/join/page.tsx` em componente com estado `mode` (`register|login`) que alterna entre os formularios, seguindo o tema da `002`.
  - **Aceite:** client component com alternancia; `key` distinta por modo (evita warning controlled/uncontrolled).
- [ ] 4.2 Implementar o formulario de **cadastro** (`name`, `email`, `password`, sem organizacao) chamando `POST {NEXT_PUBLIC_API_URL}/auth/register`: sucesso (201) → `toast.success`; erro → iterar `errors[]` com um `toast.error(getMessage(code))` por item; **nao redirecionar**.
  - **Aceite:** `fetch` nativo; toasts de sucesso/erro por item; fallback para corpo ilegivel/erro de rede; botao desabilitado durante o submit.
- [ ] 4.3 Implementar o formulario de **login** (`email`, `password`) apenas visual (handler nao chama endpoint — login funcional = `005`).
  - **Aceite:** campos + botao; handler so `preventDefault()` com comentario apontando a `005`.
- [ ] 4.4 Validar manualmente no navegador: alternancia; cadastro valido → sucesso; e-mail duplicado → 409; senha fraca → 422; multiplos campos invalidos → um toast por erro.
  - **Aceite:** evidencia dos 5 casos com o tema da `002` aplicado.

## 5. Verificacao

- [ ] 5.1 Rodar `npx tsc --noEmit` em `apps/backend` e `apps/frontend`; suite completa verde; checagem HTTP final (`POST /auth/register` → 201).
  - **Aceite:** `tsc` limpo nos dois apps; testes verdes; `prisma migrate status` em dia; 201 confirmado.
