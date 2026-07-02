<!-- TEMPLATE — delta de capability da 010 (perfil-usuario). Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Autosservico de perfil do usuario

O modulo `auth` SHALL permitir que o usuario autenticado visualize e atualize o proprio perfil, sem alterar atributos administrativos.

#### Scenario: Atualizacao de dados e preferencias

- **WHEN** `update-own-profile` e executado pelo proprio usuario
- **THEN** atualiza apenas `name`, `phone`, `avatarUrl`, `locale` e `notificationPreferences`
- **AND** campos administrativos (`role`, `status`, `organizationId`, estrutura, `email`) enviados sao ignorados/rejeitados

#### Scenario: Leitura do perfil completo

- **WHEN** `GET /me` e chamado por um usuario autenticado
- **THEN** devolve os dados pessoais, o trabalho em modo leitura (setor/cargo/unidade/papel) e as flags de MFA
- **AND** o objeto de leitura e mapeado explicitamente (sem expor a entidade crua nem `password`/`mfaSecret`)

### Requirement: Troca de senha pelo proprio usuario

O modulo `auth` SHALL permitir a troca de senha mediante verificacao da senha atual.

#### Scenario: Troca com senha atual correta

- **WHEN** `change-own-password` recebe a senha atual correta e uma nova senha valida
- **THEN** a nova senha e re-hasheada e persistida

#### Scenario: Senha atual incorreta

- **WHEN** a senha atual informada nao confere
- **THEN** lanca `DomainError('user.current_password.invalid', 422)`

### Requirement: Endpoints /me escopados ao usuario

O backend SHALL expor `GET /me`, `PATCH /me` e `POST /me/password`, operando sempre sobre o usuario autenticado.

#### Scenario: Operacoes restritas ao proprio usuario

- **WHEN** as rotas `/me` sao acessadas
- **THEN** atuam exclusivamente sobre o `current-user`, sem aceitar `id` de outro usuario
- **AND** nao permitem escalonamento de papel/status/organizacao/estrutura

### Requirement: Persistencia dos campos de perfil

O sistema SHALL estender `user` com `phone`, `avatarUrl`, `locale` e `notificationPreferences` no Prisma.

#### Scenario: Campos disponiveis

- **WHEN** a sincronizacao do modulo `auth` e executada
- **THEN** `user` tem os campos de perfil e o repositorio os persiste sem alterar o contrato

### Requirement: Tela de perfil (B9)

O frontend SHALL prover a tela de perfil com as secoes Conta, Dados pessoais, Trabalho (leitura), Notificacoes e Seguranca.

#### Scenario: Gestao da propria conta

- **WHEN** o usuario acessa o perfil pelo shell
- **THEN** edita dados pessoais e preferencias, troca a senha e gerencia o MFA (via `009`)
- **AND** ve o e-mail e o trabalho em modo leitura

### Requirement: Build, testes e i18n

O projeto SHALL permanecer sem erros de TypeScript/build, com os casos de uso testados e as chaves de erro/rotulos no i18n (pt/en).

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes unitarios do `auth` sao executados
- **THEN** nao ha erros e os testes passam
- **AND** os codigos de erro e rotulos novos tem chaves em `messages.pt.ts` e `messages.en.ts`
