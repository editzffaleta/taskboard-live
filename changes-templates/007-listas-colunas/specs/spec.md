## ADDED Requirements

### Requirement: Criação de lista com posição no fim

O sistema SHALL permitir que um membro do quadro crie uma lista (coluna) informando apenas o
`title`, com a `position` calculada automaticamente como a última posição do quadro.

#### Scenario: Membro cria uma lista

- **WHEN** um membro do quadro envia `POST /boards/:boardId/lists` com `{ title }`
- **THEN** a lista é criada com `position` igual ao fim das listas existentes do quadro
- **AND** o evento `list.created` é emitido para a sala `board:{boardId}`

#### Scenario: Não-membro não pode criar lista

- **WHEN** um usuário autenticado que não é membro do quadro tenta `POST /boards/:boardId/lists`
- **THEN** a requisição é rejeitada com `403`
- **AND** nenhuma lista é criada e nenhum evento é emitido

### Requirement: Renomeação de lista restrita a membros

O sistema SHALL permitir que um membro do quadro renomeie uma lista existente via
`PATCH /lists/:id`.

#### Scenario: Membro renomeia a lista

- **WHEN** um membro do quadro envia `PATCH /lists/:id` com `{ title }`
- **THEN** o `title` da lista é atualizado
- **AND** o evento `list.updated` é emitido para a sala `board:{boardId}` da lista

#### Scenario: Lista inexistente

- **WHEN** `PATCH /lists/:id` é chamado com um `id` que não existe
- **THEN** a requisição é rejeitada com `404`

### Requirement: Exclusão de lista remove seus cartões

O sistema SHALL permitir que um membro do quadro exclua uma lista via `DELETE /lists/:id`,
removendo também os cartões associados a ela.

#### Scenario: Membro exclui a lista

- **WHEN** um membro do quadro envia `DELETE /lists/:id`
- **THEN** a lista e todos os seus cartões são removidos
- **AND** o evento `list.deleted` com `{ listId }` é emitido para a sala `board:{boardId}` da
  lista

### Requirement: Reordenação de listas sem duplicar ou lacunar posições

O sistema SHALL permitir que um membro do quadro reordene as listas via
`PATCH /lists/:id/move` com `{ position }`, renormalizando a posição de todas as listas do mesmo
quadro em uma única operação.

#### Scenario: Membro move uma lista para nova posição

- **WHEN** um membro do quadro envia `PATCH /lists/:id/move` com `{ position }`
- **THEN** a lista passa a ocupar a posição solicitada
- **AND** as demais listas do mesmo quadro têm sua `position` renormalizada sem duplicações ou
  lacunas
- **AND** o evento `list.moved` com as listas reordenadas é emitido para a sala `board:{boardId}`

### Requirement: Acesso restrito a membros do quadro

O sistema SHALL restringir todas as mutações de lista (`create`, `rename`, `delete`, `move`) a
usuários autenticados que sejam membros do quadro dono da lista.

#### Scenario: Requisição sem autenticação

- **WHEN** qualquer endpoint de `/boards/:boardId/lists` ou `/lists/:id` é chamado sem token JWT
  válido
- **THEN** a requisição é rejeitada com `401`

#### Scenario: Usuário autenticado sem associação ao quadro

- **WHEN** um usuário autenticado que não é `BoardMember` do quadro tenta qualquer mutação de
  lista desse quadro
- **THEN** a requisição é rejeitada com `403`
- **AND** nenhum evento de tempo real é emitido
