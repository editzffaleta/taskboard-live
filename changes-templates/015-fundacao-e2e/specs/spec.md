<!-- TEMPLATE — delta da capability fundacao-e2e. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Playwright configurado na raiz

O monorepo SHALL ter o Playwright instalado e configurado (chromium, `baseURL` por env, trace e
screenshot em falha) com os testes em `e2e/` e o script `test:e2e`.

#### Scenario: Fundacao executavel

- **WHEN** `npm run test:e2e` roda com os apps de pe e o seed demo aplicado
- **THEN** a suite executa contra `E2E_BASE_URL`
- **AND** falhas geram trace/screenshot para diagnostico

#### Scenario: Pre-condicao clara

- **WHEN** `E2E_BASE_URL` nao responde
- **THEN** a execucao falha rapido com a instrucao de subir os apps

### Requirement: Smoke do login

A suite SHALL cobrir o fluxo critico de autenticacao: login valido, login invalido e logout —
incluindo o desvio de MFA quando a `009b` estiver aplicada.

#### Scenario: Login valido e logout

- **WHEN** um usuario demo loga com credencial valida
- **THEN** chega ao shell autenticado
- **AND** o logout retorna a area publica

#### Scenario: Login invalido

- **WHEN** uma credencial invalida e usada
- **THEN** a mensagem de erro i18n e exibida e nenhuma sessao e criada

#### Scenario: Desvio de MFA (009b aplicada)

- **WHEN** um usuario com MFA habilitado loga
- **THEN** a etapa de verificacao (A2) e exigida antes do shell

### Requirement: Build e integracao com o portao

O projeto SHALL permanecer sem erros de TypeScript/build, com o `test:e2e` disponivel para o
portao e o bloco de CI documentado como opcional.

#### Scenario: Verificacao

- **WHEN** o typecheck/build roda e o portao chama `test:e2e` com o ambiente de pe
- **THEN** nao ha erros e o smoke passa
- **AND** o `ci.yml` contem o bloco e2e comentado com instrucoes
