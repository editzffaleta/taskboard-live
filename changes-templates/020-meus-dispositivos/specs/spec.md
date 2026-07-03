<!-- TEMPLATE — delta: MODIFIED de login-sessao (autosservico de sessoes, B10). Placeholders: {{produto}}. -->

## MODIFIED Requirements

### Requirement: Gestao das proprias sessoes

A sessao rotativa (capability `login-sessao`, `017`) SHALL permitir ao usuario listar as proprias
familias ativas (dispositivo, criacao, ultimo uso, sessao atual) e revoga-las seletivamente ou em
massa, com efeito imediato na renovacao.

#### Scenario: Listagem das sessoes ativas

- **WHEN** o usuario acessa `GET /me/sessions` (tela B10)
- **THEN** ve uma linha por familia ativa com metadados e a sessao atual marcada

#### Scenario: Revogacao seletiva

- **WHEN** o usuario encerra outra sessao da lista
- **THEN** a familia e revogada e a proxima renovacao daquele dispositivo recebe 401
- **AND** revogar familia que nao e sua responde 404

#### Scenario: Encerrar todas as outras

- **WHEN** o usuario aciona "encerrar todas as outras"
- **THEN** todas as familias exceto a atual sao revogadas atomicamente

#### Scenario: Encerrar a sessao atual

- **WHEN** o usuario encerra a propria sessao atual pela lista
- **THEN** o comportamento e o logout normal (cookie limpo, redirecionamento ao login)

## ADDED Requirements

### Requirement: Metadados de sessao

O sistema SHALL registrar `userAgent` no login e `lastUsedAt` a cada rotacao, como metadados
informativos (nunca base de autorizacao), em migration aditiva.

#### Scenario: Metadados preenchidos

- **WHEN** um login ocorre e a sessao rotaciona
- **THEN** a familia guarda o user-agent do login e o ultimo uso atualizado
- **AND** familias antigas sem metadados aparecem como dispositivo desconhecido

### Requirement: Build, testes e i18n

O projeto SHALL permanecer sem erros de TypeScript/build, com listagem/revogacoes testadas e as
chaves novas no i18n (pt/en).

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes sao executados
- **THEN** nao ha erros e os testes passam
