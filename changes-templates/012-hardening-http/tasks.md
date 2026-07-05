> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `001` (bootstrap), `004` (login/sessao). **Nao faca:** CAPTCHA/deteccao de
> bot; lockout de conta; mudanca funcional nas rotas; storage distribuido de rate limit.
> **Principio:** tudo aqui e envelope HTTP/WS — dominio intocado.

## 1. Back-end

- [ ] 1.1 Instalar `helmet` e `@nestjs/throttler`; no `main.ts` (skill [backend-nest-config](../../../.claude/skills/backend-nest-config)): `helmet` (CSP off), limite de body JSON (default `1mb`) e `trust proxy` (IP real atras do Traefik).
  - **Aceite:** headers presentes na resposta; payload acima do limite → 413; IP real no request.
- [ ] 1.2 CORS explicito no HTTP: origem unica de `CORS_ORIGIN` com `credentials`; em `NODE_ENV=production` sem a env, o boot falha com erro claro; em dev, default `http://localhost:3000`.
  - **Aceite:** origem correta aceita; outra origem bloqueada; producao sem env nao sobe.
  - **Pre:** `001`.
- [ ] 1.3 CORS explicito no gateway Socket.IO (`006` — tempo real): aplicar a mesma `CORS_ORIGIN` na opcao `cors` do `@WebSocketGateway`/adapter, para que o cliente do quadro ao vivo so conecte da origem permitida.
  - **Aceite:** conexao WebSocket da origem configurada e aceita; de outra origem, a conexao e recusada.
  - **Pre:** `006` aplicada.
- [ ] 1.4 Throttler global (`THROTTLE_TTL`/`THROTTLE_LIMIT`, default 60s/100) registrado no modulo raiz, com resposta `429` usando a chave i18n `http.too_many_requests`.
  - **Aceite:** estouro global → 429 com a mensagem i18n.
- [ ] 1.5 Limites estritos (`THROTTLE_AUTH_TTL`/`THROTTLE_AUTH_LIMIT`, default 60s/5) por decorator nas duas rotas publicas de auth do projeto: `POST /auth/register` e `POST /auth/login`.
  - **Aceite:** cada uma das duas rotas responde 429 apos o limite estrito.
  - **Guardrail:** nao referenciar rotas de MFA, recuperacao de senha ou convite — este projeto nao as tem.
- [ ] 1.6 Adicionar as envs ao `.env.example` (`CORS_ORIGIN=`, `THROTTLE_TTL=60`, `THROTTLE_LIMIT=100`, `THROTTLE_AUTH_TTL=60`, `THROTTLE_AUTH_LIMIT=5`) e a chave i18n (pt/en).
  - **Aceite:** `.env.example` e i18n atualizados.
- [ ] 1.7 Testes de integracao: janela curta via env de teste; `POST /auth/register` e `POST /auth/login` estouram em N tentativas → 429; requisicao HTTP de outra origem bloqueada pelo CORS; conexao Socket.IO de outra origem recusada.
  - **Aceite:** cenarios cobertos; suite verde.

## 2. Verificacao

- [ ] 2.1 Rodar `npx tsc --noEmit` (backend), os testes e validar manualmente: headers do helmet na resposta, 429 no registro e no login apos o limite, frontend segue funcionando (HTTP e WebSocket) pela origem configurada.
  - **Aceite:** `tsc` limpo; testes verdes; validacao manual registrada.
