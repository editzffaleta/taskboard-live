## ADDED Requirements

### Requirement: Arquivar e restaurar cartão

O sistema SHALL permitir que um membro do quadro arquive e restaure um cartão, marcando/limpando
`archivedAt` sem removê-lo do banco.

#### Scenario: Membro arquiva um cartão

- **WHEN** um membro autenticado do quadro envia
  `POST /boards/:boardId/cards/:id/archive`
- **THEN** o cartão recebe `archivedAt` com a data/hora atual
- **AND** o evento `card.deleted` é emitido para `board:{boardId}` com `{cardId, listId}`
- **AND** o cartão deixa de aparecer em `GET /boards/:boardId` (dentro de suas listas)

#### Scenario: Membro restaura um cartão arquivado

- **WHEN** um membro autenticado envia `POST /boards/:boardId/cards/:id/restore` para um cartão
  com `archivedAt` preenchido
- **THEN** `archivedAt` volta a `null`
- **AND** o evento `card.created` é emitido para `board:{boardId}` com o cartão restaurado
- **AND** o cartão volta a aparecer em `GET /boards/:boardId`

#### Scenario: Arquivar cartão já arquivado é rejeitado

- **WHEN** um membro envia `POST .../archive` para um cartão cujo `archivedAt` já está
  preenchido
- **THEN** a requisição é rejeitada com `card.already.archived`
- **AND** nenhum evento de tempo real é emitido

### Requirement: Arquivar e restaurar lista

O sistema SHALL permitir que um membro do quadro arquive e restaure uma lista, sem propagar
`archivedAt` para os cartões dessa lista.

#### Scenario: Membro arquiva uma lista

- **WHEN** um membro autenticado envia `POST /lists/:id/archive`
- **THEN** a lista recebe `archivedAt` com a data/hora atual
- **AND** o evento `list.deleted` é emitido para `board:{boardId}` com `{listId}`
- **AND** os cartões dessa lista **não** têm `archivedAt` alterado
- **AND** a lista deixa de aparecer em `GET /boards/:boardId`

#### Scenario: Membro restaura uma lista arquivada

- **WHEN** um membro autenticado envia `POST /lists/:id/restore` para uma lista com `archivedAt`
  preenchido
- **THEN** `archivedAt` volta a `null`
- **AND** o evento `list.created` é emitido para `board:{boardId}` com a lista restaurada
- **AND** a lista volta a aparecer em `GET /boards/:boardId`, com seus cartões (que nunca
  saíram do banco) já dentro dela

### Requirement: Arquivar e restaurar quadro

O sistema SHALL permitir que o owner do quadro arquive e restaure o próprio quadro, sem propagar
`archivedAt` para listas/cartões internos.

#### Scenario: Owner arquiva o próprio quadro

- **WHEN** o owner do quadro envia `POST /boards/:id/archive`
- **THEN** o quadro recebe `archivedAt` com a data/hora atual
- **AND** o quadro deixa de aparecer em `GET /boards` (listagem "Meus quadros") para todos os
  membros
- **AND** as listas/cartões do quadro **não** têm `archivedAt` alterado

#### Scenario: Não-owner tenta arquivar o quadro

- **WHEN** um membro que não é owner envia `POST /boards/:id/archive`
- **THEN** a requisição é rejeitada com `board.owner.required` (403)
- **AND** o quadro permanece sem `archivedAt`

#### Scenario: Owner restaura um quadro arquivado

- **WHEN** o owner envia `POST /boards/:id/restore` para um quadro com `archivedAt` preenchido
- **THEN** `archivedAt` volta a `null`
- **AND** o quadro volta a aparecer em `GET /boards` para seus membros, com as listas/cartões
  internos (que nunca saíram do banco) intactos

### Requirement: Leituras normais escondem itens arquivados

O sistema SHALL excluir automaticamente itens com `archivedAt` preenchido das leituras usadas
pelo quadro ao vivo e pelo dashboard.

#### Scenario: Detalhe do quadro não traz listas/cartões arquivados

- **WHEN** um membro busca `GET /boards/:boardId`
- **THEN** a resposta não inclui listas nem cartões cujo `archivedAt` esteja preenchido

#### Scenario: Dashboard não traz quadros arquivados

- **WHEN** um usuário busca `GET /boards`
- **THEN** a resposta não inclui quadros cujo `archivedAt` esteja preenchido, mesmo que o
  usuário ainda seja `BoardMember` deles

### Requirement: Tela Arquivados lista e permite restaurar

O sistema SHALL prover um endpoint agregado que reúne, para o usuário autenticado, os cartões e
listas arquivados dos quadros ativos de que é membro, e os quadros arquivados de que é owner.

#### Scenario: Usuário consulta seus itens arquivados

- **WHEN** um usuário autenticado envia `GET /archived`
- **THEN** a resposta traz `{cards, lists, boards}` com os itens arquivados relevantes ao
  usuário, cada um com dados suficientes para exibição (título/nome, origem, `archivedAt`)

#### Scenario: Quadro arquivado não duplica seus itens internos na resposta

- **WHEN** um quadro inteiro está arquivado e também possui listas/cartões cujo `archivedAt`
  individual está `null`
- **THEN** a resposta de `GET /archived` lista esse quadro na coleção `boards`
- **AND** **não** lista as listas/cartões internos desse quadro nas coleções `lists`/`cards`

#### Scenario: Restaurar a partir da tela Arquivados

- **WHEN** o usuário aciona "Restaurar" em um item retornado por `GET /archived`
- **THEN** o endpoint de restore correspondente ao tipo do item é chamado
- **AND**, após sucesso, o item deixa de aparecer em uma nova consulta a `GET /archived`
- **AND** o item volta a aparecer nas leituras normais (`GET /boards/:boardId` ou `GET /boards`)

### Requirement: Excluir definitivamente a partir da tela Arquivados

O sistema SHALL permitir excluir definitivamente (hard delete, irreversível) um item arquivado
diretamente da tela Arquivados, reaproveitando os endpoints de exclusão já existentes.

#### Scenario: Usuário exclui definitivamente um cartão arquivado

- **WHEN** o usuário aciona "Excluir definitivamente" em um cartão arquivado e confirma
- **THEN** o mesmo endpoint `DELETE /boards/:boardId/cards/:id` já existente é chamado
- **AND** o cartão é removido permanentemente e não pode mais ser restaurado
