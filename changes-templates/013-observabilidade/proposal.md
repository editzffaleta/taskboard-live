<!--
TEMPLATE DE CHANGE — 013-observabilidade (log estruturado + request-id + error tracking + health).
Extensao transversal (recomendada p/ producao). Sem ela, produzir = depurar as cegas.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/observabilidade/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O backend loga texto solto, sem correlacao por requisicao, sem captura de erros centralizada e
com um `/health` que nao diz se o banco esta vivo. Em producao no Dokploy isso vira depuracao as
cegas. Esta mudanca instala a base de observabilidade: log estruturado com `request-id`, error
tracking opcional (Sentry SDK, compativel com GlitchTip self-hosted) e health com verificacao de
dependencia.

## What Changes

- **Log estruturado** com `nestjs-pino`: JSON em producao, pretty em dev; um log por requisicao
  (metodo, rota, status, duracao); `request-id` gerado/propagado (header `x-request-id`) e
  presente em todo log da requisicao.
- **Redaction**: `authorization`, cookies e campos de senha/segredo nunca aparecem nos logs.
- **Error tracking opcional**: SDK do Sentry inicializado **apenas** quando `SENTRY_DSN` estiver
  definida (aponta para GlitchTip self-hosted ou Sentry SaaS); exceptions nao tratadas capturadas
  com o `request-id` como tag. Sem DSN, zero overhead.
- **`GET /health` com verificacao de banco**: responde `200 { status: 'ok', db: 'up' }` com o
  Prisma respondendo; banco fora → `503` (o healthcheck do Dokploy/Traefik reage). Cria a rota se
  nao existir; enriquece se existir.
- Envs no `.env.example` (`LOG_LEVEL`, `SENTRY_DSN` vazia) e nota no runbook do Dokploy sobre
  rodar o GlitchTip como servico do proprio painel.

## Capabilities

### New Capabilities
- `observabilidade`: logs estruturados com correlacao por `request-id` e redaction, captura
  opcional de erros (Sentry/GlitchTip) e health com verificacao de dependencias do {{produto}}.

### Modified Capabilities
<!-- Nenhuma: rotas de negocio inalteradas; /health e infraestrutural. -->

## Impact

- **Backend**: `nestjs-pino` (+`pino-http`), SDK `@sentry/node`; bootstrap e modulo raiz; filtro
  global de exceptions integrando captura; rota `/health`; envs novas.
- **Frontend**: nenhum nesta fase (tracking de frontend e change propria futura).
- **Dominio**: intocado.
- **Dependencias**: `001` (base). Combina com o healthcheck dos Dockerfiles (`deploy-dokploy`).
- **Habilita**: diagnostico em producao (logs correlacionados no painel do Dokploy), alertas de
  erro no GlitchTip e healthcheck honesto para o Traefik.
