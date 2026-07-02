<!-- TEMPLATE — delta de capability da 009 (seguranca-acesso). Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: MFA por TOTP

O modulo `auth` SHALL prover MFA por TOTP com setup, confirmacao, verificacao e desativacao,
armazenando o segredo cifrado e recovery codes hasheados de uso unico.

#### Scenario: Setup e confirmacao de MFA

- **WHEN** `setup-mfa` e executado
- **THEN** gera um segredo e a URI `otpauth://` para o QR, sem habilitar o MFA ainda
- **AND** `confirm-mfa` valida o primeiro codigo, habilita `mfaEnabled` e gera recovery codes exibidos uma unica vez

#### Scenario: Verificacao aceita TOTP ou recovery code

- **WHEN** `verify-mfa` recebe um codigo TOTP valido ou um recovery code nao usado
- **THEN** a verificacao e bem-sucedida
- **AND** o recovery code usado e invalidado (uso unico)

#### Scenario: Codigo invalido

- **WHEN** `verify-mfa` recebe um codigo invalido
- **THEN** a verificacao falha sem habilitar/autenticar

### Requirement: Login em duas etapas com MFA

O backend SHALL exigir o segundo fator no login quando o usuario tem MFA habilitado, sem emitir o JWT antes da verificacao.

#### Scenario: Login com MFA habilitado

- **WHEN** `POST /auth/login` recebe credenciais validas de um usuario com `mfaEnabled`
- **THEN** responde `{ mfaRequired: true, challengeToken }` (curto, assinado), sem token de sessao
- **AND** `POST /auth/login/mfa` com o desafio + codigo valido emite o JWT e devolve `{ token, user }`

#### Scenario: Login sem MFA permanece direto

- **WHEN** `POST /auth/login` recebe credenciais validas de um usuario sem MFA
- **THEN** responde diretamente com `{ token, user }`

### Requirement: Recuperacao de senha por token

O modulo `auth` SHALL prover recuperacao de senha por token de uso unico, sem revelar a existencia do e-mail.

#### Scenario: Solicitacao nao vaza existencia de e-mail

- **WHEN** `request-password-reset` recebe um e-mail
- **THEN** a resposta e a mesma exista ou nao o usuario
- **AND** o token so e criado quando ha usuario correspondente

#### Scenario: Redefinicao com token valido

- **WHEN** `reset-password` recebe um token `kind=reset` valido, nao expirado e nao usado
- **THEN** a senha e re-hasheada e o token e marcado como usado

#### Scenario: Token invalido

- **WHEN** o token esta inexistente, expirado ou ja usado
- **THEN** a operacao e rejeitada com o erro correspondente

### Requirement: Primeiro acesso

O modulo `auth` SHALL permitir que contas criadas pelo admin definam a senha inicial (e configurem MFA opcionalmente) via token de primeiro acesso.

#### Scenario: Definicao de senha no primeiro acesso

- **WHEN** um token `kind=first-access` valido e usado
- **THEN** o usuario define a senha inicial
- **AND** pode configurar MFA na sequencia (opcional)

### Requirement: Persistencia de MFA e tokens

O sistema SHALL estender `user` com os campos de MFA e criar o model `password_reset` (token unico) no Prisma, com repositorios.

#### Scenario: Models disponiveis

- **WHEN** a sincronizacao do modulo `auth` e executada
- **THEN** `user` tem `mfaEnabled`/`mfaSecret`/`mfaConfirmedAt`/`recoveryCodes` e existe o model `password_reset` com `token` unico
- **AND** os repositorios implementam os contratos sem altera-los

### Requirement: Telas de seguranca de acesso (A2/A3/A4/A5)

O frontend SHALL prover a verificacao de MFA no login (A2), o setup de MFA com QR e recovery codes
(A3), a recuperacao de senha (A4) e o primeiro acesso (A5).

#### Scenario: Login com verificacao de MFA

- **WHEN** um usuario com MFA faz login
- **THEN** apos as credenciais, e solicitada a verificacao do codigo (A2) antes de concluir a sessao

#### Scenario: Setup, recuperacao e primeiro acesso

- **WHEN** o usuario configura MFA (A3), solicita/redefine senha (A4) ou faz o primeiro acesso (A5)
- **THEN** os fluxos correspondentes funcionam ponta a ponta com as devidas mensagens

### Requirement: Build, testes e i18n

O projeto SHALL permanecer sem erros de TypeScript/build, com os casos de uso testados e as chaves de erro/rotulos no i18n (pt/en).

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes unitarios do `auth` sao executados
- **THEN** nao ha erros e os testes passam
- **AND** os codigos de erro e rotulos novos tem chaves em `messages.pt.ts` e `messages.en.ts`
