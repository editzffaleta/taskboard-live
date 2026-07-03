<!-- TEMPLATE — delta: MODIFIED de login-sessao (sessao rotativa). Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Renovacao transparente no cliente

O frontend SHALL renovar a sessao automaticamente: ao receber 401 do access token, tenta
`POST /auth/refresh` (serializado) e repete a requisicao; falha na renovacao encerra a sessao
local e redireciona ao login.

#### Scenario: Renovacao sem interrupcao

- **WHEN** o access token expira durante o uso
- **THEN** o interceptor renova via refresh e a requisicao original conclui sem o usuario perceber

#### Scenario: Refresh expirado derruba a sessao

- **WHEN** a renovacao falha (refresh expirado/revogado)
- **THEN** a sessao local e limpa e o usuario vai para o login, sem loop de tentativas

## MODIFIED Requirements

### Requirement: Sessao rotativa com deteccao de reuso

A sessao (capability `login-sessao`, `005`) SHALL ser composta por access token curto
(`ACCESS_TOKEN_TTL`, default 15 min) e refresh token opaco de uso unico em cookie
httpOnly/secure com path restrito, persistido hasheado, com familia por login e revogacao real.

#### Scenario: Login emite o par

- **WHEN** o login conclui (apos a 2ª etapa, se a `009b` estiver aplicada)
- **THEN** o cliente recebe o access curto e o cookie httpOnly do refresh (path `/auth/refresh`)
- **AND** o refresh e armazenado apenas como hash, numa familia nova

#### Scenario: Rotacao de uso unico

- **WHEN** `POST /auth/refresh` recebe um refresh valido
- **THEN** um novo par e emitido e o refresh anterior fica invalido (encadeado na familia)

#### Scenario: Reuso revoga a familia

- **WHEN** um refresh ja rotacionado ou revogado e apresentado
- **THEN** a familia inteira e revogada e a resposta e 401 (`auth.refresh_reuse_detected`)

#### Scenario: Logout real

- **WHEN** `POST /auth/logout` e chamado
- **THEN** a familia do refresh e revogada e o cookie e limpo; renovacoes seguintes falham

### Requirement: Build, testes e configuracao

O projeto SHALL permanecer sem erros de TypeScript/build, com rotacao, reuso, logout e expiracao
testados e os TTLs documentados.

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes sao executados
- **THEN** nao ha erros e os testes passam
- **AND** `.env.example` documenta `ACCESS_TOKEN_TTL` e `REFRESH_TOKEN_TTL`
