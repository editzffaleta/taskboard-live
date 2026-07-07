## ADDED Requirements

### Requirement: Cor/realce do quadro

O sistema SHALL permitir que o owner do quadro defina uma cor/realce (`color`) para o quadro,
restrita a uma paleta fechada de 7 tokens (`blue`, `purple`, `green`, `red`, `amber`, `cyan`,
`slate`), persistida no `Board` e retornada em toda leitura de quadro.

#### Scenario: Owner altera a cor do quadro

- **WHEN** o owner autenticado envia `PATCH /boards/:id` com `color` pertencente à paleta
- **THEN** o quadro é atualizado com a nova cor
- **AND** o evento `board.updated` é emitido para `board:{boardId}` com o quadro completo,
  incluindo `color`

#### Scenario: Alteração de cor rejeita valor fora da paleta

- **WHEN** o owner autenticado envia `PATCH /boards/:id` com `color` que não está entre
  `blue, purple, green, red, amber, cyan, slate`
- **THEN** a requisição é rejeitada e o quadro não é alterado
- **AND** nenhum evento de tempo real é emitido

#### Scenario: Não-owner não pode alterar cor ou nome

- **WHEN** um membro autenticado que não é owner do quadro envia `PATCH /boards/:id` com `name`
  e/ou `color`
- **THEN** a requisição é rejeitada
- **AND** nenhum evento de tempo real é emitido

### Requirement: Gestão completa de etiquetas na tela de configurações

O sistema SHALL prover, na tela "Configurações do Quadro", uma lista completa de gestão de
etiquetas do quadro — criar, editar (renomear/recolorir) e excluir — reaproveitando os
endpoints de etiqueta já existentes (`GET/POST /boards/:boardId/labels`,
`PATCH/DELETE /boards/:boardId/labels/:id`), sem duplicar sua lógica de domínio.

#### Scenario: Owner gerencia etiquetas pela tela de configurações

- **WHEN** o owner autenticado acessa a tela de configurações do quadro e cria, edita ou exclui
  uma etiqueta
- **THEN** a operação é refletida na lista de etiquetas da própria tela
- **AND** a mesma operação é refletida nos chips de etiqueta do quadro ao vivo (via os eventos
  `label.created`/`label.updated`/`label.deleted` já emitidos pelos endpoints existentes)

### Requirement: Acesso restrito ao owner

O sistema SHALL restringir o acesso completo à tela "Configurações do Quadro" ao owner do
quadro; membros comuns não têm acesso aos controles de mutação (renomear, alterar cor, gerir
etiquetas, gerir membros, excluir quadro) a partir dessa tela.

#### Scenario: Owner acessa a tela de configurações

- **WHEN** o owner autenticado do quadro navega para a tela de configurações
- **THEN** todas as seções (Geral, Etiquetas, Membros, Zona de perigo) e seus controles de
  mutação são exibidos e funcionais

#### Scenario: Membro comum não altera configurações do quadro

- **WHEN** um membro autenticado que não é owner do quadro tenta acessar ou usar os controles
  de mutação da tela de configurações
- **THEN** o acesso é negado ou os controles de mutação não são oferecidos pela interface
- **AND** qualquer tentativa de mutação direta à API (`PATCH`/`DELETE /boards/:id`) é rejeitada
  pelo backend, como já ocorre para `rename-board`/`delete-board` (`005`)

### Requirement: Reflexo da cor do quadro no dashboard e no cabeçalho

O sistema SHALL exibir a cor/realce do quadro como indicador visual no dashboard ("Meus
quadros") e no cabeçalho do quadro ao vivo, atualizando o cabeçalho em tempo real quando a cor
é alterada por qualquer cliente com o quadro aberto.

#### Scenario: Cor alterada reflete no cabeçalho de clientes abertos

- **WHEN** o owner altera a cor do quadro na tela de configurações enquanto outro cliente tem o
  mesmo quadro aberto ao vivo
- **THEN** o cliente aberto recebe o evento `board.updated` via socket
- **AND** o cabeçalho do quadro ao vivo desse cliente reflete a nova cor sem recarregar a página

#### Scenario: Cor alterada reflete no dashboard

- **WHEN** o owner altera a cor do quadro e, em seguida, qualquer membro visita o dashboard
  ("Meus quadros")
- **THEN** o card do quadro no dashboard exibe o indicador visual com a nova cor

### Requirement: Zona de perigo restrita à exclusão existente

O sistema SHALL oferecer, na zona de perigo da tela de configurações, apenas a exclusão do
quadro (reaproveitando o endpoint `DELETE /boards/:id` já existente, com confirmação explícita
do usuário) e MUST NOT implementar arquivamento de quadro ou visibilidade pública por link
nesta mudança.

#### Scenario: Owner exclui o quadro pela tela de configurações

- **WHEN** o owner autenticado confirma a exclusão do quadro na zona de perigo
- **THEN** o endpoint `DELETE /boards/:id` já existente é chamado
- **AND** o usuário é redirecionado ao dashboard após a exclusão bem-sucedida

#### Scenario: Exclusão exige confirmação explícita

- **WHEN** o owner autenticado aciona "Excluir quadro" mas não confirma o diálogo de
  confirmação
- **THEN** nenhuma chamada a `DELETE /boards/:id` é feita e o quadro permanece intacto

#### Scenario: Nenhuma funcionalidade de arquivamento ou visibilidade pública é criada

- **WHEN** a tela de configurações do quadro é entregue por esta mudança
- **THEN** nenhum endpoint ou fluxo de arquivar/restaurar quadro é criado (escopo da `022`)
- **AND** nenhum endpoint ou fluxo de visibilidade pública por link ou espaço de trabalho é
  criado (fora de escopo do produto)
