<!-- TEMPLATE — delta da capability auditoria-de-acoes. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Trilha imutavel de acoes sensiveis

O sistema SHALL registrar acoes sensiveis presentes (papel/grupo, aprovacao/rejeicao, convites,
disable de MFA, resets/primeiro acesso) em entradas imutaveis com ator, acao estavel, alvo,
organizacao e metadata segura.

#### Scenario: Acao sensivel registrada

- **WHEN** uma acao sensivel de uma change aplicada e executada
- **THEN** uma entrada de auditoria e criada com actorId, action, alvo e organizationId
- **AND** a metadata nunca contem senha, segredo, token ou recovery code

#### Scenario: Imutabilidade por contrato

- **WHEN** o repositorio de auditoria e usado
- **THEN** apenas criacao e consulta existem — nao ha update nem delete

#### Scenario: Tolerancia a falha

- **WHEN** o registro de auditoria falha
- **THEN** a acao de negocio conclui normalmente e o erro e logado

### Requirement: Consulta administrativa escopada

O backend SHALL expor `GET /audit` paginado com filtros (acao, ator, alvo, periodo), restrito a
`admin_org`/`super_admin` e escopado a organizacao do admin.

#### Scenario: Escopo por organizacao

- **WHEN** um `admin_org` consulta a auditoria
- **THEN** ve apenas entradas da propria organizacao
- **AND** `super_admin` consulta todas; papel nao autorizado recebe 403

### Requirement: Build e testes

O projeto SHALL permanecer sem erros de TypeScript/build, com registro, imutabilidade, tolerancia
a falha e consulta testados.

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes sao executados
- **THEN** nao ha erros e os testes passam
