## Context

O bootstrap do Nest (`001`) e minimo e as rotas publicas de auth (`004`) sao apenas
`POST /auth/register` e `POST /auth/login`. O TaskBoard Live tambem expoe um gateway
Socket.IO (`006`) para o quadro ao vivo, que precisa da mesma disciplina de CORS que o HTTP.
Tudo aqui e camada de transporte: dominio e casos de uso nao mudam.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Headers de seguranca, CORS de origem unica por env (fail-fast em producao) e payload
  limitado, aplicados tanto ao HTTP quanto ao gateway Socket.IO.
- Rate limit global folgado + estrito em `POST /auth/register` e `POST /auth/login`, com `429`
  i18n.
- Testavel: janela/limites configuraveis por env para os testes exercitarem o `429`.

**Non-Goals:**
- WAF, CDN, mTLS, allowlist de IP — infraestrutura externa ao app.
- CAPTCHA e deteccao de bot — decisao de produto, change propria se necessaria.
- Lockout de conta por tentativas (state por usuario) — o limite aqui e por IP/rota; lockout e
  change de dominio futura se o produto exigir.

## Decisions

- **Throttler por IP com dois niveis**: global folgado (nao atrapalha uso legitimo) e estrito em
  `/auth/register`/`/auth/login` via decorator por rota. Guard atras do proxy do
  Dokploy/Traefik → habilitar `trust proxy` para o IP real (`X-Forwarded-For`).
- **CORS fail-fast, HTTP e WebSocket**: em `NODE_ENV=production` sem `CORS_ORIGIN`, o boot aborta
  com erro claro — melhor que subir aberto. Em dev, default `http://localhost:3000`. A mesma
  `CORS_ORIGIN` configura tanto o `enableCors` do Nest quanto a opcao `cors` do
  `@WebSocketGateway`/adapter do Socket.IO, para que o cliente do quadro ao vivo so conecte da
  origem permitida.
- **Helmet sem CSP**: a API serve JSON; CSP pertence ao frontend (Next). Demais headers ativos.
- **Limites por env com defaults seguros**: `THROTTLE_TTL`/`THROTTLE_LIMIT` (global) e
  `THROTTLE_AUTH_TTL`/`THROTTLE_AUTH_LIMIT` (estrito) — testes usam janelas curtas.
- **Skills**: backend-nest-config (bootstrap e gateway), backend-nest-controller (decorators por
  rota).

## Risks / Trade-offs

- [IP compartilhado (NAT) atingir o limite] → Limites estritos so em `/auth/register` e
  `/auth/login`; global folgado.
- [Proxy mal configurado mascarar IPs] → `trust proxy` documentado; validar no deploy que o IP
  logado e o do cliente, nao o do Traefik.
- [Rate limit em memoria com multiplas replicas] → Suficiente para 1 replica (padrao do
  template); storage compartilhado (Redis) entra como change quando houver escala horizontal.
- [Gateway Socket.IO com CORS divergente do HTTP] → Mesma env `CORS_ORIGIN` alimenta os dois;
  teste cobre a rejeicao de origem estranha na conexao WebSocket.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na
  evidencia.
