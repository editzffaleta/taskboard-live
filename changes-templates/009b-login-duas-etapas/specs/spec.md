<!-- TEMPLATE — delta: ADDED na capability seguranca-acesso (parte LOGIN EM DUAS ETAPAS/A2) +
MODIFIED de login-sessao. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Login em duas etapas com MFA

O backend SHALL exigir o segundo fator no login quando o usuario tem MFA habilitado, sem emitir o
JWT antes da verificacao.

#### Scenario: Login com MFA habilitado

- **WHEN** `POST /auth/login` recebe credenciais validas de um usuario com `mfaEnabled`
- **THEN** responde `{ mfaRequired: true, challengeToken }` (curto, assinado), sem token de sessao
- **AND** `POST /auth/login/mfa` com o desafio + codigo valido emite o JWT e devolve `{ token, user }`

#### Scenario: Segundo fator invalido ou desafio expirado

- **WHEN** `POST /auth/login/mfa` recebe codigo invalido, ou um `challengeToken` expirado/reutilizado
- **THEN** a autenticacao e rejeitada sem emitir sessao

#### Scenario: Recovery code no login

- **WHEN** a segunda etapa recebe um recovery code valido (nao usado)
- **THEN** o JWT e emitido e o recovery code e invalidado (uso unico, via `verify-mfa`)

### Requirement: Verificacao de MFA no login (A2)

O frontend SHALL conduzir o login em duas etapas: apos as credenciais, solicitar o codigo
TOTP/recovery (A2) antes de concluir a sessao.

#### Scenario: Login com verificacao de MFA

- **WHEN** um usuario com MFA faz login
- **THEN** apos as credenciais, e solicitada a verificacao do codigo (A2) antes de concluir a sessao
- **AND** nenhuma sessao e criada no cliente antes do token da segunda etapa

### Requirement: Build, testes e i18n

O projeto SHALL permanecer sem erros de TypeScript/build, com os cenarios de login em duas etapas
testados e as chaves novas no i18n (pt/en).

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes do `auth` sao executados
- **THEN** nao ha erros e os testes passam
- **AND** as chaves do desafio/verificacao existem em `messages.pt.ts` e `messages.en.ts`

## MODIFIED Requirements

### Requirement: Login condicionado ao segundo fator

O login (capability `login-sessao`, `005`) SHALL manter a validacao de credenciais + gate de
status e passar a condicionar a emissao do JWT ao segundo fator quando `mfaEnabled`.

#### Scenario: Login sem MFA permanece direto

- **WHEN** `POST /auth/login` recebe credenciais validas de um usuario sem MFA
- **THEN** responde diretamente com `{ token, user }` (comportamento da `005` inalterado)

#### Scenario: Login com MFA nao emite sessao na primeira etapa

- **WHEN** as credenciais sao validas e `mfaEnabled` e verdadeiro
- **THEN** a primeira etapa devolve apenas o desafio; o JWT so existe apos `POST /auth/login/mfa`
