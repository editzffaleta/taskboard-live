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

O backend do TaskBoard Live nasce sem headers de seguranca, sem CORS explicito e sem rate
limit — e as rotas publicas de autenticacao (`POST /auth/register` e `POST /auth/login`) sao
alvo obvio de forca bruta e enumeracao, ainda mais expostas por serem as unicas portas de
entrada de um quadro colaborativo em tempo real. Esta mudanca fecha a superficie HTTP com o
hardening minimo de producao, cobrindo tambem o gateway Socket.IO que carrega o quadro ao vivo.

## What Changes

- **Headers**: `helmet` no bootstrap do Nest (CSP desativada na API — e JSON, nao HTML).
- **CORS explicito**: origem unica via env `CORS_ORIGIN` (a URL do frontend do TaskBoard Live),
  com credenciais; sem env definida em producao, o boot falha rapido (fail-fast) em vez de abrir
  `*`. A mesma origem e aplicada ao **gateway Socket.IO** (a origem do cliente WebSocket que
  conecta ao quadro ao vivo), nao so ao HTTP.
- **Limite de payload**: body JSON limitado (default 1mb) no bootstrap.
- **Rate limit global** com `@nestjs/throttler` (default folgado, ex.: 100 req/min por IP) e
  **limites estritos nas duas rotas publicas de auth do projeto**: `POST /auth/register` e
  `POST /auth/login`. Excedeu → `429` com mensagem i18n.
- **Testes** dos limites estritos (janela pequena em teste) e envs no `.env.example`.

## Capabilities

### New Capabilities
- `protecao-http`: hardening da superficie HTTP e WebSocket do TaskBoard Live — headers de
  seguranca, CORS explicito por env (HTTP e gateway Socket.IO), limite de payload e rate
  limiting global + estrito em `/auth/register` e `/auth/login`.

### Modified Capabilities
<!-- Nenhuma: o comportamento funcional das rotas nao muda; muda o envelope HTTP/WS. -->

## Impact

- **Backend**: `helmet`, `@nestjs/throttler`; bootstrap (`main.ts`) e modulo raiz; CORS do
  gateway Socket.IO; decorators de limite em `/auth/register` e `/auth/login`; chave i18n de
  `429`; envs `CORS_ORIGIN` e limites de throttle.
- **Frontend**: nenhum codigo — apenas passa a ser a unica origem aceita (HTTP e WebSocket).
- **Dominio**: intocado.
- **Dependencias**: `001` (base do projeto), `004` (login/sessao).
- **Habilita**: producao exposta com postura minima de seguranca HTTP/WS; base para WAF/CDN
  futuros.
