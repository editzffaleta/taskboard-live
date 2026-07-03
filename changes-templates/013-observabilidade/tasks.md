<!-- TEMPLATE — tasks da observabilidade. Checkboxes vazios; marque com evidencia. Cada task tem
**Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `001` (bootstrap). **Nao faca:** metricas/tracing/dashboards; Sentry no
> frontend; logging de body de requisicao; agregador externo de logs. **Principio:** um
> `request-id` liga log, resposta e erro capturado.

## 1. Back-end

- [ ] 1.1 Instalar e configurar `nestjs-pino` como logger do app (skill [backend-nest-config](../../../.claude/skills/backend-nest-config)): JSON em producao, pretty em dev (`LOG_LEVEL`, default `info`); log automatico por requisicao com metodo, rota, status e duracao.
  - **Aceite:** um log por request; formato por ambiente; `LOG_LEVEL` respeitado.
- [ ] 1.2 `request-id`: reutilizar `x-request-id` de entrada ou gerar UUID; incluir em todo log da requisicao e devolver no header da resposta.
  - **Aceite:** id presente nos logs e no header; id de entrada preservado.
- [ ] 1.3 Redaction nos logs: `authorization`, `cookie`, `password`, `secret`, `token` (e variantes) nunca aparecem em claro.
  - **Aceite:** teste envia esses campos e o log mostra `[Redacted]`.
- [ ] 1.4 Error tracking opcional: inicializar `@sentry/node` **somente** com `SENTRY_DSN` definida (try/catch com warn); capturar exceptions nao tratadas no filtro global com o `request-id` como tag.
  - **Aceite:** sem DSN, nada inicializa; com DSN, exception de teste chega com a tag.
- [ ] 1.5 `GET /health` com verificacao de banco: `SELECT 1` via Prisma com timeout curto → `200 { status:'ok', db:'up' }`; falha → `503`. Criar a rota se nao existir; enriquecer se existir (mantendo o path `/health` que os Dockerfiles usam).
  - **Aceite:** 200 com banco de pe; 503 com banco fora; healthcheck do container continua verde.
- [ ] 1.6 Envs no `.env.example` (`LOG_LEVEL=info`, `SENTRY_DSN=` com comentario GlitchTip/Sentry) e nota no runbook (`docs/deploy-dokploy.md`) sobre rodar GlitchTip como servico do painel.
  - **Aceite:** `.env.example` e runbook atualizados.
- [ ] 1.7 Testes: redaction (1.3), health 200/503, request-id propagado.
  - **Aceite:** cenarios cobertos; suite verde.

## 2. Verificacao

- [ ] 2.1 Rodar `npx tsc --noEmit` (backend), os testes e validar manualmente: logs JSON com request-id em producao-like, `/health` 200, e (com DSN de teste) um erro proposital aparecendo no GlitchTip/Sentry.
  - **Aceite:** `tsc` limpo; testes verdes; validacao manual registrada.
