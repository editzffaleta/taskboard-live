<!-- TEMPLATE — design da fundacao e2e. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O catalogo tem a skill `e2e-playwright` e o time tem o `e2e-specialist`, mas o projeto gerado
nasce sem Playwright. Esta change instala a fundacao uma vez; specs por tela vem depois, change a
change, sobre os mesmos helpers.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Playwright configurado (chromium, trace em falha) com `E2E_BASE_URL` por env.
- Helpers de sessao por papel em cima do seed demo (`014`).
- Smoke do login verde local e chamavel pelo portao (`test:e2e`).

**Non-Goals:**
- Cobertura e2e das telas do nucleo (D2, D7, B9…) — entra por change, com a skill.
- E2E no `ci.yml` padrao — exige servicos (DB/apps) que o CI basico nao tem; fica opcional
  comentado.
- Testes cross-browser (firefox/webkit) e visual regression — futuras, se o produto exigir.

## Decisions

- **Playwright na raiz** (nao por app): o e2e atravessa frontend+backend; config unica, um
  comando. Alternativa (dentro de `apps/frontend`) descartada: acopla ao workspace errado.
- **Seed demo como massa base**: os helpers logam com `admin@demo.dev` etc. — sem fixtures
  proprias de sessao; specs especificos criam apenas o dado que testam.
- **Assume apps de pe** (sem `webServer` do Playwright orquestrando o monorepo): o dev roda
  `npm run dev` (ou aponta `E2E_BASE_URL` a um ambiente); simples e previsivel no portao.
- **Smoke minimo e estavel**: login ok / login invalido / logout (+ desvio MFA se `009b`) — o
  suficiente para pegar quebra de fundacao sem virar suite flaky.
- **Skills**: e2e-playwright (estrutura dos specs e seletores).

## Risks / Trade-offs

- [Flakiness] → Seletores por role/label (skill), trace/screenshot em falha, sem sleeps fixos.
- [Apps fora do ar no portao] → `test:e2e` falha rapido com mensagem de pre-condicao (checa o
  `E2E_BASE_URL` responder antes de rodar os specs).
- [Custo de manter e2e por tela] → Fora do escopo: esta change entrega so a fundacao + smoke.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
