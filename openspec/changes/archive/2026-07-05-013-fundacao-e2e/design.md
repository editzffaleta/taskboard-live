## Context

O catalogo tem a skill `e2e-playwright`, mas o projeto gerado nasce sem Playwright. O TaskBoard
Live e um kanban colaborativo em tempo real (Socket.IO); a fundacao e2e desta change existe para
sustentar, desde o inicio, o teste que mais importa para o produto: dois usuarios vendo o mesmo
quadro atualizar ao vivo. Specs por tela adicionais vem depois, change a change, sobre os mesmos
helpers.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Playwright configurado (chromium, trace em falha) com `E2E_BASE_URL` por env.
- Helpers de registro/login, criacao de quadro e adicao de membro, reutilizaveis por qualquer
  spec futuro.
- Smoke de autenticacao verde local e chamavel pelo portao (`test:e2e`).
- Spec vitrine de colaboracao ao vivo: dois contextos de navegador isolados, mudanca de estado
  em um refletida no outro sem reload, via Socket.IO.

**Non-Goals:**
- Cobertura e2e exaustiva de todas as telas do nucleo — entra por change, com a skill.
- E2E no `ci.yml` padrao — exige servicos (DB/apps) que o CI basico nao tem; fica opcional
  comentado.
- Testes cross-browser (firefox/webkit) e visual regression — futuras, se o produto exigir.

## Decisions

- **Playwright na raiz** (nao por app): o e2e atravessa frontend+backend+Socket.IO; config
  unica, um comando. Alternativa (dentro de `apps/frontend`) descartada: acopla ao workspace
  errado.
- **Sem seed fixo**: como o projeto nao tem seed demo dedicado, os helpers registram usuarios
  novos via `POST /auth/register` (ou pela UI) a cada execucao, evitando colisao de dados entre
  rodadas.
- **Dois `BrowserContext`, nao duas `page` da mesma sessao**: o spec vitrine precisa de duas
  identidades autenticadas distintas (dono e membro) navegando simultaneamente — contextos
  isolados de cookies/local storage sao a unica forma correta de simular isso no Playwright.
- **Assume apps de pe** (sem `webServer` do Playwright orquestrando o monorepo): o dev roda
  `npm run dev` (ou aponta `E2E_BASE_URL` a um ambiente); simples e previsivel no portao.
- **Timeout curto e explicito no spec vitrine**: a assercao de "cartao na nova coluna" usa
  `expect(...).toBeVisible({ timeout })` com um valor pequeno e documentado — suficiente para o
  round-trip do Socket.IO, insuficiente para mascarar uma regressao real de tempo real.
- **Skills**: e2e-playwright (estrutura dos specs e seletores).

## Risks / Trade-offs

- [Flakiness no spec vitrine] → Seletores por role/label (skill), timeout de assercao explicito
  (nao `page.waitForTimeout` fixo), trace/screenshot em falha.
- [Apps fora do ar no portao] → `test:e2e` falha rapido com mensagem de pre-condicao (checa o
  `E2E_BASE_URL` responder antes de rodar os specs).
- [Dados de teste colidindo entre execucoes] → Helpers geram email/nome unicos por execucao
  (timestamp/uuid), sem depender de seed fixo.
- [Custo de manter e2e por tela] → Fora do escopo: esta change entrega so a fundacao + smoke +
  vitrine.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na
  evidencia.
