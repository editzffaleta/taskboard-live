<!--
TEMPLATE DE CHANGE — 015-fundacao-e2e (Playwright instalado + smoke de login).
Extensao transversal (opcional). A skill e2e-playwright e o e2e-specialist ja existem;
esta change instala a fundacao que eles assumem.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/fundacao-e2e/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O `/portao` e o gate mencionam e2e "se houver", a skill `e2e-playwright` e o `e2e-specialist`
existem — mas nenhuma change instala o Playwright nem cria o primeiro spec. Esta mudanca poe a
fundacao no lugar: config, estrutura, smoke test do fluxo mais critico (login) e o script
`test:e2e` que o portao ja espera.

## What Changes

- **Playwright** instalado na raiz do monorepo (`@playwright/test` + browsers via
  `npx playwright install chromium`).
- **`playwright.config.ts`**: `baseURL` por env (`E2E_BASE_URL`, default `http://localhost:3000`),
  projeto chromium, trace/screenshot em falha, `testDir: e2e/`.
- **Estrutura `e2e/`** com helpers minimos (login como papel X usando as credenciais do seed
  demo da `014`) e o **smoke de login**: credencial valida → redireciona ao shell autenticado;
  invalida → mensagem de erro i18n; logout → volta ao publico. **Se `009b`** estiver aplicada, o
  smoke cobre tambem o desvio "usuario com MFA cai na etapa A2".
- **Script `test:e2e`** na raiz (o gate/`/portao` ja o chamam quando presente); pre-condicao
  documentada: apps de pe (`npm run dev`) e seed demo aplicado.
- **CI**: e2e **fora** do `ci.yml` padrao (exige banco + apps de pe); bloco opcional comentado no
  workflow com as instrucoes para liga-lo quando o projeto tiver ambiente de CI com servicos.

## Capabilities

### New Capabilities
- `fundacao-e2e`: infraestrutura de testes ponta a ponta do {{produto}} (Playwright configurado,
  helpers de sessao por papel e smoke do fluxo de login) executavel local e no portao.

### Modified Capabilities
<!-- Nenhuma: infraestrutura de teste; nenhum comportamento de produto muda. -->

## Impact

- **Raiz do monorepo**: dependencia `@playwright/test`, `playwright.config.ts`, pasta `e2e/`,
  script `test:e2e`; env `E2E_BASE_URL` no `.env.example`.
- **Backend/Frontend/Dominio**: intocados.
- **Dependencias**: `005` (login), `014` (credenciais demo para os helpers). Condicional: `009b`
  (cenario de MFA no smoke).
- **Habilita**: o `e2e-specialist` e a skill `e2e-playwright` passam a ter base real; novas
  changes de tela ganham specs e2e incrementais sobre estes helpers.
