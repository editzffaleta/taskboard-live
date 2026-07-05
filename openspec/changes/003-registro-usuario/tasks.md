> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `001`, `002`. **Nao faca:** login funcional (e a `004`); qualquer campo ou
> conceito de organizacao/papel/status no `user`; selecao de organizacao na `/join` (nao existe
> organizacao no TaskBoard Live).

## 1. Modulo auth (dominio)

- [ ] 1.1 Criar o modulo `auth` com a skill [config-new-module](../../../.claude/skills/config-new-module) usando `@taskboard`.
  - **Pre:** `001` e `002` concluidas (monorepo e design system disponiveis).
  - **Aceite:** `modules/auth`, `apps/backend/src/modules/auth` (module+controller registrados no AppModule) e scaffold frontend; `build`/teste do workspace verdes. **Conferir:** o `AuthModule` realmente foi registrado no `AppModule` (se o script nao registrar, registrar manualmente).
- [ ] 1.2 Criar o agregado `user` com a skill [module-aggregate](../../../.claude/skills/module-aggregate) (mode `example`, so um caso de uso inicial).
  - **Aceite:** `modules/auth/src/user/{model,provider,usecase}`, contrato `UserRepository` e `src/index.ts` com `./user`.
- [ ] 1.3 Implementar a entidade `user` com a skill [module-entity](../../../.claude/skills/module-entity): **apenas** `name` (person name), `email` (email), `password` (hash pass). Nao faca: nenhum campo de organizacao/papel/status.
  - **Aceite:** entidade com validacao lazy + regras compartilhadas no construtor; teste com **100% de cobertura**; evidencia confirmando que a entidade nao tem nenhum campo alem de `name`/`email`/`password`.
- [ ] 1.4 Criar a interface `crypto.provider.ts` no provider do `user` (`hash(plain)` e `compare(plain, hashed)`); adicionar `findByEmail(email)` ao contrato `UserRepository`.
  - **Aceite:** `CryptoProvider` e `findByEmail` no contrato (porta), exportados nos barrels.
- [ ] 1.5 Implementar `register-user` com a skill [module-use-case](../../../.claude/skills/module-use-case): validar entrada, validar unicidade global do e-mail (`findByEmail`), criptografar a senha, criar o `user` e persistir; retorno `void`.
  - **Aceite:** `RegisterUser implements UseCase<RegisterUserIn, void>`; e-mail duplicado → `DomainError` 409 (`user.email.already.registered`); senha via `CryptoProvider.hash`.
- [ ] 1.6 Cobrir `register-user` com testes unitarios usando fakes (`FakeUserRepository`, `FakeCryptoProvider`), incluindo e-mail duplicado.
  - **Aceite:** fakes em `test/mock/`; teste com caminho feliz, validate, senha fraca/comum, entrada invalida e duplicado; **100% de cobertura** em `register-user`.

## 2. Back-end (persistencia + endpoint)

- [ ] 2.1 Sincronizar o model `user` com a skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module): apenas `name`, `email` (unico global), `password`.
  - **Aceite:** `auth.model.prisma` com `User` → `users`, `email @unique`, sem nenhuma FK/coluna de organizacao/papel/status; migration aplicada (sem operacao destrutiva); `prisma:generate` ok.
- [ ] 2.2 Implementar o repositorio Prisma de `user` em `apps/backend/src/modules/auth` com a skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository): `findById`, `findByEmail`, sem alterar a interface.
  - **Aceite:** `PrismaUserRepository implements UserRepository`; `auth.module.ts` com `DbModule` e a classe registrada; `tsc --noEmit` ok.
- [ ] 2.3 Instalar `bcrypt` e implementar `crypto.provider.ts` em `apps/backend/src/modules/auth` usando bcrypt, com a skill [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation), sem alterar a interface.
  - **Aceite:** `bcrypt` + `@types/bcrypt` instalados; `BcryptCryptoProvider implements CryptoProvider` (salt rounds 10) registrado no `AuthModule`.
- [ ] 2.4 Criar `auth.controller.ts` com a skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller) expondo `POST /auth/register`: instanciar `register-user` no corpo do metodo injetando repo + crypto.
  - **Aceite:** rota `@Public()` `@HttpCode(201)`; corpo `{ name, email, password }`.
- [ ] 2.5 Criar `auth.integration.http` (Rest Client) cobrindo sucesso (201), e-mail duplicado (409) e dados invalidos/senha fraca (422). Validar manualmente com o backend rodando.
  - **Aceite:** cenarios cobertos; validacao manual: 201 sem corpo, 409 e 422 com `ApiErrorResponse`; usuario persistido com hash (confirmar no banco).

## 3. Mapeamento de erros e i18n

- [ ] 3.1 Listar na evidencia todos os codigos de erro de `POST /auth/register` (ler `auth.integration.http` e o `api-exception.filter.ts`).
  - **Aceite:** lista completa dos codigos em `errors[]` (422 de validacao, 409 duplicado, 500 fallback, e defensivos da entidade).
- [ ] 3.2 Garantir que todos os codigos estao em `messages.pt.ts` e `messages.en.ts` (adicionar as ausentes, no padrao existente, incluindo `INTERNAL_SERVER_ERROR`).
  - **Aceite:** todas as chaves presentes em pt e en.

## 4. Front-end

- [ ] 4.1 Transformar `app/(public)/join/page.tsx` em componente com estado `mode` (`register|login`) que alterna entre os formularios, seguindo o tema da `002`.
  - **Aceite:** client component com alternancia; `key` distinta por modo (evita warning controlled/uncontrolled).
- [ ] 4.2 Implementar o formulario de **cadastro** (`name`, `email`, `password`) chamando `POST {NEXT_PUBLIC_API_URL}/auth/register`: sucesso (201) → `toast.success`; erro → iterar `errors[]` com um `toast.error(getMessage(code))` por item; **nao redirecionar**.
  - **Aceite:** `fetch` nativo; toasts de sucesso/erro por item; fallback para corpo ilegivel/erro de rede; botao desabilitado durante o submit.
- [ ] 4.3 Implementar o formulario de **login** (`email`, `password`) apenas visual (handler nao chama endpoint — login funcional = `004`).
  - **Aceite:** campos + botao; handler so `preventDefault()` com comentario apontando a `004`.
- [ ] 4.4 Validar manualmente no navegador: alternancia; cadastro valido → sucesso; e-mail duplicado → 409; senha fraca → 422; multiplos campos invalidos → um toast por erro.
  - **Aceite:** evidencia dos 5 casos com o tema da `002` aplicado.

## 5. Verificacao

- [ ] 5.1 Rodar `npx tsc --noEmit` em `apps/backend` e `apps/frontend`; suite completa verde; checagem HTTP final (`POST /auth/register` → 201).
  - **Aceite:** `tsc` limpo nos dois apps; testes verdes; `prisma migrate status` em dia; 201 confirmado.
