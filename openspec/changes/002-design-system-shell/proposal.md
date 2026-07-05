<!--
TEMPLATE DE CHANGE — 002-design-system-shell (identidade visual sobre a base da 001).
Substitua os placeholders e remova este comentario antes de usar.
Placeholders:
  TaskBoard Live            — nome do produto (ex.: AlphaBet)
  #2563EB       — hex da cor primaria (ex.: #4F46E5)
  #1D4ED8 — hex de hover/realce (ex.: #6366F1)
  Inter        — fonte de texto (ex.: Inter)
  JetBrains Mono        — fonte de dados/codigo (ex.: JetBrains Mono)
  "Quadros", "Conta"     — secoes da navegacao (ex.: "Visao geral", "Conteudo", "Pessoas", "Sistema")
  6            — numero de telas/mockups que sao a fonte de verdade (ex.: 58)
Fonte de verdade dos tokens: as suas telas/mockups. Ajuste a escala neutra e as semanticas a marca.
-->


> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/design-system/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

A `001` deixou o frontend com uma base generica: a skill `frontend-next-config` ja entregou a
biblioteca de componentes em `shared/components/ui/` (button, input, table, dialog, badge, toaster,
`form-section-layout`, `delete-confirmation-dialog`, paginacao, charts), um `globals.css` baseado em
CSS variables (padrao shadcn/radix) e o shell de navegacao (`AdminShell` + sidebar). Falta dar a essa
base a **identidade visual do TaskBoard Live** — a paleta, as fontes, o suporte a tema claro/escuro e a
estrutura de navegacao por secoes — extraida das 6 telas. Como toda a UI das mudancas `004`
em diante reusa esses componentes e essas variaveis, a tematizacao precisa vir cedo para garantir
consistencia sem retrabalho.

Esta mudanca **nao recria** a biblioteca de componentes: ela retematiza a base herdada da `001`,
aproveitando que os componentes ja consomem CSS variables — re-mapear as variaveis re-skina a
biblioteca inteira de uma vez.

## What Changes

- Reescrever o `globals.css` mapeando as CSS variables (`--primary`, `--accent`, `--border`,
  `--muted`, `--destructive`, `--ring`, superficies e textos) para a paleta TaskBoard Live: primario
  `#2563EB` (hover `#1D4ED8`), escala neutra e semanticas
  (`success`, `warning`, `danger`), definindo **tema claro e tema escuro** (a base herdada e dark-only).
- Configurar as fontes da marca: **Inter** para texto e **JetBrains Mono** para
  dados/codigo, via `next/font`, e aplicar a tipografia base.
- Adicionar o provider de tema e a alternancia claro/escuro baseada na classe `.dark`, com
  persistencia via o `use-local-storage.hook` ja existente; tema padrao **claro**, com o controle no shell.
- Adaptar o `app-logo.component` para a marca **TaskBoard Live**.
- Popular a navegacao da sidebar com a estrutura por secoes ("Quadros", "Conta") como configuracao
  estatica, **estruturada para receber o gating por papel na `006`** — sem aplicar regras de papel aqui.
- Garantir o `toaster` (sonner) montado no shell para as mudancas seguintes.
- Escopo **exclusivamente frontend**; nenhum modulo de dominio, regra de papel ou tenant.

## Capabilities

### New Capabilities
- `design-system`: Identidade visual do TaskBoard Live aplicada sobre a base de frontend da `001` —
  tokens de tema (paleta, semanticas, escala neutra) em CSS variables para claro e escuro,
  tipografia Inter/JetBrains Mono, alternancia de tema persistente, marca no shell e
  navegacao por secoes preparada para papeis, reusando a biblioteca de componentes existente sem recria-la.

### Modified Capabilities
<!-- Nenhuma. A base-projeto da 001 e estendida visualmente, nao modificada em requisitos. -->

## Impact

- **Frontend (tema)**: reescrita de `apps/frontend/src/app/globals.css` (CSS variables claro + escuro).
- **Frontend (tipografia)**: Inter e JetBrains Mono via `next/font` + tipografia base.
- **Frontend (tema claro/escuro)**: provider + alternancia `.dark` com persistencia, controle no shell.
- **Frontend (marca e shell)**: `app-logo.component` com a marca TaskBoard Live; `toaster` montado.
- **Frontend (navegacao)**: config estatica da sidebar por secoes, preparada para gating na `006`.
- **Reuso**: a biblioteca `shared/components/ui/*` herdada da `001` e reaproveitada sem recriacao.
- **Escopo**: sem backend, sem dominio, sem papeis, sem tenant.
