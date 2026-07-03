<!-- TEMPLATE — design do hardening HTTP. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O bootstrap do Nest (`001`) e minimo e as rotas publicas de auth cresceram (`004`, `005`, e
condicionalmente `008c`/`009b`/`009c`). O design da `009b` registrou rate limit como hardening
futuro — este e o futuro. Tudo aqui e camada HTTP: dominio e casos de uso nao mudam.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Headers de seguranca, CORS de origem unica por env (fail-fast em producao) e payload limitado.
- Rate limit global folgado + estrito nas rotas publicas de auth existentes, com `429` i18n.
- Testavel: janela/limites configuraveis por env para os testes exercitarem o `429`.

**Non-Goals:**
- WAF, CDN, mTLS, allowlist de IP — infraestrutura externa ao app.
- CAPTCHA e deteccao de bot — decisao de produto, change propria se necessaria.
- Lockout de conta por tentativas (state por usuario) — o limite aqui e por IP/rota; lockout e
  change de dominio futura se o produto exigir.

## Decisions

- **Throttler por IP com dois niveis**: global folgado (nao atrapalha uso legitimo) e estrito nos
  endpoints sensiveis via decorator por rota. Guard atras do proxy do Dokploy/Traefik → habilitar
  `trust proxy` para o IP real (`X-Forwarded-For`).
- **CORS fail-fast**: em `NODE_ENV=production` sem `CORS_ORIGIN`, o boot aborta com erro claro —
  melhor que subir aberto. Em dev, default `http://localhost:3000`.
- **Helmet sem CSP**: a API serve JSON; CSP pertence ao frontend (Next). Demais headers ativos.
- **Limites por env com defaults seguros**: `THROTTLE_TTL`/`THROTTLE_LIMIT` (global) e
  `THROTTLE_AUTH_TTL`/`THROTTLE_AUTH_LIMIT` (estrito) — testes usam janelas curtas.
- **Skills**: backend-nest-config (bootstrap), backend-nest-controller (decorators por rota).

## Risks / Trade-offs

- [IP compartilhado (NAT) atingir o limite] → Limites estritos so nas rotas de auth; global folgado.
- [Proxy mal configurado mascarar IPs] → `trust proxy` documentado; validar no deploy que o IP
  logado e o do cliente, nao o do Traefik.
- [Rate limit em memoria com multiplas replicas] → Suficiente para 1 replica (padrao do template);
  storage compartilhado (Redis) entra como change quando houver escala horizontal.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
