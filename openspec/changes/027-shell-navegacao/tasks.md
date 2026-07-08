> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `015` (shell reestilizado), `023` (busca global/`CommandPalette`), `024`
> (notificações/`NotificationBell`) concluídas. **Não faça:** nenhuma mudança de backend/schema/
> contrato de tempo real; nenhuma rota nova além de `/boards`, `/templates`, `/archived`,
> `/account` (já existentes); nenhum badge de contagem fixa (usar `unreadCount` real ou omitir);
> não usar `mockups/ScreenNav.dc.html`/`mockups/Indice.dc.html`/`nav.png`/`nav2.png` como
> referência de produto (são navegadores do Claude Design).

## 1. Levantamento e config plana

- [x] 1.1 Ler `apps/frontend/src/shared/navigation/app-navigation.config.ts`,
  `app-sidebar-navigation.component.tsx`, `apps/frontend/src/shared/components/ui/
  sidebar-menu.component.tsx`, `apps/frontend/src/shared/template/admin-shell.component.tsx` e
  `apps/frontend/src/app/(private)/layout.tsx` para confirmar a estrutura atual de dois níveis
  antes de editar. Rodar `grep -rn "moduleNavigation\|ModuleNavigationEntry"
  apps/frontend/src` para confirmar que nenhum outro consumidor além do shell usa esse recurso.
  - **Pré:** `015`, `023`, `024` concluídas.
  - **Aceite:** evidência lista os arquivos lidos e o resultado do `grep` (uso confirmado só no
    shell, ou desvio registrado se houver outro consumidor).
  > ✅ 2026-07-08 08:04 — Lidos os 5 arquivos. `grep -rn "moduleNavigation\|ModuleNavigationEntry" apps/frontend/src`
  > confirmou uso apenas em `sidebar-menu.component.tsx`, `app-navigation.config.ts`,
  > `app-sidebar-navigation.component.tsx` e `(private)/layout.tsx` (os 4 arquivos do próprio
  > shell) — nenhum outro consumidor no projeto.

- [x] 1.2 Reescrever `app-navigation.config.ts`: substituir `APP_NAVIGATION_SECTIONS`
  (`ModuleNavigationEntry[]`) por `APP_NAVIGATION_ITEMS: SidebarMenuItem[]` plano, na ordem do
  mockup: "Meus quadros" (`/boards`, `LayoutGrid`, `match: 'exact'`), "Modelos" (`/templates`,
  `LayoutTemplate`), "Notificações" (sem `href` de rota — ver 2.3), "Arquivados" (`/archived`,
  `Archive`). Manter `ACCOUNT_ROUTE` exportada para uso na topbar (menu do usuário), fora da
  lista de itens de navegação.
  - **Pré:** 1.1 concluída.
  - **Aceite:** arquivo compila; nenhuma rota nova inventada; `BOARDS_ROUTE`/`TEMPLATES_ROUTE`/
    `ARCHIVED_ROUTE`/`ACCOUNT_ROUTE` continuam exportadas com os mesmos valores.
  > ✅ 2026-07-08 08:04 — `APP_NAVIGATION_ITEMS: SidebarMenuItem[]` com 3 itens de rota (Meus
  > quadros/Modelos/Arquivados); "Notificações" não é `SidebarMenuItem` (sem `href` de rota) —
  > renderizado diretamente em `app-sidebar-navigation.component.tsx` via
  > `NotificationSidebarItem`, posicionado por `NOTIFICATIONS_ITEM_INDEX`. Todas as rotas
  > (`BOARDS_ROUTE`/`TEMPLATES_ROUTE`/`ARCHIVED_ROUTE`/`ACCOUNT_ROUTE`) preservadas com os
  > mesmos valores. `npx tsc --noEmit -p apps/frontend/tsconfig.json` ok.

- [x] 1.3 Simplificar `sidebar-menu.component.tsx`: remover os ramos de `moduleNavigation`
  (`showTwoLevelNavigation`, `ModuleRailItem`, `CollapsedModuleItem`, `ModuleFlyoutContent`, rail
  de módulos) e os tipos `ModuleNavigationEntry`/`SidebarMenuProps.moduleNavigation`, mantendo
  apenas o caminho de lista simples (`MenuSections`/`SidebarItemLink`) com suporte a colapsar
  (`collapsed`) já existente.
  - **Pré:** 1.1 concluída (confirmação de que não há outro consumidor).
  - **Aceite:** `tsc` não acusa uso de tipo/prop removido em nenhum outro arquivo; navegação
    colapsada (ícone só) continua funcionando visualmente.
  - **Não faça:** remover `SidebarMenuItem`/`SidebarMenuSection`/`MenuSections`/`SidebarItemLink`
    — continuam em uso pela nova sidebar única.
  > ✅ 2026-07-08 08:04 — Removidos `ModuleRailItem`/`CollapsedModuleItem`/`ModuleFlyoutContent`/
  > `ModuleNavigationEntry`/`SidebarMenuProps.moduleNavigation`; `SidebarItemLink` e
  > `isSidebarItemActive` exportados para reuso direto pela sidebar única. `tsc`/lint/build
  > verdes; colapso continua suportado via `collapsed`/`useShell`.

## 2. Sidebar única

- [x] 2.1 Reescrever `app-sidebar-navigation.component.tsx` para renderizar, nesta ordem, a
  estrutura de `mockups/Meus Quadros.dc.html`: logo "TaskBoard" (`AppLogo`) com `Link
  href="/boards"`; campo "Buscar…" com atalho `⌘K` visível; itens de `APP_NAVIGATION_ITEMS`
  (task 1.2) com item ativo destacado (`bg-primary/10 text-primary`, mesmo padrão hoje usado na
  seção "Seus quadros"); a seção "Seus quadros" (já existente, via `listMyBoards` +
  `resolveBoardColor` — preservar 100% a lógica atual de fetch); botão "Criar quadro" no rodapé
  ou abaixo da lista de quadros, conforme o mockup.
  - **Pré:** 1.2, 1.3 concluídas.
  - **Aceite:** sidebar renderiza sem o switcher/rail de módulo; "Seus quadros" continua
    mostrando os quadros reais do usuário logado com a cor determinística preservada; item ativo
    reflete a rota atual.
  - **Não faça:** inventar contagem fixa em qualquer item; remover a lógica de
    `listMyBoards`/`resolveBoardColor` existente.
  > ✅ 2026-07-08 08:04 — Componente reescrito sem props (`AppSidebarNavigation()`), sem
  > `modules`/`defaultModuleId`. Ordem: logo → botão "Buscar…" (⌘K) → itens (Meus
  > quadros/Modelos/Notificações/Arquivados, ativo com `ACTIVE_CLASS`/`bg-primary/10 text-primary`
  > herdado de `SidebarItemLink`) → "Seus quadros" (mesma chamada `listMyBoards`/
  > `resolveBoardColor` preservada, só reposicionada) → botão "Criar quadro" no rodapé. Suporte a
  > `collapsed` (ícone só) mantido via `useShell`.

- [x] 2.2 Fazer o campo "Buscar…" abrir o `CommandPalette` (`023`) ao ser clicado: em
  `apps/frontend/src/shared/components/ui/command-palette.component.tsx`, adicionar um listener
  de `window.addEventListener('taskboard:command-palette:open', ...)` ao lado do `keydown`
  existente (mesmo `useEffect` ou um novo, sem duplicar `setOpen`); em
  `app-sidebar-navigation.component.tsx`, o campo "Buscar…" dispara
  `window.dispatchEvent(new CustomEvent('taskboard:command-palette:open'))` no `onClick`.
  - **Pré:** 2.1 concluída; `023` (`CommandPalette`) já montado em `(private)/layout.tsx`.
  - **Aceite:** clicar no campo "Buscar…" da sidebar abre o mesmo `CommandPalette` que `⌘K` abre;
    nenhum estado/prop novo de busca é criado (reaproveita `useGlobalSearch` já existente dentro
    do `CommandPalette`).
  - **Não faça:** criar um segundo campo de busca com lógica própria; duplicar
    `useGlobalSearch`.
  > ✅ 2026-07-08 08:04 — Novo `useEffect` em `command-palette.component.tsx` escuta
  > `taskboard:command-palette:open` e chama `setOpen(true)` (mesmo estado do `⌘K`); botão
  > "Buscar…" da sidebar dispara o `CustomEvent` no `onClick`. Nenhum estado de busca duplicado.

- [x] 2.3 Fazer o item "Notificações" da sidebar abrir a central de notificações real (`024`):
  reaproveitar `NotificationBell`/`useNotifications()` (`apps/frontend/src/modules/
  notifications/components/notification-bell.component.tsx`,
  `apps/frontend/src/modules/notifications/context/notification.context.tsx`) — renderizar o
  item como um botão de lista (ícone + rótulo "Notificações" + badge de `unreadCount` real,
  omitido quando zero) que abre o mesmo popover de notificações já implementado, sem duplicar a
  lógica de fetch/marcação como lida.
  - **Pré:** 2.1 concluída; `024` (`NotificationProvider`) já montado em `(private)/layout.tsx`.
  - **Aceite:** clicar em "Notificações" na sidebar abre a central real com as notificações reais
    do usuário; badge reflete `unreadCount` real e some quando zero; nenhuma contagem fixa
    aparece.
  - **Não faça:** criar nova rota `/notifications`; duplicar `useNotifications()`/estado do
    `NotificationProvider`.
  > ✅ 2026-07-08 08:04 — Desvio registrado: em vez de estender `NotificationBell`, criado
  > `apps/frontend/src/modules/notifications/components/notification-sidebar-item.component.tsx`
  > (novo arquivo, mesmo módulo) — botão de item de lista (ícone `Bell` + "Notificações" + badge
  > `unreadCount`, omitido quando zero) que abre um `Popover` reaproveitando 100%
  > `NotificationDropdown`/`useNotifications()` (sem duplicar fetch/estado/marcação como lida).
  > Motivo do desvio: `NotificationBell` é um botão-ícone quadrado (`size="icon"`) já usado na
  > topbar; extrair só o conteúdo evitou duplicar/forçar layout incompatível no botão original.
  > Nenhuma rota nova criada.

- [x] 2.4 Adicionar o prop opcional `triggerTestId?: string` (default
  `'create-board-trigger'`) a `CreateBoardDialogProps` em
  `apps/frontend/src/modules/boards/components/create-board-dialog.component.tsx`, aplicado ao
  `data-testid` do `Button` do `DialogTrigger`; usar uma nova instância de `CreateBoardDialog` no
  botão "Criar quadro" da sidebar (task 2.1) com `triggerTestId="sidebar-create-board-trigger"` e
  `onCreated` navegando para `/boards/{id}` do quadro criado (`router.push`).
  - **Pré:** 2.1 concluída.
  - **Aceite:** `data-testid="create-board-trigger"` do dashboard (`boards-dashboard.component
    .tsx`) inalterado; botão "Criar quadro" da sidebar cria um quadro real e navega para ele;
    nenhum e2e existente (`013`/`014`) quebra por testid duplicado na mesma página.
  - **Não faça:** duplicar o formulário/lógica de criação — só uma nova instância do componente
    existente com testid diferenciado.
  > ✅ 2026-07-08 08:04 — `triggerTestId` (default `'create-board-trigger'`, preservando o
  > dashboard) e `triggerClassName` opcionais adicionados a `CreateBoardDialogProps`. Sidebar usa
  > `triggerTestId="sidebar-create-board-trigger"`; `onCreated` adiciona o quadro à lista local
  > (mesmo princípio do dashboard) e navega via `router.push('/boards/{id}')`. Sem duplicação de
  > formulário/lógica.

## 3. Topbar e layout

- [x] 3.1 Ajustar `admin-shell.component.tsx` apenas no necessário para acomodar a nova sidebar
  única (espaçamento/altura do header interno da sidebar, se a logo migrar para dentro da
  sidebar em vez de compartilhada com a topbar), preservando 100% as props
  (`sidebar`, `children`, `userName`, `userEmail`, `userAvatarUrl`, `onLogout`,
  `notificationsSlot`) e os `data-testid` (`app-shell`, `user-menu-trigger`, `logout-button`).
  - **Pré:** 2.1, 2.2, 2.3, 2.4 concluídas.
  - **Aceite:** topbar mostra toggle de tema, sino de notificações (`notificationsSlot`) e menu
    do usuário, na ordem do mockup; nenhum `data-testid` removido; tema e logout continuam
    funcionando.
  - **Não faça:** alterar `AuthGuard`/`ShellProvider`/`NotificationProvider`.
  > ✅ 2026-07-08 08:04 — A logo já migrou para dentro da sidebar única (2.1); `admin-shell
  > .component.tsx` não precisou de ajuste estrutural além do label do menu do usuário (3.2).
  > Todas as props e `data-testid` (`app-shell`, `user-menu-trigger`, `logout-button`) inalterados
  > — confirmado por `tsc`/lint/build verdes.

- [x] 3.2 No menu do usuário (`DropdownMenu` de `admin-shell.component.tsx`), confirmar que o
  item de rota `/account` está presente com rótulo "Conta" (renomear de "Perfil" para "Conta" se
  fizer mais sentido semanticamente, mesma rota, sem nova página), já que "Conta" sai da
  navegação de primeiro nível da sidebar.
  - **Pré:** 3.1 concluída.
  - **Aceite:** clicar em "Conta" no menu do usuário navega para `/account`; nenhuma rota nova
    criada.
  > ✅ 2026-07-08 08:04 — `DropdownMenuItem` renomeado de "Perfil" para "Conta" (mesma rota,
  > `onSelect={() => router.push(profileHref)}`). `(private)/layout.tsx` agora passa
  > `profileHref={ACCOUNT_ROUTE}` (corrigindo o default `/auth/profile` que não era mais
  > passado). Nenhuma rota nova criada.

- [x] 3.3 Ajustar `apps/frontend/src/app/(private)/layout.tsx` para a nova assinatura de
  `AppSidebarNavigation` (sem `modules`/`defaultModuleId`, conforme decidido no `design.md`),
  preservando `NotificationProvider`, `ShellProvider`, `CommandPalette` e `NotificationBell`
  exatamente como estão.
  - **Pré:** 2.1-2.4, 3.1, 3.2 concluídas.
  - **Aceite:** `tsc` não acusa prop inexistente/obrigatória faltando; app renderiza sem erro em
    todas as rotas privadas.
  > ✅ 2026-07-08 08:04 — `<AppSidebarNavigation />` sem props; `profileHref={ACCOUNT_ROUTE}`
  > adicionado ao `AdminShell`. `NotificationProvider`/`ShellProvider`/`CommandPalette`/
  > `NotificationBell` inalterados. `tsc`/build confirmam todas as rotas privadas geradas.

## 4. Verificação

- [x] 4.1 Rodar `npx tsc --noEmit -p apps/frontend/tsconfig.json` sem erros.
  - **Aceite:** typecheck limpo.
  > ✅ 2026-07-08 08:04 — `npx tsc --noEmit -p apps/frontend/tsconfig.json` sem saída (limpo).

- [x] 4.2 Rodar `npx turbo run lint check-types --filter=@taskboard/frontend` sem novos
  erros/warnings introduzidos por esta change.
  - **Aceite:** lint limpo (ou só warnings pré-existentes, documentados).
  > ✅ 2026-07-08 08:04 — `npx turbo run lint check-types --filter=@taskboard/frontend`: 4
  > tasks sucesso; único warning é pré-existente em `app-logo.component.tsx`
  > (`_priority` não usado), não tocado nesta change.

- [x] 4.3 Rodar `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm --workspace @taskboard/frontend run build`
  com sucesso.
  - **Aceite:** build verde; nenhuma rota removida do output esperado (`/boards`,
    `/boards/[id]`, `/templates`, `/archived`, `/account`, etc.).
  > ✅ 2026-07-08 08:04 — Build verde (Next 16.2.10/Turbopack). Rotas geradas incluem `/account`,
  > `/archived`, `/boards`, `/boards/[id]`, `/boards/[id]/settings`, `/templates`, `/search`,
  > `/join`, `/convite/[token]` — nenhuma removida.

- [x] 4.4 Validar manualmente (ou por leitura de código, se backend não estiver disponível no
  ambiente de execução): sidebar única exibe logo, busca, os 4 itens, "Seus quadros" com os
  quadros reais e "Criar quadro"; busca abre o `CommandPalette`; "Notificações" abre a central
  real; "Criar quadro" cria e navega; topbar mostra tema/sino/usuário; nenhum switcher de módulo
  de dois níveis restante em nenhuma tela privada.
  - **Aceite:** evidência de cada cenário acima.
  > ✅ 2026-07-08 08:04 — Backend (`:4000`) indisponível neste ambiente de execução (`curl
  > localhost:4000` → sem resposta); validação feita por leitura de código, já que login real
  > exige backend: `app-sidebar-navigation.component.tsx` renderiza logo→busca→3 itens de
  > rota+"Notificações" inline→"Seus quadros" (via `listMyBoards`)→"Criar quadro", nesta ordem;
  > `command-palette.component.tsx` escuta o `CustomEvent` disparado pelo botão de busca;
  > `notification-sidebar-item.component.tsx` reaproveita `useNotifications()`/
  > `NotificationDropdown` sem duplicar estado; `create-board-dialog.component.tsx` com
  > `triggerTestId` diferenciado evita colisão com o dashboard; `admin-shell.component.tsx`
  > mantém tema/sino/usuário na topbar. Frontend `npm run dev` responde 200 em `/boards` (redirect
  > client-side para `/join` sem sessão, comportamento esperado do `AuthGuard`, inalterado por
  > esta change).

- [x] 4.5 Confirmar zero lorem/placeholder e zero resquício do switcher de dois níveis:
  `grep -rn "moduleNavigation\|ModuleNavigationEntry" apps/frontend/src` sem ocorrências (fora de
  comentários históricos, se houver) e `grep -riE 'lorem|acme inc'
  apps/frontend/src/shared/navigation apps/frontend/src/shared/template` sem ocorrências.
  - **Aceite:** ambos os greps limpos.
  > ✅ 2026-07-08 08:04 — `grep -rn "moduleNavigation\|ModuleNavigationEntry" apps/frontend/src`
  > só encontra o comentário histórico em `sidebar-menu.component.tsx` (linhas 135-136),
  > documentando a remoção — nenhum código vivo. `grep -riE 'lorem|acme inc'
  > apps/frontend/src/shared/navigation apps/frontend/src/shared/template` sem ocorrências.

- [x] 4.6 Rodar `openspec validate 027-shell-navegacao --strict` e corrigir qualquer falha antes
  de seguir para o `/portao`.
  - **Aceite:** validação limpa.
  > ✅ 2026-07-08 08:04 — `npx openspec validate 027-shell-navegacao --strict` →
  > "Change '027-shell-navegacao' is valid".
