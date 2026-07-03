<!--
TEMPLATE DE CHANGE — 009c-recuperacao-e-primeiro-acesso (reset por token + 1º acesso, telas A4/A5).
Split da antiga 009 (densa): o mecanismo MFA e a 009a; o login em duas etapas e a 009b;
aqui ficam a recuperacao de senha e o primeiro acesso.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigos de tela (A4/A5) referem-se aos seus mockups; ajuste-os.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/seguranca-acesso/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Quem esquece a senha nao tem saida hoje, e as contas criadas pelo admin (`008a`) nascem sem senha
propria. Esta mudanca completa a camada de seguranca de acesso com **recuperacao de senha por
token de uso unico** (tela A4) e **primeiro acesso** (tela A5) — o mesmo mecanismo de token, em
dois modos — sem revelar a existencia de e-mails.

## What Changes

- **Agregado `password-reset`**: `userId`, `token` (aleatorio seguro, unico), `kind`
  (`reset|first-access`), `expiresAt`, `used` (uso unico). Contrato com `findByToken`.
- **Casos de uso**: `request-password-reset` (cria token so se o usuario existir; resposta
  indiferente a existencia), `reset-password` (valida token `kind=reset`, re-hasheia a senha,
  marca `used`) e `set-initial-password` (modo `first-access`: define a senha inicial da conta
  criada pelo admin).
- **Persistencia**: migration criando o model `password_reset` (token unico); repositorio Prisma.
- **Endpoints publicos** (via `public.decorator`): `POST /auth/password/forgot`,
  `POST /auth/password/reset`, `GET /auth/first-access/:token` (validar) e
  `POST /auth/first-access/:token` (definir senha).
- **Frontend**: **A4** (solicitar/redefinir senha, mensagens neutras) e **A5** (primeiro acesso
  por token). No primeiro acesso, oferecer o **setup de MFA opcional** apos definir a senha —
  **somente se a `009a` estiver aplicada** (reusa a A3; sem a `009a`, o passo nao existe).
  Chaves i18n novas.
- **Sem envio de e-mail**: o link e gerado/exibido (admin copia/encaminha); envio automatico pode
  ser adicionado depois.

## Capabilities

### New Capabilities
<!-- Nenhuma. Esta mudanca completa a capability seguranca-acesso criada pela 009a. -->

### Modified Capabilities
- `seguranca-acesso` (`009a`): a capability ganha a recuperacao de senha por token, o primeiro
  acesso para contas criadas pelo admin e as telas A4/A5.

## Impact

- **Dominio (`modules/auth`)**: novo agregado `password-reset` com `request`/`reset`/
  `set-initial-password` + testes; `user` e `crypto.provider` reaproveitados sem alteracao.
- **Backend**: migration do model `password_reset`; repositorio; `auth.controller` com os
  endpoints publicos de senha e primeiro acesso; testes de integracao HTTP.
- **Frontend**: telas A4/A5 no modulo `auth` (A5 com passo de MFA condicional a `009a`); chaves
  i18n novas.
- **Dependencias**: `user`/`crypto.provider` (`004`), login (`005`), contas criadas pelo admin
  (`008a`). O MFA opcional do primeiro acesso depende da `009a` **apenas se presente**.
- **Habilita**: onboarding completo das contas criadas via wizard D3 (`008a`).
