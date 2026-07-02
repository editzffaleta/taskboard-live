<!-- TEMPLATE — delta de capability da 005 (login-sessao). Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Caso de uso login-user sem nocao de token

O caso de uso `login-user` SHALL receber `{ email, password }` e retornar apenas
`{ id, name, email, role, organizationId }`, sem `password` nem hash, e MUST NOT conhecer ou mencionar
token/JWT/sessao. Em credenciais invalidas, SHALL lancar `DomainError('user.credentials.invalid', 401)`.
Apos validar as credenciais, se o `status` do usuario nao for `active`, SHALL lancar
`DomainError('user.inactive', 403)`.

#### Scenario: Login com credenciais validas

- **WHEN** `login-user` recebe `{ email, password }` validos de um usuario ativo
- **THEN** retorna `{ id, name, email, role, organizationId }` sem `password` e sem hash

#### Scenario: Credenciais invalidas nao vazam existencia de e-mail

- **WHEN** o usuario nao existe OU a senha esta incorreta
- **THEN** lanca `DomainError('user.credentials.invalid', 401)` com a mesma mensagem nos dois casos

#### Scenario: Usuario inativo e barrado

- **WHEN** as credenciais sao validas mas o `status` do usuario nao e `active`
- **THEN** lanca `DomainError('user.inactive', 403)`

#### Scenario: Testes unitarios cobrem o caso de uso

- **WHEN** os testes unitarios de `login-user` sao executados com `FakeUserRepository` e `FakeCryptoProvider`
- **THEN** cobrem login valido, e-mail inexistente, senha incorreta, e-mail vazio, e-mail invalido, senha vazia e usuario inativo
- **AND** atingem 100% de coverage no caso de uso

### Requirement: Endpoint POST /auth/login gera JWT com tenant e papel

O backend SHALL expor `POST /auth/login` (publico) que instancia `LoginUser` no corpo do metodo e, a
partir da saida, gera o JWT na camada do controller, retornando `200` com
`{ token, user: { id, name, email, role, organizationId } }`. A geracao do JWT MUST ocorrer somente
no controller, e o payload SHALL conter `sub`, `name`, `email`, `role` e `organizationId`.

#### Scenario: Login valido devolve token e user

- **WHEN** `POST /auth/login` recebe credenciais validas de um usuario ativo
- **THEN** responde `200` com `{ token, user: { id, name, email, role, organizationId } }`
- **AND** o payload do JWT contem `sub` (id), `name`, `email`, `role` e `organizationId`, assinado com `JWT_SECRET` e expiracao de 7 dias

#### Scenario: Erros de login

- **WHEN** `POST /auth/login` recebe e-mail inexistente ou senha incorreta
- **THEN** responde `401`
- **AND** quando o usuario esta inativo, responde `403`
- **AND** quando o e-mail e invalido ou o corpo esta incompleto, responde `422`

#### Scenario: Cenarios de integracao HTTP

- **WHEN** os cenarios de login em `auth.integration.http` sao executados com o backend rodando
- **THEN** cobrem valido (200), e-mail inexistente (401), senha incorreta (401), inativo (403), e-mail invalido (422) e corpo incompleto (422)

### Requirement: Binding de tenant e papel a sessao autenticada

O backend SHALL expor `organizationId` e `role` do usuario autenticado a partir das claims do JWT,
via `AuthenticatedUser`/`auth-user.mapper.ts`, e SHALL prover `current-organization.decorator.ts`.

#### Scenario: Organizacao e papel disponiveis em requisicoes autenticadas

- **WHEN** uma requisicao autenticada e processada
- **THEN** `AuthenticatedUser` expoe `organizationId` e `role` lidos das claims
- **AND** o decorator `current-organization` devolve o `organizationId` do usuario autenticado

### Requirement: Sessao persistida em cookie no frontend

O frontend SHALL persistir a sessao em cookie `auth_token` via `js-cookie`, sobrevivendo ao
fechamento do navegador, com `sameSite: 'lax'`, `secure` em producao, expiracao de 7 dias e sem
`httpOnly`. O payload do JWT SHALL ser decodificado com `TextDecoder('utf-8')`, lendo tambem `role` e
`organizationId`.

#### Scenario: Cookie sobrevive ao fechamento do navegador

- **WHEN** o usuario faz login e depois fecha e reabre o navegador
- **THEN** o cookie `auth_token` persiste e a sessao e reidratada

#### Scenario: Decode UTF-8 do JWT preserva acentuacao

- **WHEN** o payload do JWT contem um nome acentuado (ex.: `José da Silva`)
- **THEN** `decodeJwtPayload` o decodifica corretamente, incluindo `role` e `organizationId`

### Requirement: AuthContext e AuthGuard protegendo rotas privadas

O frontend SHALL prover `AuthContext` e `AuthGuard` no modulo `auth`, protegendo o grupo `(private)`,
alimentando o `AdminShell` e expondo `role` e `organizationId` do usuario logado.

#### Scenario: Guard protege rota privada

- **WHEN** um usuario sem sessao valida acessa uma rota do grupo `(private)`
- **THEN** e redirecionado para `/join`
- **AND** enquanto o contexto hidrata, um placeholder neutro e renderizado (sem flash)

#### Scenario: Dados do usuario no AdminShell

- **WHEN** o usuario esta autenticado
- **THEN** o header exibe `name` e `email` do contexto
- **AND** `role` e `organizationId` ficam disponiveis no contexto para consumo posterior (ex.: gating de sidebar na `006`)

### Requirement: Redirecionamentos de sessao e logout

A tela `/join` SHALL redirecionar para a rota privada inicial quando ha sessao ativa, e o logout SHALL
limpar o cookie e devolver o usuario a `/join`.

#### Scenario: Login redireciona para a area privada

- **WHEN** o login e bem-sucedido (200)
- **THEN** a sessao e gravada e o usuario e redirecionado para a rota privada inicial

#### Scenario: /join com sessao ativa redireciona

- **WHEN** um usuario autenticado acessa `/join`
- **THEN** e redirecionado para a rota privada inicial

#### Scenario: Logout limpa a sessao

- **WHEN** o usuario aciona o logout
- **THEN** o cookie `auth_token` e removido e o usuario e redirecionado para `/join`

### Requirement: Build sem erros e dominio livre de token

O projeto SHALL permanecer sem erros de TypeScript/build, e o dominio `modules/auth` MUST NOT
referenciar token/JWT/sessao.

#### Scenario: Verificacao de build e pureza do dominio

- **WHEN** o typecheck/build e executado em `apps/backend` e `apps/frontend`
- **THEN** nao ha erros de TypeScript nem de build
- **AND** o modulo de dominio `auth` nao importa nem menciona token/JWT/sessao
