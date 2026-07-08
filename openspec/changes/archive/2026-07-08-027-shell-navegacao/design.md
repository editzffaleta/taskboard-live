## Context

O shell privado (`(private)/layout.tsx` → `AdminShell` + `AppSidebarNavigation`) já roda com
dado real desde `002`-`026`: busca global/`⌘K` (`023`, `CommandPalette` + `use-global-search.hook`),
notificações (`024`, `NotificationProvider` + `NotificationBell`), modelos (`025`, `/templates`),
arquivados (`022`, `/archived`), quadros reais na sidebar (`listMyBoards` + `resolveBoardColor`).
O problema é **estrutural**, não de dado: `app-navigation.config.ts` declara dois "módulos"
(`boards`, `account`), e `sidebar-menu.component.tsx` renderiza um rail de módulos com flyout/
segundo nível (`moduleNavigation`) — um padrão de navegação de app com múltiplas áreas grandes,
que não existe nos mockups. Os mockups (`mockups/Meus Quadros.dc.html`,
`mockups/Quadro ao Vivo.dc.html`, idênticos entre si na sidebar/topbar) mostram uma sidebar
**plana de um nível só**: logo, busca, 4 itens, seção de quadros, botão de criar — e uma topbar
simples com tema/sino/usuário. Esta change corrige a fidelidade, sem tocar em nenhuma capacidade
funcional (busca, notificações, quadros, tema, auth continuam exatamente como estão).

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Sidebar única (um nível) fiel ao layout de `mockups/Meus Quadros.dc.html`: logo → busca → itens
  de navegação → seção "Seus quadros" → botão "Criar quadro".
- Topbar fiel ao mockup: toggle de tema, sino de notificações, menu do usuário.
- Reaproveitar 100% o comportamento/dado real já existente (busca `023`, notificações `024`,
  `listMyBoards`, `resolveBoardColor`, `CreateBoardDialog`, tema, logout) — nenhuma funcionalidade
  nova, só reencaixe visual/estrutural.
- Remover o switcher de módulo de dois níveis (`moduleNavigation`) da navegação do shell.

**Non-Goals:**
- Qualquer mudança de backend, endpoint, schema ou contrato de tempo real.
- Novas rotas além das já existentes (`/boards`, `/templates`, `/archived`, `/account`).
- Badge de contagem fixa em "Notificações" — usar a contagem real já exposta por
  `useNotifications().unreadCount` (`024`); se não houver não-lidas, omitir o badge (nunca um
  número fixo).
- Nova funcionalidade de busca/notificações — só o encaixe do que já existe na sidebar.
- Redesenho do design system (`002`) ou dos tokens de cor/tema.

## Decisions

### Nova config de navegação plana (`shared/navigation/app-navigation.config.ts`)

- Substituir `APP_NAVIGATION_SECTIONS: ModuleNavigationEntry[]` (dois módulos) por uma lista
  plana `APP_NAVIGATION_ITEMS: SidebarMenuItem[]` com 4 itens, na ordem do mockup:
  1. `boards-list` → "Meus quadros" → `BOARDS_ROUTE` (`/boards`), ícone `LayoutGrid`, `match: 'exact'`.
  2. `templates` → "Modelos" → `TEMPLATES_ROUTE` (`/templates`), ícone `LayoutTemplate`.
  3. `notifications` → "Notificações" → **não é link de rota** (não existe página dedicada);
     ao ser clicado, abre a central de notificações da `024` (reaproveita o `Popover` de
     `NotificationBell`) — ver decisão de acionamento abaixo.
  4. `archived` → "Arquivados" → `ARCHIVED_ROUTE` (`/archived`), ícone `Archive`.
- `ACCOUNT_ROUTE` continua exportada (usada pelo menu do usuário da topbar), mas sai da lista de
  itens de navegação de primeiro nível — não é mais um "módulo".
- Nenhuma rota nova é criada; `templates`/`archived` já existem (`025`/`022`).

### Sidebar única (`shared/navigation/app-sidebar-navigation.component.tsx`)

Reescrever o componente para renderizar, de cima para baixo, exatamente a estrutura do mockup:

1. **Logo** "TaskBoard" (reaproveitar `AppLogo`, já usado hoje) com `Link href="/boards"`.
2. **Campo de busca** "Buscar…" com atalho `⌘K` visível — um botão/input **somente leitura** que,
   ao ser clicado, dispara a abertura do `CommandPalette` (`023`). Como o `CommandPalette` hoje só
   abre via `keydown` interno (`Cmd/Ctrl+K`), a forma mais simples de acionar por clique sem
   duplicar estado é o `CommandPalette` passar a escutar também um evento customizado de window
   (`window.dispatchEvent(new CustomEvent('taskboard:command-palette:open'))`), documentado aqui
   como o único ponto de acoplamento novo entre os dois componentes (nenhum contexto/prop novo
   necessário, ambos já são montados uma vez em `(private)/layout.tsx`).
3. **Itens de navegação** de `APP_NAVIGATION_ITEMS`, renderizados com o componente de item
   simplificado (ver `sidebar-menu.component.tsx` abaixo) — "Meus quadros"/"Modelos"/"Arquivados"
   são `Link`; "Notificações" é um botão que abre o popover de notificações (reaproveitando
   `NotificationBell`: extrair o conteúdo do popover para ser acionável a partir de um trigger
   externo, ou simplesmente renderizar `<NotificationBell />` com um layout de item de lista em
   vez de ícone de sino — decisão de implementação registrada na task correspondente; o contrato
   funcional de `useNotifications()` não muda).
4. **Seção "Seus quadros"**: mantém a implementação atual (via `listMyBoards` + `resolveBoardColor`,
   já existente em `app-sidebar-navigation.component.tsx`) — sem mudança de lógica de busca de
   dado, só de posição (abaixo dos itens de navegação, como no mockup).
5. **Botão "Criar quadro"**: nova instância de `CreateBoardDialog` (`modules/boards/components/
   create-board-dialog.component.tsx`) na sidebar. Para não colidir com o `data-testid
   ="create-board-trigger"` já usado pelo dashboard (`boards-dashboard.component.tsx`) — ambos
   podem estar visíveis na mesma página `/boards` — adicionar um prop opcional
   `triggerTestId?: string` (default `'create-board-trigger'`) ao `CreateBoardDialogProps`; a
   sidebar passa `triggerTestId="sidebar-create-board-trigger"`. `onCreated` na sidebar apenas
   navega para o quadro recém-criado (`router.push('/boards/{id}')`) — não duplica estado de
   lista (a lista "Seus quadros" já reflete o novo quadro na próxima leitura/navegação; se
   `listMyBoards` já estiver em memória local do componente, adicionar o quadro criado à lista
   local do mesmo jeito que o dashboard faz, para refletir imediatamente sem re-fetch).

Ao final, o componente não usa mais `moduleNavigation`/`ModuleNavigationEntry` — a assinatura de
`AppSidebarNavigation` muda de `{ modules, defaultModuleId }` para nenhum prop (ou `{ items }`
opcional, se fizer sentido para testabilidade), e `(private)/layout.tsx` é ajustado de acordo.

### Simplificação de `sidebar-menu.component.tsx`

- Remover os ramos de `moduleNavigation` (`showTwoLevelNavigation`, `ModuleRailItem`,
  `CollapsedModuleItem`, `ModuleFlyoutContent`, rail de módulos) — nenhum outro consumidor no
  projeto usa esse recurso (confirmar com `grep -r moduleNavigation apps/frontend/src` antes de
  remover; se houver outro uso não previsto aqui, registrar o desvio e manter o código morto
  isolado em vez de quebrar o outro consumidor).
- Manter apenas o caminho de lista simples de itens (`MenuSections`/`SidebarItemLink`), reaproveitado
  pela nova sidebar única, com suporte a colapsar (ícone só) já existente hoje no shell
  (`isSidebarOpen`/`collapsed`).
- Tipo `ModuleNavigationEntry` e `SidebarMenuProps.moduleNavigation` podem ser removidos do
  arquivo; `SidebarMenuItem`/`SidebarMenuSection` continuam.

### Topbar (`shared/template/admin-shell.component.tsx`)

- Manter a mesma API de props (`sidebar`, `children`, `userName`, `userEmail`, `userAvatarUrl`,
  `onLogout`, `notificationsSlot`) — **nenhuma mudança de assinatura**, pois já está alinhada ao
  mockup (toggle de tema, `notificationsSlot` com o sino da `024`, menu do usuário com
  perfil/logout). Se a sidebar única passar a ter altura de header própria (logo no topo da
  sidebar em vez de compartilhado com a topbar), ajustar apenas o espaçamento vertical, sem mudar
  os `data-testid` (`app-shell`, `user-menu-trigger`, `logout-button`) nem a lógica de
  `toggleSidebar`/`ThemeToggle`/`DropdownMenu`.
- Rótulo "Conta"/"Preferências" do menu do usuário (hoje só em `Perfil`) pode ganhar um item
  "Conta" apontando para `ACCOUNT_ROUTE`, já que "Conta" sai da navegação principal — reaproveitar
  o item `Perfil` existente (mesma rota `/account`) em vez de duplicar, renomeando o rótulo para
  "Conta" se fizer mais sentido semanticamente (mesma rota, sem nova página).

### `(private)/layout.tsx`

- Ajustar a chamada de `AppSidebarNavigation` para a nova assinatura (sem `modules`/
  `defaultModuleId`), mantendo `NotificationProvider`/`ShellProvider`/`CommandPalette`/
  `NotificationBell` exatamente como estão.

## i18n

- Todos os rótulos novos/renomeados ("Meus quadros", "Modelos", "Notificações", "Arquivados",
  "Buscar…", "Criar quadro", "Seus quadros") seguem o mesmo padrão hoje usado no arquivo (rótulo
  estático inline, já documentado como aceitável nos comentários existentes de
  `app-navigation.config.ts`) — não introduzir um novo mecanismo de i18n além do já usado no
  projeto (`getMessage`, quando aplicável a strings de UI dinâmicas fora deste config).

## Risks / Trade-offs

- [Remover `moduleNavigation` pode quebrar um consumidor não previsto] → `grep -r
  "moduleNavigation\|ModuleNavigationEntry" apps/frontend/src` antes de remover; se existir uso
  fora do shell, isolar em vez de apagar e registrar o desvio.
- [Acoplamento novo entre item "Buscar" da sidebar e `CommandPalette` via `CustomEvent`] → é a
  forma mais simples sem introduzir contexto/estado global novo; documentado explicitamente aqui
  e na task correspondente para não ser confundido com solução ad-hoc não intencional.
- [Dois `CreateBoardDialog` na mesma página `/boards` (sidebar + dashboard)] → resolvido com
  `triggerTestId` opcional, preservando o testid original do dashboard.
- [Skill indicada não cobrir o caso inteiro] → aplicar até onde fizer sentido e registrar o
  desvio na evidência.
