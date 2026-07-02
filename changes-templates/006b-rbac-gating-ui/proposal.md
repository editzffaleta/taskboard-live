<!--
TEMPLATE DE CHANGE — 006b-rbac-gating-ui (autorizacao: gating de UI + telas D7/D8/D9).
Split da antiga 006 (densa): o mecanismo backend e a 006a; aqui entra o consumo no frontend.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigos de tela (D7/D8/D9) referem-se aos seus mockups; ajuste-os.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/rbac-permissoes/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O mecanismo de autorizacao existe no backend (`006a`): guards, grupos, efetivas e
`GET /me/permissions`. Mas o usuario ainda ve na UI itens e rotas que nao pode usar, e o Admin da
Organizacao nao tem onde gerir grupos. Esta mudanca fecha o RBAC no frontend: **gating por
papel/permissao** na sidebar e nas rotas privadas, e as telas **D7** (listagem de grupos), **D8**
(editor de grupo) e **D9** (atribuir grupos a um colaborador).

## What Changes

- Buscar `GET /me/permissions` na hidratacao da sessao e disponibilizar catalogo + efetivas no client.
- Aplicar o **gating por papel/permissao** na sidebar: a config estatica da `002` ganha
  `roles`/`permissions` por secao/item; a sidebar filtra pelo usuario.
- Proteger as rotas privadas por papel/permissao (extensao do `AuthGuard` ou `RoleGuard`).
- Entregar as telas do modulo `access`: **D7** (tabela paginada de grupos), **D8** (editor com
  permissoes agrupadas por modulo, lidas do catalogo), **D9** (multi-select de grupos por colaborador).
- Itens de menu de grupos de permissao na secao administrativa, sob gating.
- Mapear no i18n (pt/en) os **rotulos** de permissoes/modulos do catalogo e textos das telas.

## Capabilities

### New Capabilities
<!-- Nenhuma. Esta mudanca completa a capability criada pela 006a. -->

### Modified Capabilities
- `rbac-permissoes` (`006a`): a capability ganha o gating de UI (sidebar + rotas) e as telas de
  gestao de grupos (D7/D8/D9), consumindo `GET /me/permissions` e o catalogo compartilhado.

## Impact

- **Frontend**: gating na sidebar (config da `002`) e nas rotas; carregamento das efetivas (ex.: no
  `AuthContext` ou hook dedicado); telas D7/D8/D9 no modulo `access`; chaves i18n de rotulos.
- **Backend**: nenhum codigo novo — consome os endpoints prontos da `006a`.
- **Dependencias**: `006a` (mecanismo + endpoints), `002` (design system/sidebar), `005` (sessao).
- **Habilita**: qualquer tela administrativa futura reutiliza o gating e o padrao D7/D8/D9.
