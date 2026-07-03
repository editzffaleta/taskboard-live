<!-- TEMPLATE — delta: MODIFIED de auditoria-de-acoes (camada de UI, D30). Placeholders: {{produto}}. -->

## MODIFIED Requirements

### Requirement: Consulta administrativa com interface

A consulta da trilha (capability `auditoria-de-acoes`, `016`) SHALL dispor de interface (D30)
com tabela paginada, filtros por acao/ator/alvo/periodo, detalhe de metadata e rotulos i18n,
visivel apenas a `admin_org`/`super_admin`.

#### Scenario: Consulta visual da trilha

- **WHEN** um admin acessa a tela D30
- **THEN** ve a trilha paginada da propria organizacao com filtros funcionais
- **AND** expande uma entrada para ver a metadata formatada e o requestId quando presente

#### Scenario: Rotulos com fallback

- **WHEN** uma entrada tem acao fora do catalogo de rotulos
- **THEN** a chave literal e exibida sem quebrar a tela

#### Scenario: Gating por papel

- **WHEN** um usuario sem papel administrativo tenta acessar a D30
- **THEN** o menu nao exibe a opcao e a rota e bloqueada pelo gating (alem do 403 da API)

## ADDED Requirements

### Requirement: Build, testes e i18n

O projeto SHALL permanecer sem erros de TypeScript/build, com a tela testada e as chaves novas
no i18n (pt/en).

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes sao executados
- **THEN** nao ha erros e os testes passam
- **AND** as chaves `audit.actions.*` e da tela existem em pt e en
