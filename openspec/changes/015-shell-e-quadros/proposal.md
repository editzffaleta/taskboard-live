> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/shell-quadros/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/shell-quadros/spec.md`, `mockups/`) · e,
> **somente se o `design.md` citar nominalmente**: arquivos de código listados,
> `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O TaskBoard Live já tem o shell privado, o dashboard "Meus Quadros" e o "Quadro ao Vivo"
funcionando com dado real (`005`-`014`): sidebar/topbar genéricos de um template
(`AdminShell`/`AppSidebarNavigation`), grade de quadros textual em
`boards-dashboard.component.tsx`, e o quadro com colunas/cartões/DnD/presença/painéis em
`board-view.component.tsx` e correlatos. Nenhuma dessas telas segue a identidade visual madura
projetada nos mockups de alta fidelidade `mockups/Meus Quadros.dc.html` e
`mockups/Quadro ao Vivo.dc.html` — sidebar de marca, cards de quadro com capa gradiente e
avatares empilhados, toolbar do quadro com badge "ao vivo" pulsante, presença com anel de status,
etc. Esta change é **exclusivamente visual**: reestiliza o shell e as duas telas para o layout dos
mockups, preservando 100% do comportamento e dado reais já entregues (DnD, Socket.IO, CRUD de
quadros, presença, painéis de Compartilhar/Atividade).

## What Changes

- **Shell privado** (`(private)/layout.tsx`, `admin-shell.component.tsx`,
  `app-sidebar-navigation.component.tsx`): reestilizar para o layout de sidebar fixa (250px) +
  topbar dos mockups — marca "TaskBoard Live", item "Meus quadros" ativo, lista de quadros reais
  do usuário na sidebar (dado real via `boards.api.ts`, não os nomes fictícios do mockup), toggle
  de tema, menu do usuário (nome/e-mail reais de `AuthContext`, logout). Sem inventar itens de
  navegação que não têm rota real (ex.: "Modelos", "Notificações" do mockup ficam
  desabilitados/omitidos se não existir funcionalidade correspondente).
- **Meus Quadros** (`boards-dashboard.component.tsx`, `board-card.component.tsx`,
  `create-board-dialog.component.tsx`): reestilizar a grade de cards de quadro (capa gradiente,
  contagem real de listas/cartões, avatares empilhados de membros reais, indicador de atividade
  recente), cabeçalho com contagem real de quadros/pessoas, botão "Criar quadro" e card
  tracejado "Criar novo quadro", estado vazio — ao visual do mockup. Mantém onboarding (`014`) e
  skeleton de carregamento (`014`) intactos, apenas restilizados se necessário para coerência.
- **Quadro ao Vivo** (`board-toolbar.component.tsx`, `board-presence.component.tsx`,
  `kanban-column.component.tsx`, `kanban-card.component.tsx`, `members-panel.component.tsx`,
  `activity-panel.component.tsx`, `board-view.component.tsx`): reestilizar a toolbar (nome do
  quadro, badge "ao vivo" pulsante, avatares de presença com anel verde, botões
  Atividade/Compartilhar, botão "Nova lista"), as colunas (contador de cartões, botão de
  adicionar) e os cartões (apenas título — ver limite abaixo), os painéis de membros e atividade —
  ao visual do mockup. DnD (`@hello-pangea/dnd`) e Socket.IO permanecem exatamente como estão.

### Limite explícito do cartão (fora de escopo)

O mockup `Quadro ao Vivo.dc.html` mostra um cartão de kanban rico (etiquetas coloridas, prazo com
badge de atraso/hoje, checklist com contador, comentários, avatares de responsáveis) e um modal de
**detalhe de cartão** completo (descrição, checklist, anexos, comentários, atividade), além de
filtros/visões (Tabela, Calendário, filtro "Responsável"/"Filtrar"). **Nada disso é implementado
aqui** — essas capacidades (etiquetas, checklist, prazo, responsáveis, comentários, detalhe de
cartão, filtros/visões) pertencem às changes `016`-`019`. Nesta change o cartão do kanban exibe
**somente o título real** (dado hoje existente em `Card.title`), com o estilo visual do mockup
(cantos, borda, hover, drag), sem nenhum dos elementos ricos acima — nem mockados nem com
placeholder visual fixo.

## Capabilities

### New Capabilities
- `shell-quadros`: identidade visual definitiva do shell privado, do dashboard "Meus Quadros" e do
  "Quadro ao Vivo" (sidebar/topbar, cards de quadro, toolbar/colunas/cartões/painéis do quadro),
  100% frontend, reaproveitando os dados e o comportamento reais já entregues em `005`-`014`.

### Modified Capabilities
<!-- Nenhuma; capacidades funcionais (`boards`, `board-view`, `presence`, `activity`) não mudam de
comportamento, só de estilo. -->

## Impact

- **Frontend (`apps/frontend/src/app/(private)`)**: `layout.tsx` (props/estrutura do shell, sem
  mudar `AuthGuard`/`ShellProvider`).
- **Frontend (`apps/frontend/src/shared`)**: `template/admin-shell.component.tsx`,
  `navigation/app-sidebar-navigation.component.tsx`, `navigation/app-navigation.config.ts`
  reestilizados; nenhuma mudança em `shell.context.tsx`/`shell.hook`.
- **Frontend (`apps/frontend/src/modules/boards/components`)**: `boards-dashboard.component.tsx`,
  `board-card.component.tsx`, `create-board-dialog.component.tsx`, `board-toolbar.component.tsx`,
  `board-presence.component.tsx`, `kanban-column.component.tsx`, `kanban-card.component.tsx`,
  `members-panel.component.tsx`, `activity-panel.component.tsx`, `board-view.component.tsx` —
  todos reestilizados; nenhuma mudança de `boards.api.ts`, `members.api.ts`, `use-board-socket.ts`
  ou de qualquer chamada de rede.
- **Fora de escopo**: qualquer mudança de backend, schema Prisma, contrato de tempo real; detalhe
  de cartão rico e filtros/visões (`016`-`019`); qualquer dado fake/lorem no código final
  (mockups servem só de referência visual).
