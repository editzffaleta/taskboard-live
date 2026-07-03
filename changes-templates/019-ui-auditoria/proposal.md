<!--
TEMPLATE DE CHANGE — 019-ui-auditoria (tela D30 de consulta da trilha de auditoria).
Extensao de UI sobre o GET /audit da 016. Frontend + gating; backend intocado.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigo de tela (D30) e sugestao; ajuste ao seu catalogo de mockups.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/auditoria-de-acoes/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

A trilha de auditoria (`016`) existe e responde por API, mas investigar um incidente via curl nao
escala. Esta mudanca entrega a **tela de auditoria (D30)** para admins: consulta paginada com
filtros, detalhe da metadata e rotulos legiveis das acoes — fechando o ciclo prometido pela `016`.

## What Changes

- **Tela D30 — Auditoria** (area administrativa): tabela paginada consumindo `GET /audit` com
  colunas data/ator/acao/alvo; filtros por acao (catalogo), ator, alvo e periodo; detalhe
  expandivel exibindo a `metadata` (JSON legivel) e o `requestId` quando presente.
- **Rotulos i18n das acoes**: cada chave estavel do catalogo (`user.role_changed`,
  `user.approved`, `mfa.disabled`…) ganha rotulo pt/en; chave desconhecida cai no literal.
- **Gating (`006b`)**: item de menu e rota visiveis apenas para `admin_org`/`super_admin`
  (o backend ja bloqueia; a UI esconde).
- **Backend intocado**: nenhuma rota nova — a tela e cliente puro do `GET /audit`.

## Capabilities

### New Capabilities
<!-- Nenhuma. Esta mudanca completa a capability criada pela 016 com a camada de UI. -->

### Modified Capabilities
- `auditoria-de-acoes` (`016`): a capability ganha a consulta visual (D30) com filtros, detalhe
  de metadata e rotulos i18n das acoes.

## Impact

- **Frontend**: pagina D30 no shell administrativo (`002`), componentes de tabela/filtros do
  design system, chaves i18n novas; gating de menu/rota (`006b`).
- **Backend/Dominio**: intocados.
- **Dependencias**: `016` (API), `006b` (gating), `002` (shell/design system).
- **Habilita**: investigacao de incidentes pela UI; exportacao/retencao ficam para changes futuras.
