<!--
TEMPLATE DE CHANGE — 012-hardening-http (helmet + CORS explicito + rate limit).
Extensao transversal (recomendada p/ producao). Endurece a superficie HTTP do backend,
com limites estritos nas rotas publicas de autenticacao presentes no projeto.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/protecao-http/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O backend nasce sem headers de seguranca, sem CORS explicito e sem rate limit — e as rotas
publicas de autenticacao (login, registro, esqueci-a-senha, segunda etapa do MFA) sao alvo obvio
de forca bruta e enumeracao. Esta mudanca fecha a superficie HTTP com o hardening minimo de
producao, deixando o rate limit dedicado que a `009b` apontou como pendencia.

## What Changes

- **Headers**: `helmet` no bootstrap do Nest (CSP desativada na API — e JSON, nao HTML).
- **CORS explicito**: origem unica via env `CORS_ORIGIN` (a URL do frontend), com credenciais;
  sem env definida em producao, o boot falha rapido (fail-fast) em vez de abrir `*`.
- **Limite de payload**: body JSON limitado (default 1mb) no bootstrap.
- **Rate limit global** com `@nestjs/throttler` (default folgado, ex.: 100 req/min por IP) e
  **limites estritos por rota publica de auth existente no projeto**:
  `POST /auth/login` e `POST /join` (`004`/`005`); `POST /auth/login/mfa` (**se `009b`**);
  `POST /auth/password/forgot` e `POST /auth/password/reset` (**se `009c`**);
  aceite de convite A6 (**se `008c`**). Excedeu → `429` com mensagem i18n.
- **Testes** dos limites estritos (janela pequena em teste) e envs no `.env.example`.

## Capabilities

### New Capabilities
- `protecao-http`: hardening da superficie HTTP do {{produto}} — headers de seguranca, CORS
  explicito por env, limite de payload e rate limiting global + estrito nas rotas publicas de
  autenticacao presentes.

### Modified Capabilities
<!-- Nenhuma: o comportamento funcional das rotas nao muda; muda o envelope HTTP. -->

## Impact

- **Backend**: `helmet`, `@nestjs/throttler`; bootstrap (`main.ts`) e modulo raiz; decorators de
  limite nas rotas publicas presentes; chave i18n de `429`; envs `CORS_ORIGIN` e limites.
- **Frontend**: nenhum codigo — apenas passa a ser a unica origem aceita.
- **Dominio**: intocado.
- **Dependencias**: `001` (base), `005` (rotas de auth). Condicionais: `009b`, `009c`, `008c`.
- **Habilita**: producao exposta com postura minima de seguranca HTTP; base para WAF/CDN futuros.
