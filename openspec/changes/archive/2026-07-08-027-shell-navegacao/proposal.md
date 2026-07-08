> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/shell-navegacao/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/shell-navegacao/spec.md`,
> `mockups/Meus Quadros.dc.html`, `mockups/Quadro ao Vivo.dc.html`) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **IGNORE** `mockups/ScreenNav.dc.html`, `mockups/Indice.dc.html`, `mockups/nav.png`,
> `mockups/nav2.png`, `mockups/support.js` e `mockups/01-dash.png` — são navegadores/índice do
> Claude Design, não referência de produto.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

A change `015-shell-e-quadros` reestilizou o shell privado, mas manteve a estrutura de
navegação herdada do template genérico: um "módulo" de dois níveis (`AppSidebarNavigation` +
`SidebarMenu` com `moduleNavigation`, alternando entre os módulos "Quadros" e "Conta", cada um
com sua própria lista de sub-itens/flyout). Essa estrutura **não é fiel** aos mockups de alta
fidelidade `mockups/Meus Quadros.dc.html` e `mockups/Quadro ao Vivo.dc.html`, que mostram uma
**sidebar única e plana**: logo "TaskBoard" no topo (link para `/boards`), um campo "Buscar…"
que abre a busca global/`⌘K` (já implementada na `023`), quatro itens de navegação de primeiro
nível (Meus quadros, Modelos, Notificações, Arquivados), uma seção "Seus quadros"/"Favoritos"
com os quadros reais do usuário e um botão "Criar quadro" — sem nenhum switcher de módulo, sem
segundo nível, sem "Conta" misturado à navegação principal (na topbar do mockup, o menu do
usuário concentra perfil/conta/logout). Esta change é **exclusivamente frontend**: refaz a
sidebar e a topbar do shell para reproduzir fielmente os mockups, corrigindo o desvio da `015`,
reaproveitando 100% do comportamento real já entregue (busca `023`, notificações `024`, lista de
quadros reais, criação de quadro, tema, logout).

## What Changes

- **Sidebar única** (substitui o switcher de dois níveis de `sidebar-menu.component.tsx`
  aplicado hoje pelo shell): logo "TaskBoard" no topo com link para `/boards`; campo de busca
  que abre o `CommandPalette` (`023`); itens de primeiro nível "Meus quadros" (`/boards`),
  "Modelos" (`/templates`, `025`), "Notificações" (abre a central da `024`), "Arquivados"
  (`/archived`, `022`); seção "Seus quadros" com os quadros reais do usuário (via `listMyBoards`,
  já usado hoje) e indicador de cor por quadro (`resolveBoardColor`, já existente); botão "Criar
  quadro" que abre o diálogo de criação já existente (`CreateBoardDialog`).
- **Topbar fiel ao mockup**: toggle de tema, sino de notificações (`024`, já existente), menu do
  usuário (nome/avatar → Conta, logout) — sem mudança de comportamento, só de composição/lugar
  dos elementos existentes.
- **Remoção do padrão de dois níveis**: o conceito de "módulo" (`ModuleNavigationEntry`,
  `moduleNavigation` no `SidebarMenu`, rail de módulos, flyout de módulo colapsado) deixa de ser
  usado pela navegação do shell privado; "Conta" some da navegação de primeiro nível e passa a
  viver só no menu do usuário da topbar (ou rodapé da sidebar, conforme o mockup).
- **Zero mudança de backend, schema, contrato de tempo real ou rotas existentes** — é
  reestruturação visual/estrutural da navegação, reaproveitando integralmente os dados e
  comportamentos já entregues em `005`-`026`.

## Capabilities

### New Capabilities
- `shell-navegacao`: sidebar única e topbar fiéis ao mockup, corrigindo o desvio estrutural
  deixado pela `015` (navegação de dois níveis), 100% frontend, reaproveitando busca (`023`),
  notificações (`024`), lista de quadros reais e criação de quadro já existentes.

### Modified Capabilities
<!-- Nenhuma capacidade funcional muda de comportamento (busca, notificações, quadros, tema,
autenticação); apenas a estrutura/composição visual da navegação do shell. -->

## Impact

- **Frontend (`apps/frontend/src/shared/navigation`)**: `app-navigation.config.ts` (nova config
  plana, sem `ModuleNavigationEntry`), `app-sidebar-navigation.component.tsx` (reescrito para
  sidebar única com busca/itens/quadros/criar quadro).
- **Frontend (`apps/frontend/src/shared/components/ui/sidebar-menu.component.tsx`)**: simplificado
  para navegação de nível único (sem `moduleNavigation`/rail/flyout), ou substituído por um
  componente mais simples se o `design.md` decidir — sem afetar outros consumidores (nenhum
  outro existe).
- **Frontend (`apps/frontend/src/shared/template/admin-shell.component.tsx`)**: ajustes mínimos de
  composição da topbar (posição do slot de busca/notificações/tema/usuário), preservando props e
  `data-testid` existentes (`app-shell`, `user-menu-trigger`, `logout-button`).
- **Frontend (`apps/frontend/src/app/(private)/layout.tsx`)**: ajuste de props passadas ao shell,
  se necessário, sem mudar `AuthGuard`/`ShellProvider`/`NotificationProvider`.
- **Fora de escopo**: qualquer mudança de backend, schema Prisma, contrato de tempo real, rotas
  novas além das já existentes (`/boards`, `/templates`, `/archived`, `/account`), qualquer
  funcionalidade nova de busca/notificações/quadros (só encaixe visual do que já existe).
