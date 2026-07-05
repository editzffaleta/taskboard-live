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

O TaskBoard Live e um quadro kanban colaborativo em tempo real — seu valor central so se prova
com **duas pessoas olhando o mesmo quadro ao mesmo tempo**. A skill `e2e-playwright` existe, mas
nenhuma change instala o Playwright nem cria o primeiro spec. Esta mudanca poe a fundacao no
lugar: config, estrutura, smoke de autenticacao e o **spec vitrine de colaboracao ao vivo** — a
prova concreta, reproduzivel e demonstravel em portfolio de que o Socket.IO propaga mudancas de
estado entre usuarios sem reload.

## What Changes

- **Playwright** instalado na raiz do monorepo (`@playwright/test` + browsers via
  `npx playwright install chromium`).
- **`playwright.config.ts`**: `baseURL` por env (`E2E_BASE_URL`, default `http://localhost:3000`),
  projeto chromium, trace/screenshot em falha, `testDir: e2e/`.
- **Estrutura `e2e/`** com helpers minimos:
  - registrar e logar um usuario (via `POST /auth/register` + `POST /auth/login` ou pela UI);
  - criar um quadro;
  - adicionar um segundo usuario como membro do quadro.
- **Spec 1 — smoke de auth**: registro → login → chega ao dashboard; login invalido → mensagem
  de erro i18n; logout → volta a area publica.
- **Spec 2 — vitrine de colaboracao ao vivo**: dois `BrowserContext` isolados (usuario A, dono do
  quadro; usuario B, membro do mesmo quadro) abrem o mesmo quadro em paralelo; A move um cartao
  de uma coluna para outra; a aba de B recebe a atualizacao via Socket.IO e mostra o cartao na
  nova coluna **sem reload**, dentro de um timeout curto. Pre-condicao documentada: apps de pe
  (`npm run dev`) e banco disponivel.
- **Script `test:e2e`** na raiz (o `/portao` ja o chama quando presente); e2e **fora** do `ci.yml`
  padrao (bloco comentado, com instrucoes para ligar quando houver ambiente com servicos).

## Capabilities

### New Capabilities
- `fundacao-e2e`: infraestrutura de testes ponta a ponta do TaskBoard Live (Playwright
  configurado, helpers de autenticacao/quadro/membros e os specs de smoke de auth e de
  colaboracao ao vivo) executavel local e no portao.

### Modified Capabilities
<!-- Nenhuma: infraestrutura de teste; nenhum comportamento de produto muda. -->

## Impact

- **Raiz do monorepo**: dependencia `@playwright/test`, `playwright.config.ts`, pasta `e2e/`,
  script `test:e2e`; env `E2E_BASE_URL` no `.env.example`.
- **Backend/Frontend/Dominio**: intocados.
- **Dependencias**: `009` (quadro ao vivo — UI de colunas/cartoes com Socket.IO), `010`
  (compartilhamento e membros), `004` (login/sessao), `005` (quadros CRUD).
- **Habilita**: a skill `e2e-playwright` passa a ter base real; novas changes de tela ganham
  specs e2e incrementais sobre estes helpers; o spec vitrine serve de material de demonstracao
  do produto.
