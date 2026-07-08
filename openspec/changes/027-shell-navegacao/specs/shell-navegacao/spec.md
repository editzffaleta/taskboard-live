## ADDED Requirements

### Requirement: Sidebar única fiel ao mockup
O sistema SHALL apresentar, em todas as rotas do grupo privado, uma sidebar de nível único
reproduzindo `mockups/Meus Quadros.dc.html`/`mockups/Quadro ao Vivo.dc.html`: logo com link para
`/boards`, campo de busca, itens de navegação "Meus quadros"/"Modelos"/"Notificações"/
"Arquivados", seção "Seus quadros" e botão "Criar quadro" — sem nenhum switcher de módulo de
dois níveis.

#### Scenario: Sidebar sem switcher de módulo
- **WHEN** um usuário autenticado acessa qualquer rota privada (`/boards`, `/boards/[id]`,
  `/templates`, `/archived`, `/account`)
- **THEN** a sidebar exibe um único nível de navegação, na ordem logo → busca → itens → "Seus
  quadros" → "Criar quadro"
- **AND** nenhum rail de módulo, flyout de segundo nível ou item "Conta" aparece na navegação
  principal da sidebar

#### Scenario: Itens de navegação levam às rotas reais existentes
- **WHEN** o usuário clica em "Meus quadros", "Modelos" ou "Arquivados" na sidebar
- **THEN** é navegado para `/boards`, `/templates` ou `/archived`, respectivamente, com o item
  correspondente destacado como ativo quando a rota atual corresponde

### Requirement: Busca da sidebar abre a busca global existente
O sistema SHALL abrir o mesmo `CommandPalette` (`023`) acionado por `⌘K`/`Ctrl+K` quando o
usuário clicar no campo "Buscar…" da sidebar, sem introduzir uma segunda implementação de busca.

#### Scenario: Clique no campo de busca abre o command palette
- **WHEN** o usuário clica no campo "Buscar…" da sidebar
- **THEN** o `CommandPalette` abre com o mesmo comportamento de quando acionado por `⌘K`
- **AND** os resultados retornados são de `useGlobalSearch` (mesma função usada por `⌘K` e por
  `/search`), sem estado de busca duplicado

### Requirement: Notificações da sidebar abrem a central real
O sistema SHALL abrir a central de notificações real (`024`) ao clicar em "Notificações" na
sidebar, exibindo a contagem real de não lidas sem valor fixo inventado.

#### Scenario: Item Notificações reflete o estado real
- **WHEN** o usuário autenticado tem notificações não lidas
- **THEN** o item "Notificações" da sidebar exibe um badge com a contagem real de
  `useNotifications().unreadCount`
- **AND** ao clicar, abre a mesma central de notificações já implementada, com as notificações
  reais do usuário

#### Scenario: Ausência de não lidas não exibe badge fixo
- **WHEN** o usuário autenticado não tem nenhuma notificação não lida
- **THEN** o item "Notificações" da sidebar não exibe nenhum badge numérico

### Requirement: Seção "Seus quadros" e criação de quadro pela sidebar
O sistema SHALL listar, na sidebar, os quadros reais do usuário logado (mesma fonte de dado do
dashboard) com indicador de cor determinístico, e SHALL permitir criar um novo quadro pelo botão
"Criar quadro" da sidebar, navegando para o quadro recém-criado.

#### Scenario: Seção "Seus quadros" lista dado real
- **WHEN** um usuário autenticado com pelo menos um quadro acessa qualquer rota privada
- **THEN** a sidebar exibe uma seção "Seus quadros" com os quadros reais retornados por
  `listMyBoards`, cada um com um indicador de cor determinístico e link para `/boards/{id}`
- **AND** nenhum nome de quadro fictício do mockup aparece no código renderizado

#### Scenario: Criar quadro pela sidebar
- **WHEN** o usuário clica em "Criar quadro" na sidebar e confirma um nome válido
- **THEN** um novo quadro é criado via `createBoard` e o usuário é navegado para
  `/boards/{id}` do quadro recém-criado
- **AND** o botão "Criar quadro" do dashboard (`/boards`) continua funcionando de forma
  independente, sem conflito de identificador de teste

### Requirement: Topbar com tema, notificações e usuário
O sistema SHALL apresentar, na topbar do shell privado, o toggle de tema, o sino de
notificações e o menu do usuário (nome/avatar → Conta, logout), preservando o comportamento
existente de alternância de tema e encerramento de sessão.

#### Scenario: Tema, notificações e logout continuam funcionando
- **WHEN** o usuário clica no toggle de tema, no sino de notificações ou no item de logout do
  menu do usuário
- **THEN** o tema alterna, a central de notificações abre com dado real, e o logout encerra a
  sessão e redireciona para `/join`
- **AND** os `data-testid` `app-shell`, `user-menu-trigger` e `logout-button` permanecem
  presentes

#### Scenario: Conta acessível pelo menu do usuário
- **WHEN** o usuário abre o menu do usuário na topbar e clica em "Conta"
- **THEN** é navegado para `/account`
- **AND** "Conta"/"Preferências" não aparece mais como item de primeiro nível na sidebar
