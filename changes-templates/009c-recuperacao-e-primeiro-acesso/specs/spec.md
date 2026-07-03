<!-- TEMPLATE — delta da capability seguranca-acesso (parte RECUPERACAO/1º ACESSO, A4/A5).
Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Recuperacao de senha por token

O modulo `auth` SHALL prover recuperacao de senha por token de uso unico, sem revelar a existencia
do e-mail.

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

O modulo `auth` SHALL permitir que contas criadas pelo admin definam a senha inicial via token de
primeiro acesso; quando o mecanismo de MFA (`009a`) estiver aplicado, o setup de MFA e oferecido
como passo opcional.

#### Scenario: Definicao de senha no primeiro acesso

- **WHEN** um token `kind=first-access` valido e usado
- **THEN** o usuario define a senha inicial
- **AND** se a `009a` estiver aplicada, pode configurar MFA na sequencia (opcional)

### Requirement: Persistencia do password_reset

O sistema SHALL criar o model `password_reset` (token unico) no Prisma, com repositorio.

#### Scenario: Model disponivel

- **WHEN** a sincronizacao do modulo `auth` e executada
- **THEN** existe o model `password_reset` com `token` unico
- **AND** o repositorio implementa o contrato sem altera-lo

### Requirement: Telas de recuperacao e primeiro acesso (A4/A5)

O frontend SHALL prover a recuperacao de senha (A4) e o primeiro acesso (A5), com mensagens
neutras na solicitacao.

#### Scenario: Recuperacao e primeiro acesso ponta a ponta

- **WHEN** o usuario solicita/redefine senha (A4) ou faz o primeiro acesso (A5)
- **THEN** os fluxos correspondentes funcionam ponta a ponta com as devidas mensagens

### Requirement: Build, testes e i18n

O projeto SHALL permanecer sem erros de TypeScript/build, com os casos de uso testados e as chaves
de erro/rotulos no i18n (pt/en).

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes unitarios do `auth` sao executados
- **THEN** nao ha erros e os testes passam
- **AND** os codigos de erro e rotulos novos tem chaves em `messages.pt.ts` e `messages.en.ts`
