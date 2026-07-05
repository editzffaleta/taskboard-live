## ADDED Requirements

### Requirement: Página de quadro kanban vivo

O sistema SHALL prover a página `/boards/[id]` que carrega o quadro autenticado via REST (dados do
quadro, listas e cartões) e renderiza as colunas e cartões correspondentes.

#### Scenario: Membro do quadro acessa a página e vê o quadro completo

- **WHEN** um usuário autenticado e membro do quadro acessa `/boards/:id`
- **THEN** a página carrega o nome do quadro, todas as listas na ordem correta e todos os cartões
  de cada lista na ordem correta
- **AND** nenhuma chamada adicional é necessária para exibir o estado inicial completo do quadro

#### Scenario: Usuário sem acesso ao quadro é bloqueado

- **WHEN** um usuário autenticado que não é membro do quadro acessa `/boards/:id`
- **THEN** a página exibe um estado de erro amigável em vez do conteúdo do quadro
- **AND** nenhuma lista ou cartão do quadro é exibido

### Requirement: Drag-and-drop otimista de cartões e listas

O sistema SHALL permitir arrastar cartões entre colunas e dentro de uma coluna, e arrastar colunas
para reordenar o quadro, aplicando a mudança otimisticamente no estado local e persistindo via REST.

#### Scenario: Mover cartão entre colunas persiste e reflete localmente de imediato

- **WHEN** o usuário arrasta um cartão de uma coluna para outra
- **THEN** o cartão aparece imediatamente na coluna de destino, na posição do drop, antes de
  qualquer resposta do servidor
- **AND** uma chamada `PATCH /cards/:id/move` é disparada com a nova lista e posição

#### Scenario: Falha na persistência reverte o drag

- **WHEN** o usuário arrasta um cartão ou uma lista e a chamada REST de persistência falha
- **THEN** o estado local do quadro reverte para a configuração anterior ao drag
- **AND** uma mensagem de erro é exibida ao usuário

#### Scenario: Reordenar listas persiste a nova ordem

- **WHEN** o usuário arrasta uma coluna para uma nova posição no quadro
- **THEN** a ordem das colunas é atualizada imediatamente no estado local
- **AND** uma chamada `PATCH /lists/:id/move` é disparada com a nova posição

### Requirement: Reconciliação em tempo real via Socket.IO

O sistema SHALL manter um cliente Socket.IO conectado enquanto a página do quadro estiver montada,
entrando na sala do quadro e aplicando ao estado local os eventos de domínio emitidos pelo servidor
originados de outros usuários, sem exigir recarregamento da página.

#### Scenario: Mudança de outro membro aparece sem reload

- **WHEN** outro membro do mesmo quadro move, cria, atualiza ou exclui um cartão ou uma lista
- **THEN** o evento correspondente (`card.created`, `card.updated`, `card.moved`, `card.deleted`,
  `list.created`, `list.updated`, `list.moved`, `list.deleted`) é recebido pelo cliente
- **AND** o estado local do quadro é atualizado para refletir a mudança sem recarregar a página

#### Scenario: Entrar e sair da sala do quadro

- **WHEN** a página do quadro é montada
- **THEN** o cliente emite `board:join` com o id do quadro
- **AND** ao desmontar a página ou trocar de quadro, o cliente emite `board:leave` e desconecta o
  socket

#### Scenario: Reconexão após queda de conexão

- **WHEN** a conexão Socket.IO cai e é restabelecida automaticamente
- **THEN** o cliente reemite `board:join` para o quadro atualmente aberto
- **AND** volta a receber os eventos de domínio normalmente

#### Scenario: Evento próprio não duplica o estado

- **WHEN** o servidor emite de volta um evento correspondente a uma mutação que o próprio usuário já
  aplicou otimisticamente
- **THEN** aplicar o evento recebido não duplica o cartão ou a lista nem produz um estado
  inconsistente

### Requirement: Presença de usuários no quadro

O sistema SHALL exibir os usuários atualmente visualizando o quadro, a partir do evento
`presence.update` recebido pelo Socket.IO.

#### Scenario: Avatares de presença refletem quem está no quadro

- **WHEN** o cliente recebe `presence.update` com a lista de usuários atuais do quadro
- **THEN** a interface exibe um indicador visual (avatar ou iniciais) para cada usuário presente
- **AND** ao atualizar `presence.update`, usuários que saíram deixam de aparecer

### Requirement: CRUD inline de listas e cartões

O sistema SHALL permitir criar, renomear e excluir listas e cartões diretamente na página do
quadro, sem navegação para outra tela, persistindo via REST com atualização otimista.

#### Scenario: Criar lista

- **WHEN** o usuário informa um título e confirma a criação de uma nova lista
- **THEN** a lista aparece imediatamente no quadro
- **AND** uma chamada REST de criação é disparada para persistir a lista

#### Scenario: Renomear e excluir cartão

- **WHEN** o usuário edita o título de um cartão ou solicita sua exclusão
- **THEN** a mudança é refletida imediatamente no estado local
- **AND** a chamada REST correspondente (`PATCH`/`DELETE`) é disparada para persistir a mudança

### Requirement: Escopo restrito à experiência de quadro ao vivo

Esta mudança SHALL entregar apenas a página de quadro kanban vivo e MUST NOT implementar gestão de
membros/convites além da exibição de presença de leitura, nem feed de atividade do quadro.

#### Scenario: Nenhuma gestão de membros ou atividade é criada

- **WHEN** a página de quadro ao vivo é entregue
- **THEN** não existe nenhuma tela ou ação de convite/gestão de membros nesta mudança
- **AND** não existe nenhum feed ou painel de atividade do quadro nesta mudança
- **AND** os pontos de extensão (`onMemberAdded`, `onActivityAppended`, área reservada de layout)
  estão disponíveis para as mudanças seguintes reutilizarem
