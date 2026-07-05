> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/login-sessao/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O modulo `auth` ja registra usuarios (`003`), mas ainda nao ha autenticacao: nao e possivel logar,
manter sessao nem proteger rotas privadas. Esta mudanca conclui a autenticacao ponta a ponta. O
TaskBoard Live nao tem organizacao nem papel global — a sessao carrega apenas `{ sub, name, email }`.
A autorizacao por quadro (owner/membro) e resolvida nas changes de dominio do kanban, consultando o
`userId` autenticado, nao um papel na sessao. O dominio continua sem qualquer nocao de token — JWT e
responsabilidade exclusiva da camada HTTP.

## What Changes

- Implementar o caso de uso `login-user` no modulo `auth`, recebendo `{ email, password }` e
  devolvendo apenas atributos publicos: `{ id, name, email }`. Em credenciais invalidas, lancar
  `DomainError('user.credentials.invalid', 401)` (mesma mensagem para e-mail inexistente e senha
  incorreta). O dominio nao conhece token/JWT/sessao.
- Cobrir `login-user` com testes unitarios (coverage 100%) reaproveitando os fakes existentes.
- No backend: instalar `jsonwebtoken`, garantir `JWT_SECRET`, criar o helper `jwt.util.ts` (camada
  HTTP) que assina o payload `{ sub, name, email }`, e expor `POST /auth/login` gerando o JWT a
  partir da saida do caso de uso, retornando `{ token, user }`.
- `AuthenticatedUser` e `auth-user.mapper.ts` expoem o `userId` (`sub`) autenticado a partir das
  claims do JWT, consumido pelo `current-user.decorator.ts` ja existente na base (`001`).
- Estender `auth.integration.http` com cenarios de login (valido, inexistente, senha incorreta,
  invalido, incompleto).
- No frontend: instalar `js-cookie`, adicionar a chave i18n `user.credentials.invalid`, criar
  `decodeJwtPayload` (com decode UTF-8), `AuthContext` e `AuthGuard` no modulo `auth`, integrar o
  formulario de login, persistir a sessao no cookie `auth_token` e proteger o grupo `(private)`.
- `/join` redireciona para a rota privada inicial quando ha sessao ativa; logout limpa o cookie e
  volta para `/join`.

## Capabilities

### New Capabilities
- `login-sessao`: Autenticacao completa do TaskBoard Live — caso de uso `login-user` (sem token no
  dominio), endpoint `POST /auth/login` gerando JWT `{ sub, name, email }` na camada HTTP, sessao em
  cookie, e `AuthContext`/`AuthGuard` protegendo as rotas privadas.

### Modified Capabilities
<!-- Nenhuma. -->

## Impact

- **Dominio (`modules/auth`)**: novo caso de uso `login-user` e testes unitarios; o modulo permanece
  sem qualquer abstracao de token/JWT/sessao.
- **Backend**: `jsonwebtoken` + `@types/jsonwebtoken`, `JWT_SECRET`, helper `jwt.util.ts`, endpoint
  `POST /auth/login`, `AuthenticatedUser`/`auth-user.mapper.ts` (expoem apenas `userId`/`name`/
  `email`), `current-user.decorator.ts` ja existente da `001`, cenarios em `auth.integration.http`.
- **Frontend**: `js-cookie` + `@types/js-cookie`, chave i18n `user.credentials.invalid`,
  `decodeJwtPayload`, `AuthContext`, `AuthGuard`, integracao do formulario de login, ajustes em
  `app/(private)/layout.tsx`/`app/layout.tsx` e `AdminShell`.
- **Contratos**: o dominio reaproveita `UserRepository` e `CryptoProvider` sem altera-los; nenhum
  `TokenProvider` no dominio.
- **Fora de escopo**: refresh token, MFA, RBAC, organizacao/papel na sessao. Autorizacao por quadro
  (owner/membro) e resolvida nas changes de dominio do kanban a partir do `userId` autenticado.
