<!--
TEMPLATE DE CHANGE — 020-meus-dispositivos (tela B10: sessoes ativas sobre as familias da 017).
Extensao de autosservico sobre a sessao rotativa. Enriquece o refresh-token com metadados.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigo de tela (B10) e sugestao; ajuste ao seu catalogo de mockups.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/login-sessao/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

A sessao rotativa (`017`) criou familias por login e revogacao real — mas o usuario nao ve onde
esta logado nem consegue derrubar uma sessao esquecida/suspeita. Esta mudanca entrega
**"Meus dispositivos" (B10)**: listar as sessoes ativas e encerrar uma ou todas as outras — o
autosservico de seguranca que fecha o ciclo da `017`.

## What Changes

- **Metadados na familia (`017`)**: o model `refresh_token` ganha `userAgent?` e `lastUsedAt?`
  (preenchidos no login e a cada rotacao) — migration aditiva; o contrato ganha
  `findActiveFamiliesByUser` (uma linha por familia ativa: criada, ultimo uso, expiracao, agente).
- **Endpoints de autosservico** (`/me`, padrao da `010`):
  - `GET /me/sessions` — familias ativas do proprio usuario, marcando a **sessao atual**;
  - `DELETE /me/sessions/:familyId` — revoga a familia indicada (`revoke-refresh-family` da `017`);
  - `POST /me/sessions/revoke-others` — revoga todas menos a atual.
- **Tela B10 — Meus dispositivos** (area do perfil, junto da B9): lista com dispositivo
  (user-agent resumido), criada em, ultimo uso, badge "sessao atual"; acoes "Encerrar" por item e
  "Encerrar todas as outras" com confirmacao.
- Revogar a **propria** sessao atual pela lista = logout normal (redireciona ao login).

## Capabilities

### New Capabilities
<!-- Nenhuma. Esta mudanca estende a sessao rotativa (login-sessao) com autosservico. -->

### Modified Capabilities
- `login-sessao` (`005`/`017`): a sessao rotativa ganha visibilidade e gestao pelo dono —
  listagem das familias ativas com metadados e revogacao seletiva/em massa (B10).

## Impact

- **Dominio (`modules/auth`)**: contrato do `refresh-token` ganha `findActiveFamiliesByUser`;
  metadados novos no agregado; use case `list-user-sessions`; `revoke-refresh-family` reusado.
- **Backend**: migration aditiva (`userAgent`, `lastUsedAt`); endpoints `/me/sessions*`
  autenticados (somente o proprio usuario); captura do user-agent no login/rotacao.
- **Frontend**: tela B10 no perfil; chaves i18n novas.
- **Dependencias**: `017` (familias/revogacao), `005` (sessao), `010` (area do perfil/`/me`).
- **Habilita**: acoes administrativas futuras (admin derrubar sessoes de um usuario) sobre os
  mesmos casos de uso.
