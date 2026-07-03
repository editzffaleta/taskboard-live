<!-- TEMPLATE — tasks do hardening HTTP. Checkboxes vazios; marque com evidencia. Cada task tem
**Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `001` (bootstrap), `005` (rotas de auth). Limites condicionais: `009b`,
> `009c`, `008c` **apenas se aplicadas**. **Nao faca:** CAPTCHA/deteccao de bot; lockout de conta;
> mudanca funcional nas rotas; storage distribuido de rate limit. **Principio:** tudo aqui e
> envelope HTTP — dominio intocado.

## 1. Back-end

- [ ] 1.1 Instalar `helmet` e `@nestjs/throttler`; no `main.ts` (skill [backend-nest-config](../../../.claude/skills/backend-nest-config)): `helmet` (CSP off), limite de body JSON (default `1mb`) e `trust proxy` (IP real atras do Traefik).
  - **Aceite:** headers presentes na resposta; payload acima do limite → 413; IP real no request.
- [ ] 1.2 CORS explicito: origem unica de `CORS_ORIGIN` com `credentials`; em `NODE_ENV=production` sem a env, o boot falha com erro claro; em dev, default `http://localhost:3000`.
  - **Aceite:** origem correta aceita; outra origem bloqueada; producao sem env nao sobe.
- [ ] 1.3 Throttler global (`THROTTLE_TTL`/`THROTTLE_LIMIT`, default 60s/100) registrado no modulo raiz, com resposta `429` usando a chave i18n `http.too_many_requests`.
  - **Aceite:** estouro global → 429 com a mensagem i18n.
- [ ] 1.4 Limites estritos (`THROTTLE_AUTH_TTL`/`THROTTLE_AUTH_LIMIT`, default 60s/5) por decorator nas rotas publicas presentes: `POST /auth/login`, `POST /join`; **se `009b`**: `POST /auth/login/mfa`; **se `009c`**: `POST /auth/password/forgot` e `POST /auth/password/reset`; **se `008c`**: o aceite publico do convite (A6).
  - **Aceite:** cada rota presente responde 429 apos o limite estrito; rotas de changes ausentes nao sao referenciadas.
- [ ] 1.5 Adicionar as envs ao `.env.example` (`CORS_ORIGIN=`, `THROTTLE_TTL=60`, `THROTTLE_LIMIT=100`, `THROTTLE_AUTH_TTL=60`, `THROTTLE_AUTH_LIMIT=5`) e a chave i18n (pt/en).
  - **Aceite:** `.env.example` e i18n atualizados.
- [ ] 1.6 Testes de integracao: janela curta via env de teste; login estoura em N tentativas → 429; requisicao de outra origem bloqueada pelo CORS.
  - **Aceite:** cenarios cobertos; suite verde.

## 2. Verificacao

- [ ] 2.1 Rodar `npx tsc --noEmit` (backend), os testes e validar manualmente: headers do helmet na resposta, 429 no login apos o limite, frontend segue funcionando pela origem configurada.
  - **Aceite:** `tsc` limpo; testes verdes; validacao manual registrada.
