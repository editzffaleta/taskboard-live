> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `001` (bootstrap/JWT), `004` (login/sessão), `021` (excluir conta — motivo
> do bug). **Não faça:** refresh token, blacklist de tokens, sessão em banco — só checar
> existência do usuário no `validate()` da estratégia. Nenhuma mudança de UI/frontend.
> **Princípio:** o fix é 100% backend, na camada de autenticação; domínio e contrato de
> login/emissão de token (`004`) não mudam.

## 1. Back-end

- [x] 1.1 Tornar `JwtStrategy.validate` (`apps/backend/src/shared/auth/jwt.strategy.ts`)
  assíncrono: injetar `PrismaUserRepository` no construtor, chamar
  `userRepository.findById(payload.sub)` e, se retornar `null`, lançar `UnauthorizedException`
  (`@nestjs/common`) antes de mapear o `AuthenticatedUser`. Se existir, seguir mapeando via
  `mapJwtPayloadToAuthenticatedUser` como hoje.
  - **Aceite:** `validate` retorna `Promise<AuthenticatedUser>`; usuário existente segue
    autenticando normalmente; usuário inexistente lança `UnauthorizedException` antes de qualquer
    controller rodar.
  - **Pré:** `004` (estratégia/guard já existentes).
  - **Guardrail:** não adicionar cache, refresh token, blacklist ou sessão em banco — só a
    checagem de existência via `findById`.
  > ✅ 2026-07-08 07:55 — `validate` agora é `async`, injeta `PrismaUserRepository` (mesmo
  > provider concreto usado em `member-directory.provider.ts`/`auth.controller.ts`, sem token
  > de interface) e chama `findById(payload.sub)`; lança `UnauthorizedException('Sessão
  > inválida')` se `null`. Arquivo: `apps/backend/src/shared/auth/jwt.strategy.ts`.

- [x] 1.2 Ajustar o wiring: `JwtAuthModule` (`apps/backend/src/shared/auth/jwt-auth.module.ts`)
  passa a `imports: [..., AuthModule]` (`apps/backend/src/modules/auth/auth.module.ts`), que já
  exporta `PrismaUserRepository`, permitindo a injeção da task 1.1.
  - **Aceite:** aplicação sobe sem erro de dependência circular ou provider não encontrado;
    `PrismaUserRepository` é injetável dentro de `JwtStrategy`.
  - **Pré:** confirmar (por leitura, não suposição) que `AuthModule` não importa `JwtAuthModule`
    em nenhum ponto da cadeia — se importar, pare e ajuste o `design.md` antes de prosseguir.
  > ✅ 2026-07-08 07:55 — Confirmado por leitura de `auth.module.ts` (importa apenas `DbModule` e
  > `forwardRef(() => BoardModule)`) e `board.module.ts` (importa `AuthModule` via `forwardRef`,
  > nunca `JwtAuthModule`): sem ciclo. `JwtAuthModule` passou a `imports: [PassportModule,
  > AuthModule, JwtModule...]`. App sobe normalmente (boot 200 confirmado na task 2.3).

- [x] 1.3 (Opcional, defensivo) `ApiExceptionFilter`
  (`apps/backend/src/shared/errors/api-exception.filter.ts`): mapear
  `PrismaClientKnownRequestError` com `code === 'P2003'` (violação de FK) para uma resposta
  tratada (ex.: 400, `ApiErrorResponse` simples) em vez de vazar 500 cru, como rede de segurança
  adicional — sem lógica de negócio no filtro.
  - **Aceite:** uma violação de FK simulada em teste não retorna mais `INTERNAL_SERVER_ERROR`
    genérico de 500 sem contexto.
  - **Guardrail:** manter simples; não interpretar outros códigos de erro do Prisma nesta change.
  > ✅ 2026-07-08 07:56 — Feito como rede de segurança adicional: `ApiExceptionFilter` mapeia
  > `Prisma.PrismaClientKnownRequestError` com `code === 'P2003'` para 400 (`REFERENCIA_INVALIDA`)
  > em vez de 500 cru. Arquivo: `apps/backend/src/shared/errors/api-exception.filter.ts`.

- [x] 1.4 Testes de integração/unitários em `apps/backend/src/shared/auth/` (ou local equivalente
  já usado pela suíte de auth): (a) token com `sub` de usuário inexistente → 401; (b) token de
  usuário existente → autentica e segue normal (200 na rota protegida); (c) se a task 1.3 for
  feita, teste dedicado para o mapeamento de FK.
  - **Aceite:** os três cenários cobertos e verdes.
  > ✅ 2026-07-08 07:56 — `apps/backend/src/shared/auth/jwt.strategy.spec.ts` (2 testes: sub
  > inexistente → `UnauthorizedException`; sub existente → autentica normalmente) e
  > `apps/backend/src/shared/errors/api-exception.filter.spec.ts` (1 teste: FK P2003 → 400). Todos
  > verdes (`npx jest jwt.strategy` e `npx jest api-exception`).

- [x] 1.5 Rodar a suíte completa do backend (`npx jest` em `apps/backend`) para garantir que
  nenhum teste de integração/e2e existente regrediu ao assumir um `sub` válido sem usuário real
  no banco de dados de teste.
  - **Aceite:** suíte 100% verde; qualquer teste quebrado por essa mudança é ajustado para criar
    o usuário correspondente antes de gerar o token, não para contornar a checagem.
  > ✅ 2026-07-08 07:57 — `npx jest` na raiz de `apps/backend`: 12 suites / 43 testes, 100%
  > verde. Nenhum teste existente assumia `sub` sem usuário real; nenhum ajuste de mock foi
  > necessário além dos testes novos da task 1.4.

## 2. Verificação

- [x] 2.1 Rodar `npx tsc --noEmit` em `apps/backend`.
  - **Aceite:** typecheck limpo.
  > ✅ 2026-07-08 07:58 — `npx tsc --noEmit` em `apps/backend`: sem erros.

- [x] 2.2 Rodar `npm test` (workspace backend) e `npm run lint --workspace=@taskboard/backend`
  (ou equivalente do projeto).
  - **Aceite:** testes e lint verdes.
  > ✅ 2026-07-08 07:58 — `npx jest` (12 suites / 43 testes) e
  > `npx turbo run lint --filter=@taskboard/backend` ambos verdes, sem warnings/erros.

- [x] 2.3 Validação manual (curl) do fluxo fim a fim: login → token válido; excluir o usuário
  (ou usar diretamente um token com `sub` inexistente) → chamar uma rota protegida (ex.: criar
  quadro) → confirmar resposta `401`, não `500`.
  - **Aceite:** resposta 401 registrada na evidência (comando e status code), confirmando que o
    bug original (500 em `boards_ownerId_fkey`) não ocorre mais.
  > ✅ 2026-07-08 07:53 — Backend recompilado e reiniciado (`nest start --watch`, boot 200 em
  > `GET /`). Fluxo: `POST /auth/register` + `POST /auth/login` → token válido; `POST /boards`
  > com esse token → `201` (quadro criado, `ownerId` correto); `DELETE /auth/me` com o mesmo
  > token → `204` (conta excluída); reuso do MESMO token em `POST /boards` → **401**
  > `{"errors":["Sessão inválida"]}` (antes: 500 `boards_ownerId_fkey`); `GET /boards` com o
  > mesmo token → também `401`. Bug original confirmado corrigido.

- [x] 2.4 Confirmar no `design.md`/evidência que o comportamento do cliente é o esperado: o
  frontend já desloga ao receber 401 (herdado da `004`) — nenhuma mudança de frontend é
  necessária nesta change.
  - **Aceite:** confirmação registrada; nenhum arquivo de `apps/frontend` tocado.
  > ✅ 2026-07-08 07:59 — Confirmado: nenhum arquivo de `apps/frontend` foi tocado nesta change.
  > O guard de auth do frontend (herdado da `004`) já trata 401 fazendo logout; o comportamento
  > passa a disparar mais cedo (na primeira requisição autenticada após exclusão de conta), sem
  > necessidade de mudança de UI.
