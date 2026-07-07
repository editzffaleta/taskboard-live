# shell-quadros Specification

## Purpose
TBD - created by archiving change 015-shell-e-quadros. Update Purpose after archive.
## Requirements
### Requirement: Shell privado com identidade visual do mockup
O sistema SHALL apresentar, em todas as rotas do grupo privado (`/boards`, `/boards/[id]`,
`/account`), um shell com sidebar de marca fixa e topbar reproduzindo o layout de
`mockups/Meus Quadros.dc.html`/`mockups/Quadro ao Vivo.dc.html`, sem alterar a autenticação, o
roteamento ou os dados exibidos.

#### Scenario: Sidebar lista os quadros reais do usuário
- **WHEN** um usuário autenticado acessa qualquer rota privada
- **THEN** a sidebar exibe a marca "TaskBoard Live", os itens de navegação do shell e uma seção
  "Seus quadros" com os quadros reais retornados por `listMyBoards` para o usuário logado
- **AND** nenhum nome de quadro fictício do mockup aparece no código renderizado

#### Scenario: Alternância de tema e logout continuam funcionando
- **WHEN** o usuário clica no botão de alternar tema ou no item de logout do menu do usuário
- **THEN** o tema muda entre claro/escuro e o logout encerra a sessão e redireciona para `/join`,
  exatamente como antes da reestilização
- **AND** os `data-testid` `app-shell`, `user-menu-trigger` e `logout-button` permanecem presentes

### Requirement: Dashboard "Meus Quadros" com o layout do mockup
O sistema SHALL exibir em `/boards` uma grade de cards de quadro reproduzindo o layout de
`mockups/Meus Quadros.dc.html`, usando somente dados reais retornados pela API de quadros, com
criação, renomeação e exclusão de quadro preservadas.

#### Scenario: Grade de quadros reais no estilo do mockup
- **WHEN** um usuário autenticado com pelo menos um quadro acessa `/boards`
- **THEN** cada quadro é exibido como um card com capa, nome real do quadro e os demais campos do
  mockup (avatares, contagem, atividade recente) apenas quando a API expuser esse dado — campos
  não expostos pela API são omitidos, nunca preenchidos com valor fixo
- **AND** clicar em um card navega para `/boards/{id}` do quadro correspondente

#### Scenario: Criar, renomear e excluir quadro continuam funcionando
- **WHEN** o usuário cria um novo quadro pelo botão "Criar quadro", renomeia ou exclui um quadro
  existente pelo menu do card
- **THEN** as operações reais (`createBoard`, `renameBoard`, `deleteBoard`) são executadas como
  antes e a grade reflete o resultado, com o visual reestilizado do mockup

#### Scenario: Onboarding e skeleton de carregamento preservados
- **WHEN** o usuário autenticado não possui nenhum quadro ainda ou os quadros ainda estão
  carregando
- **THEN** o fluxo de onboarding (`014`) ou o skeleton de carregamento (`014`) são exibidos nos
  mesmos gatilhos de antes, apenas com estilo coerente ao restante da tela reestilizada

### Requirement: Quadro ao Vivo com o layout do mockup, sem cartão rico
O sistema SHALL exibir em `/boards/[id]` a toolbar, as colunas e os cartões do quadro
reproduzindo o layout de `mockups/Quadro ao Vivo.dc.html`, preservando DnD e tempo real via
Socket.IO, e SHALL restringir o conteúdo do cartão a apenas o título real, sem etiquetas, prazo,
checklist, responsáveis ou comentários.

#### Scenario: Toolbar exibe estado de conexão e ações reais
- **WHEN** o quadro está conectado ao Socket.IO
- **THEN** a toolbar exibe o badge "ao vivo" pulsante no estilo do mockup, os avatares de presença
  reais retornados por `useBoardSocket`, e os botões "Atividade"/"Compartilhar" que abrem os
  painéis reais de atividade e membros
- **AND** ao perder a conexão, o indicador reflete o estado de reconexão já existente (`014`), sem
  duplicar lógica

#### Scenario: Colunas e cartões reais com DnD preservado
- **WHEN** o usuário arrasta um cartão de uma coluna para outra
- **THEN** o movimento é refletido imediatamente na UI e propagado via Socket.IO para outros
  clientes conectados ao mesmo quadro, com o visual das colunas/cartões no estilo do mockup

#### Scenario: Cartão exibe somente o título real
- **WHEN** um cartão do quadro é renderizado
- **THEN** ele mostra apenas `card.title` com o estilo visual do mockup (cantos, borda, hover)
- **AND** nenhuma etiqueta, prazo, checklist, avatar de responsável, contador de comentário ou
  qualquer outro elemento do cartão rico do mockup é renderizado, mockado ou deixado como
  placeholder fixo

