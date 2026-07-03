<!-- TEMPLATE — delta da capability observabilidade. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Log estruturado com correlacao

O backend SHALL emitir logs estruturados (JSON em producao) com um registro por requisicao
(metodo, rota, status, duracao) correlacionado por `request-id`, com redaction de dados sensiveis.

#### Scenario: Requisicao logada e correlacionada

- **WHEN** uma requisicao e atendida
- **THEN** existe um log com metodo/rota/status/duracao e o `request-id`
- **AND** o mesmo id e devolvido no header `x-request-id` da resposta

#### Scenario: Sensiveis nunca em claro

- **WHEN** headers/campos como authorization, cookie, password, secret ou token transitam
- **THEN** os logs os exibem redigidos, nunca em claro

### Requirement: Captura opcional de erros

O backend SHALL capturar exceptions nao tratadas num servico compativel com Sentry (ex.:
GlitchTip self-hosted) apenas quando `SENTRY_DSN` estiver configurada.

#### Scenario: Tracking ligado por env

- **WHEN** `SENTRY_DSN` esta definida e ocorre uma exception nao tratada
- **THEN** o evento e capturado com o `request-id` como tag
- **AND** sem a env, nenhuma inicializacao ou trafego de tracking ocorre

### Requirement: Health com verificacao de banco

O endpoint `GET /health` SHALL responder `200` somente com o banco acessivel e `503` caso
contrario, mantendo o contrato usado pelos healthchecks dos containers.

#### Scenario: Health honesto

- **WHEN** `GET /health` e chamado com o banco de pe
- **THEN** responde `200` com `{ status: 'ok', db: 'up' }`
- **AND** com o banco inacessivel responde `503`

### Requirement: Build, testes e configuracao

O projeto SHALL permanecer sem erros de TypeScript/build, com redaction, health e request-id
testados e as envs documentadas.

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes sao executados
- **THEN** nao ha erros e os testes passam
- **AND** `.env.example` documenta `LOG_LEVEL` e `SENTRY_DSN`
