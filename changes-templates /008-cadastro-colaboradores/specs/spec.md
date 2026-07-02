<!-- TEMPLATE — delta de capability da 008 (cadastro-colaboradores). Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Colaborador vinculado a papel e estrutura

O modulo `auth` SHALL permitir criar e atualizar colaboradores vinculados a papel e a estrutura
organizacional (setor/cargo/unidade), via `save-user`, escopado por organizacao.

#### Scenario: save-user vincula estrutura valida

- **WHEN** `save-user` recebe `sectorId`/`positionId`/`unitId` da mesma organizacao e `active`
- **THEN** cria/atualiza o colaborador com os vinculos e o papel informados
- **AND** define a organizacao pelo contexto do admin (ou a organizacao-alvo, no caso de `super_admin`)

#### Scenario: Referencia de estrutura invalida e rejeitada

- **WHEN** `save-user` recebe uma referencia de estrutura de outra organizacao ou inativa
- **THEN** a operacao e rejeitada com erro de validacao

#### Scenario: Edicao sem password mantem o hash

- **WHEN** `save-user` atualiza um colaborador e `password` vem ausente ou vazio
- **THEN** o hash atual e mantido, sem re-hashear

### Requirement: Aprovacao e rejeicao de colaboradores

O modulo `auth` SHALL prover `approve-user` (`pending → active`) e `reject-user` (`pending → inactive`), com transicao validada.

#### Scenario: Aprovacao de cadastro pendente

- **WHEN** `approve-user` e executado para um colaborador `pending`
- **THEN** o status passa a `active`

#### Scenario: Transicao invalida e bloqueada

- **WHEN** `approve-user` ou `reject-user` e executado para um colaborador que nao esta `pending`
- **THEN** lanca `DomainError('user.invalid_status_transition', 409)`

### Requirement: Convites com auto-cadastro

O modulo `auth` SHALL prover o agregado `invitation` (token seguro unico, `expiresAt`, `status`) e os
casos de uso `create-invitation`, `accept-invitation` e `revoke-invitation`.

#### Scenario: Aceite de convite cria colaborador pendente

- **WHEN** `accept-invitation` recebe um token valido, nao expirado e `pending`
- **THEN** cria o usuario via `register-user` com a organizacao/papel/estrutura do convite e `status = pending`
- **AND** o convite passa a `accepted`

#### Scenario: Token invalido, expirado ou ja usado

- **WHEN** `accept-invitation` recebe um token inexistente, expirado ou ja `accepted`/`revoked`
- **THEN** a operacao e rejeitada com o erro correspondente (`invitation.not_found`, `invitation.expired` ou `invitation.already_used`)

### Requirement: Persistencia de colaboradores e convites

O sistema SHALL estender o model `user` com FKs de estrutura e criar o model `invitation` (token unico) no Prisma, com repositorios.

#### Scenario: Models e repositorios disponiveis

- **WHEN** a sincronizacao do modulo `auth` e executada
- **THEN** `user` tem FKs `sectorId`/`positionId`/`unitId` e existe o model `invitation` com `token` unico
- **AND** os repositorios Prisma implementam os contratos sem altera-los, escopados por organizacao

### Requirement: Endpoints de colaboradores e convites

O backend SHALL expor o CRUD de colaboradores e o ciclo de convite/aprovacao, com endpoints
administrativos autorizados e endpoints publicos de aceite de convite.

#### Scenario: Endpoints administrativos autorizados

- **WHEN** as rotas de `/users` (CRUD, `approve`, `reject`) e `/invitations` (criar, listar, revogar) sao acessadas
- **THEN** exigem papel `admin_org`/`super_admin` e sao escopadas por organizacao
- **AND** consultas mapeiam a leitura para objeto simples incluindo papel, status e estrutura

#### Scenario: Aceite de convite publico

- **WHEN** `GET /invitations/:token` e `POST /invitations/:token/accept` sao acessados sem autenticacao
- **THEN** validam o token e, no aceite, criam o colaborador `pending`

### Requirement: Telas de colaboradores (D2/D3/D29/A6)

O frontend SHALL prover a listagem (D2), o wizard de 6 passos (D3), a fila de aprovacao (D29) e o
aceite de convite publico (A6), alem da gestao de convites, sob gating por papel/permissao.

#### Scenario: Listagem e cadastro

- **WHEN** um Admin da Organizacao acessa colaboradores
- **THEN** ve a listagem paginada com filtros e badges de status (D2) e consegue cadastrar pelo wizard de 6 passos (D3), incluindo estrutura e acesso

#### Scenario: Aprovacao e convite

- **WHEN** ha colaboradores `pending`
- **THEN** o admin os aprova ou rejeita pela fila (D29)
- **AND** consegue gerar/revogar links de convite, e o convidado se auto-cadastra pela rota publica `/convite/[token]` (A6)

### Requirement: Build, testes e i18n

O projeto SHALL permanecer sem erros de TypeScript/build, com os casos de uso testados e as chaves de erro/rotulos no i18n (pt/en).

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes unitarios do modulo `auth` sao executados
- **THEN** nao ha erros e os testes passam
- **AND** os codigos de erro e rotulos novos tem chaves em `messages.pt.ts` e `messages.en.ts`
