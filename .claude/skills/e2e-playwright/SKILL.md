---
name: e2e-playwright
description: Cria e roda testes end-to-end com Playwright sobre o stack do projeto (backend NestJS :4000 + frontend Next.js :3000), cobrindo os fluxos criticos (registro -> login -> acao principal do modulo). Padroniza setup, baseURL, webServer, page objects por data-testid, autenticacao via storageState e a integracao com o gate de qualidade. Use quando o pedido envolver teste e2e, fluxo de ponta a ponta, smoke de UI ou cobertura de jornada do usuario.
compatibility: claude-code, opencode
---

# E2E Playwright

Use esta skill para cobrir os **fluxos criticos ponta a ponta** com Playwright, sobre o backend
(`apps/backend` :4000) e o frontend (`apps/frontend` :3000) reais. E o nivel acima do Jest
unitario: valida a jornada do usuario de verdade (registro -> login -> CRUD do modulo).

Local sugerido do projeto e2e: **`apps/e2e`** (workspace do Turborepo) — ou `tests/e2e/` se
preferir fora de `apps/`. Mantenha consistente no monorepo.

## Entradas obrigatorias

1. o(s) fluxo(s) a cobrir (ex.: "cadastro + login + criar registro no modulo X")
2. os `data-testid` das telas envolvidas (alinhar com o `frontend-specialist`)
3. como subir backend e frontend localmente (portas, `.env` de teste/seed)

## Referencias obrigatorias

Antes de escrever testes, ler:

1. `references/playwright-conventions.md` (padroes inegociaveis)
2. `references/few-shots/playwright.config.example.ts` (baseURL + webServer + projects)
3. `references/few-shots/auth.setup.example.ts` (login uma vez -> storageState)
4. `references/few-shots/register-login.e2e.example.ts` (fluxo critico de referencia)
5. `references/mandatory-readings.md`

## Setup do projeto e2e

1. Criar o workspace `apps/e2e` (`package.json` com `@playwright/test`), `npm i -D @playwright/test`
   e `npx playwright install --with-deps chromium`.
2. `playwright.config.ts`: `baseURL` = `http://localhost:3000`; **`webServer`** subindo backend e
   frontend (ou apontando para um `npm run dev` ja em pe); `projects` com um `setup` de auth +
   o projeto principal usando `storageState`.
3. Adicionar script `test:e2e` no workspace e ligar no `turbo` (pipeline) e no gate.

## Padroes (resumo — ver conventions)

- **Seletores por `data-testid`**, nunca por texto/classe fragil.
- **Page Objects** por tela (encapsulam seletores e acoes).
- **Zero `waitForTimeout`/sleep**: usar auto-waiting e asserts (`expect(locator).toBeVisible()`).
- **Isolamento**: cada teste cria seu proprio dado (usuario/registro) com sufixo unico; nada de
  depender da ordem nem de estado deixado por outro teste.
- **Auth via `storageState`**: logar uma vez no `setup`, reutilizar o estado nos testes.
- **Multi-tenant**: testar tambem o caso negativo (usuario de outra org NAO ve o recurso).
- **Dados de teste**: usar banco/seed de teste; nunca rodar e2e destrutivo contra dado real.

## Workflow deterministico

1. Confirmar o setup (`apps/e2e` + config + auth.setup) — criar se faltar.
2. Para cada fluxo: criar/atualizar o Page Object das telas e um spec por jornada.
3. Cobrir o caminho feliz + ao menos um negativo (acesso negado / validacao).
4. Rodar `npm run test:e2e`; estabilizar flakes (seletor/auto-wait, nunca sleep).
5. Ligar no gate: o `e2e-specialist` garante `test:e2e` verde antes do PR.

## Guardrails

- Nao rodar e2e destrutivo contra banco de producao/dados reais.
- Nao commitar credenciais de teste reais; usar `.env` de teste / `.env.example`.
- Nao usar sleeps fixos nem seletores frageis.
- Nao deixar teste dependente de ordem ou de estado global.

## Saida esperada

- `apps/e2e` configurado (config + auth.setup + Page Objects + specs)
- specs cobrindo os fluxos criticos (feliz + negativo), isolados e estaveis
- `test:e2e` ligado ao `turbo` e ao gate (`scripts/ci/gate.sh` / `ci.yml`)
- resumo: fluxos cobertos, flakes resolvidos, o que ficou fora de escopo
