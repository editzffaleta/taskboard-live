<!--
TEMPLATE DE CHANGE — 005-login-sessao (autenticacao ponta a ponta + binding de tenant).
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
-->

## Why

O modulo `auth` ja registra usuarios (`004`), mas ainda nao ha autenticacao: nao e possivel logar,
manter sessao nem proteger rotas privadas. Esta mudanca conclui a autenticacao ponta a ponta e
**resolve o adiamento da `003`**: e aqui que o `organizationId` (e o `role`) do usuario passam a
trafegar na sessao, ativando o escopo multi-tenant em requisicoes autenticadas. O dominio continua
sem qualquer nocao de token — JWT e responsabilidade exclusiva da camada HTTP.

## What Changes

- Implementar o caso de uso `login-user` no modulo `auth`, recebendo `{ email, password }` e
  devolvendo apenas atributos publicos: `{ id, name, email, role, organizationId }`. Em credenciais
  invalidas, lancar `DomainError('user.credentials.invalid', 401)` (mesma mensagem para e-mail
  inexistente e senha incorreta). Adicionar um **gate de status**: usuario que passe nas credenciais
  mas cujo `status` nao seja `active` e barrado com `DomainError('user.inactive', 403)`. O dominio
  nao conhece token/JWT/sessao.
- Cobrir `login-user` com testes unitarios (coverage 100%) reaproveitando os fakes existentes.
- No backend: instalar `jsonwebtoken`, garantir `JWT_SECRET`, criar o helper `jwt.util.ts` (camada
  HTTP) que assina o payload `{ sub, name, email, role, organizationId }`, e expor `POST /auth/login`
  gerando o JWT a partir da saida do caso de uso, retornando `{ token, user }`.
- **Binding de tenant a sessao (adiamento da `003`)**: estender `AuthenticatedUser` e o
  `auth-user.mapper.ts` para expor `organizationId` e `role` a partir das claims do JWT, e criar
  `current-organization.decorator.ts` em `shared/decorators` (espelhando `current-user.decorator.ts`).
- Estender `auth.integration.http` com cenarios de login (valido, inexistente, senha incorreta,
  invalido, incompleto e usuario inativo).
- No frontend: instalar `js-cookie`, adicionar as chaves i18n `user.credentials.invalid` e
  `user.inactive`, criar `decodeJwtPayload` (com decode UTF-8) lendo `role` e `organizationId`,
  `AuthContext` e `AuthGuard` no modulo `auth`, integrar o formulario de login, persistir a sessao no
  cookie `auth_token` e proteger o grupo `(private)`. O `AuthContext` expoe `role` e `organizationId`
  para o gating de sidebar por papel da `006`.
- `/join` redireciona para a rota privada inicial quando ha sessao ativa; logout limpa o cookie e
  volta para `/join`.

## Capabilities

### New Capabilities
- `login-sessao`: Autenticacao completa do {{produto}} — caso de uso `login-user` (sem token no
  dominio, com gate de status), endpoint `POST /auth/login` gerando JWT com `organizationId` e `role`
  na camada HTTP, binding de tenant a sessao (`current-organization.decorator` + extensao de
  `AuthenticatedUser`), sessao em cookie, e `AuthContext`/`AuthGuard` protegendo as rotas privadas e
  expondo papel/organizacao do usuario logado.

### Modified Capabilities
<!-- Nenhuma. O escopo de tenant da 003 e ativado, nao modificado. -->

## Impact

- **Dominio (`modules/auth`)**: novo caso de uso `login-user` (saida com `role`/`organizationId`,
  gate de status) e testes unitarios; o modulo permanece sem qualquer abstracao de token/JWT/sessao.
- **Backend**: `jsonwebtoken` + `@types/jsonwebtoken`, `JWT_SECRET`, helper `jwt.util.ts`, endpoint
  `POST /auth/login`, extensao de `AuthenticatedUser` e `auth-user.mapper.ts`, novo
  `current-organization.decorator.ts`, cenarios em `auth.integration.http`.
- **Frontend**: `js-cookie` + `@types/js-cookie`, chaves i18n `user.credentials.invalid` e
  `user.inactive`, `decodeJwtPayload`, `AuthContext`, `AuthGuard`, integracao do formulario de login,
  ajustes em `app/(private)/layout.tsx`/`app/layout.tsx` e `AdminShell`.
- **Contratos**: o dominio reaproveita `UserRepository` e `CryptoProvider` sem altera-los; nenhum
  `TokenProvider` no dominio.
- **Habilita**: gating de sidebar por papel (`006`) consome `role` do `AuthContext`; escopo por
  `organizationId` nos endpoints autenticados a partir da `008`.
