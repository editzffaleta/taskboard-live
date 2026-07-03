<!-- TEMPLATE — delta da capability seguranca-acesso (parte MECANISMO MFA/A3) + MODIFIED de
registro-usuario. Placeholders: {{produto}}. -->

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

### Requirement: Endpoints autenticados de MFA

O backend SHALL expor `POST /auth/mfa/setup`, `POST /auth/mfa/confirm` e `POST /auth/mfa/disable`
apenas para usuarios autenticados, operando sobre o proprio usuario da sessao.

#### Scenario: Gestao do proprio MFA

- **WHEN** um usuario autenticado chama setup/confirm/disable
- **THEN** a operacao vale para o usuario da sessao
- **AND** sem sessao a chamada recebe 401

### Requirement: Persistencia dos campos de MFA

O sistema SHALL estender `user` com os campos de MFA no Prisma, mantendo o contrato do repositorio.

#### Scenario: Campos disponiveis

- **WHEN** a sincronizacao do modulo `auth` e executada
- **THEN** `user` tem `mfaEnabled`/`mfaSecret`/`mfaConfirmedAt`/`recoveryCodes`
- **AND** o repositorio implementa o contrato sem altera-lo, com `mfaSecret` cifrado em repouso

### Requirement: Setup de MFA (A3)

O frontend SHALL prover o setup de MFA com QR, confirmacao do primeiro codigo, exibicao unica dos
recovery codes e desativacao (A3).

#### Scenario: Setup ponta a ponta

- **WHEN** o usuario configura MFA (A3)
- **THEN** escaneia o QR, confirma o primeiro codigo, ve os recovery codes uma unica vez e pode desativar depois

### Requirement: Build, testes e i18n

O projeto SHALL permanecer sem erros de TypeScript/build, com os casos de uso de MFA testados e as
chaves de erro/rotulos no i18n (pt/en).

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes unitarios do `auth` sao executados
- **THEN** nao ha erros e os testes passam
- **AND** os codigos de erro e rotulos de MFA tem chaves em `messages.pt.ts` e `messages.en.ts`

## MODIFIED Requirements

### Requirement: Entidade user com campos de MFA

A entidade `user` (capability `registro-usuario`, `004`) SHALL aceitar `mfaEnabled` (default
`false`), `mfaSecret` (cifrado, opcional), `mfaConfirmedAt` (opcional) e `recoveryCodes`
(hasheados, uso unico).

#### Scenario: Campos opcionais de MFA

- **WHEN** um `user` e criado/validado sem os novos campos
- **THEN** a entidade permanece valida (`mfaEnabled = false` por default)
- **AND** quando o MFA e configurado, `mfaSecret` nunca aparece em claro na leitura
