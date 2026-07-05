# fundacao-e2e Specification

## Purpose
TBD - created by archiving change 013-fundacao-e2e. Update Purpose after archive.
## Requirements
### Requirement: Playwright configurado na raiz

O monorepo do TaskBoard Live SHALL ter o Playwright instalado e configurado (chromium, `baseURL`
por env, trace e screenshot em falha) com os testes em `e2e/` e o script `test:e2e`.

#### Scenario: Fundacao executavel

- **WHEN** `npm run test:e2e` roda com os apps de pe e o banco disponivel
- **THEN** a suite executa contra `E2E_BASE_URL`
- **AND** falhas geram trace/screenshot para diagnostico

#### Scenario: Pre-condicao clara

- **WHEN** `E2E_BASE_URL` nao responde
- **THEN** a execucao falha rapido com a instrucao de subir os apps

### Requirement: Smoke do fluxo de autenticacao

A suite SHALL cobrir o fluxo critico de autenticacao do TaskBoard Live: registro seguido de
login, login invalido e logout.

#### Scenario: Registro, login e logout

- **WHEN** um usuario se registra e loga com credencial valida
- **THEN** chega ao dashboard
- **AND** o logout retorna a area publica

#### Scenario: Login invalido

- **WHEN** uma credencial invalida e usada
- **THEN** a mensagem de erro i18n e exibida e nenhuma sessao e criada

### Requirement: Vitrine de colaboracao ao vivo

A suite SHALL incluir um spec que comprove, com dois usuarios simultaneos em contextos de
navegador isolados, que mudancas de estado no quadro (mover um cartao entre colunas) se
propagam em tempo real via Socket.IO para os demais membros, sem reload de pagina.

#### Scenario: Cartao movido por um usuario aparece ao vivo para o outro

- **WHEN** o usuario A (dono do quadro) e o usuario B (membro do mesmo quadro) tem o quadro
  aberto cada um em seu proprio `BrowserContext`
- **AND** o usuario A move um cartao de uma coluna para outra
- **THEN** a aba do usuario B mostra o cartao na nova coluna dentro de um timeout curto
- **AND** nenhum reload de pagina e necessario para essa atualizacao aparecer

### Requirement: Build e integracao com o portao

O projeto SHALL permanecer sem erros de TypeScript/build, com o `test:e2e` disponivel para o
portao e o bloco de CI documentado como opcional.

#### Scenario: Verificacao

- **WHEN** o typecheck/build roda e o portao chama `test:e2e` com o ambiente de pe
- **THEN** nao ha erros e o smoke de autenticacao e o spec de colaboracao ao vivo passam
- **AND** o `ci.yml` contem o bloco e2e comentado com instrucoes

