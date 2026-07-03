<!-- TEMPLATE — design da observabilidade. Placeholders: {{produto}}, {{namespace}}. -->

## Context

Os Dockerfiles do template ja fazem healthcheck em `/health` e o Dokploy so cria rota Traefik com
healthcheck saudavel — mas nada garante que `/health` verifique o banco, e os logs atuais nao
permitem seguir uma requisicao. Esta mudanca fecha a base minima de operacao.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Um log JSON por requisicao com `request-id`, status e duracao; redaction de sensiveis.
- Captura de exceptions nao tratadas quando `SENTRY_DSN` existir (GlitchTip-first).
- `/health` que responde 200 so com o banco acessivel (503 caso contrario).

**Non-Goals:**
- Metricas/Prometheus, tracing distribuido (OpenTelemetry), dashboards — changes futuras.
- Tracking de erros do frontend (Sentry browser) — change propria.
- Agregacao externa de logs — os logs JSON ficam no stdout (o painel do Dokploy exibe).

## Decisions

- **pino via nestjs-pino**: logger unico do app (substitui o Logger default), JSON em producao e
  `pino-pretty` em dev por `LOG_LEVEL`/`NODE_ENV`. Alternativa (winston) descartada: pino e o
  padrao de performance no Node e integra `pino-http` com request-id nativo.
- **request-id**: aproveita `x-request-id` de entrada (Traefik/cliente) ou gera UUID; devolve no
  header da resposta; incluido como tag no Sentry — um id liga log, resposta e erro capturado.
- **Sentry SDK opcional por env**: sem `SENTRY_DSN`, nada inicializa (zero overhead, zero rede).
  Compativel com GlitchTip self-hosted (mesmo protocolo) — que pode rodar no proprio Dokploy.
- **/health honesto**: `SELECT 1` via Prisma com timeout curto; falhou → 503. E o contrato que o
  healthcheck do Dockerfile/Traefik ja espera.
- **Skills**: backend-nest-config (bootstrap/logger), backend-nest-controller (rota /health).

## Risks / Trade-offs

- [Log verboso custar disco/ruido] → `LOG_LEVEL` por env (info em prod, debug em dev); sem body
  logging por padrao.
- [Vazamento de sensivel em log] → Redaction explicita (authorization, cookie, password, secret,
  token) testada; e requisito, nao opcional.
- [DSN invalida travar o boot] → Inicializacao do Sentry em try/catch com warn; app sobe sem tracking.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
