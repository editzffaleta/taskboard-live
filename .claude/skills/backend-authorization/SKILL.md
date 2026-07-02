---
name: backend-authorization
description: Adiciona autorizacao baseada em papeis e permissoes (RBAC) no backend NestJS, por cima da autenticacao JWT ja existente — decorators @Roles/@Permissions, guard default-deny que le o usuario autenticado, e protecao por rota — sem reimplementar autenticacao e reaproveitando a infraestrutura compartilhada do projeto.
compatibility: claude-code, opencode
---

# Backend Authorization (RBAC)

Use esta skill quando o pedido for proteger endpoints por **papel** (role) ou
**permissao**, ou seja, controlar o que um usuario **autenticado** pode fazer.

Esta skill **nao** faz autenticacao (login, emissao de JWT, hash de senha). Isso
e responsabilidade do `spec-backend-auth-basic` + `backend-nest-config`. O foco
aqui e somente a camada de **autorizacao**:

- decorator `@Roles(...)` e (opcional) `@Permissions(...)`
- `RolesGuard` / `PermissionsGuard` com comportamento **default-deny**
- leitura do usuario autenticado ja resolvido pela auth (JWT)
- protecao por rota (controller/handler), reaproveitando o guard de auth
- diferenciacao clara entre rota publica, autenticada e autorizada

## Pre-requisitos (verificar antes)

A autorizacao depende da autenticacao ja montada. Confirme que existem:

- o AuthGuard JWT e o decorator de usuario autenticado do `backend-nest-config`
  (ex.: `CurrentUser`, `AuthGuard('jwt')`/guard global, tipo de request autenticado)
- um usuario autenticado que carrega papeis/permissoes (em claim do JWT **ou**
  carregado do banco). Descubra qual e a fonte real antes de implementar.

Se a autenticacao basica nao existir, pare e oriente rodar `spec-backend-auth-basic`
primeiro.

## Entradas obrigatorias

1. modelo de autorizacao: **roles**, **permissions** ou ambos
2. lista inicial de papeis e/ou permissoes (ex.: `admin`, `member`; `user:read`, `user:write`)
3. fonte dos papeis/permissoes do usuario: **claim do JWT** ou **consulta ao banco**
4. quais rotas/recursos devem ser protegidos e por qual papel/permissao

Entradas opcionais:

- estrategia de combinacao (exigir **todos** os papeis vs **qualquer um**)
- papel "super" que ignora a checagem (ex.: `admin`)
- mensagem/erro de negacao no padrao `ApiErrorResponse`

## Referencias obrigatorias

Antes de gerar qualquer codigo, ler obrigatoriamente:

1. a infraestrutura compartilhada do Nest: guard de auth, decorator de usuario e
   tipo de request autenticado (do `backend-nest-config`, normalmente em
   `apps/backend/src/shared/**` ou equivalente)
2. `apps/backend/src/modules/auth/auth.module.ts` e o controller de auth
3. o provider/estrategia de JWT, para saber quais claims existem no token
4. a entidade de usuario do dominio, ex. `modules/auth/src/user/model/user.entity.ts`,
   para saber se ha campo de papel/permissao
5. `packages/shared/src/error/` (erros de dominio / `ApiErrorResponse`)
6. um controller real, ex. `apps/backend/src/modules/auth/auth.controller.ts`, para
   casar naming e estilo

Tambem leia os few-shots desta skill:

- `references/few-shots/roles.decorator.example.ts`
- `references/few-shots/roles.guard.example.ts`
- `references/few-shots/protected-controller.example.ts`
- `references/rbac-checklist.md`

## Onde a fonte de papeis mora (decida primeiro)

- **Claim no JWT** (mais simples e stateless): os papeis vao no payload do token
  na emissao (login). O guard le `request.user.roles` direto. Exige que o login
  ja inclua os papeis no token — se nao incluir, ajuste a emissao do JWT (na
  skill de auth, nao aqui) ou use a opcao de banco.
- **Consulta ao banco** (mais flexivel, permite revogacao imediata): o guard usa
  o `id` do usuario autenticado e busca papeis/permissoes via um provider. Mais
  poder, mais custo por request.

Documente a escolha e seja coerente em toda a skill.

## Estrutura obrigatoria

Seguir o estilo do `backend-nest-config`. Artefatos minimos:

1. **Decorator de metadata** — `@Roles(...roles)` via `SetMetadata` com uma chave
   estavel (ex.: `ROLES_KEY`). Opcional `@Permissions(...perms)`.
2. **Guard** — `RolesGuard` (e/ou `PermissionsGuard`) que:
   - le os papeis exigidos via `Reflector` (handler + classe);
   - **se nao houver metadata de papel, e rota apenas autenticada** (a checagem de
     RBAC nao se aplica) — nao confunda com publica;
   - obtem o usuario de `request.user` (ja populado pela auth);
   - aplica **default-deny**: sem usuario, ou sem papel suficiente, nega;
   - lanca erro no padrao do projeto (ex.: `ForbiddenException`/`ApiErrorResponse`).
3. **Registro** — global via `APP_GUARD` (rodando **depois** do AuthGuard) ou por
   controller com `@UseGuards(...)`. Mantenha a ordem: autentica -> autoriza.
4. **Tipos** — papeis/permissoes como union/enum estavel e tipado.

Ver `references/few-shots/` para o formato exato.

## Regras de implementacao

- Nao reimplementar autenticacao; **compor** com o guard de auth existente.
- O guard de RBAC roda **apos** a autenticacao (usuario ja em `request.user`).
- **Default-deny**: na duvida, nega. Nunca "default-allow".
- Rota sem `@Roles` = apenas autenticada (nao e o mesmo que publica/`@Public`).
- Combinacao padrao: exigir **qualquer um** dos papeis listados, salvo pedido
  explicito de exigir todos.
- Erros de negacao no padrao `ApiErrorResponse` do projeto.
- Papeis/permissoes tipados; nada de string solta espalhada.

## Regras dos testes

Cobrir o guard (alvo de coverage alto):

1. acesso permitido quando o usuario tem o papel exigido
2. acesso negado quando o usuario nao tem o papel (default-deny)
3. acesso negado quando nao ha usuario em `request.user`
4. rota sem metadata de papel: comportamento esperado (passa por ser apenas autenticada)
5. combinacao "qualquer um" vs "todos", quando suportada
6. papel "super" ignora a checagem, quando configurado
7. decorator: metadata setada corretamente (ler via `Reflector` em teste)

## Workflow recomendado

1. Confirmar que a autenticacao existe (guard JWT + usuario autenticado).
2. Ler as referencias obrigatorias e decidir a fonte de papeis (JWT vs banco).
3. Criar o(s) decorator(s) de metadata e os tipos de papel/permissao.
4. Criar o(s) guard(s) com default-deny, lendo `request.user`.
5. Registrar (global `APP_GUARD` apos o AuthGuard, ou por controller).
6. Aplicar `@Roles`/`@Permissions` nas rotas alvo.
7. Se a fonte for JWT e o token ainda nao traz os papeis, ajustar a emissao na
   skill de auth (nao aqui).
8. Criar testes do guard e do decorator.
9. Rodar build e testes do backend.

## Comandos de verificacao

```bash
npm run build --workspace <workspace-do-backend>
npm run test  --workspace <workspace-do-backend>
```

## Guardrails

- Nao implementar login, emissao de JWT, hash de senha ou refresh token aqui.
- Nao usar "default-allow" em hipotese alguma.
- Nao colocar a checagem de papel antes da autenticacao.
- Nao espalhar strings de papel; manter tipado e centralizado.
- Nao tratar rota sem `@Roles` como publica.
- Nao criar arquitetura paralela ao guard/erro ja usados no projeto.

## Saida esperada

1. decorator(s) `@Roles` (e/ou `@Permissions`) com chave de metadata estavel
2. guard(s) com default-deny lendo o usuario autenticado
3. registro do guard (global ou por controller), apos a autenticacao
4. rotas alvo protegidas por papel/permissao
5. tipos de papel/permissao centralizados
6. testes do guard e do decorator passando, com build verde
