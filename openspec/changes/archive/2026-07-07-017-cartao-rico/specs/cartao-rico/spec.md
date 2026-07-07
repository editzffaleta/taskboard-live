## ADDED Requirements

### Requirement: Prazo do cartão

O sistema SHALL permitir que um membro do quadro defina ou limpe o prazo (`dueDate`) de um
cartão.

#### Scenario: Membro define o prazo de um cartão

- **WHEN** um membro autenticado envia `PATCH /boards/:boardId/cards/:id/due` com
  `{ dueDate: "<ISO 8601>" }`
- **THEN** o `dueDate` do cartão é atualizado
- **AND** o evento `card.updated` é emitido para `board:{boardId}` com o cartão completo,
  incluindo o `dueDate` atualizado

#### Scenario: Membro limpa o prazo de um cartão

- **WHEN** um membro autenticado envia `PATCH /boards/:boardId/cards/:id/due` com
  `{ dueDate: null }` em um cartão que já tem prazo definido
- **THEN** o `dueDate` do cartão passa a `null`
- **AND** o evento `card.updated` é emitido com o cartão completo refletindo `dueDate: null`

### Requirement: Checklist do cartão

O sistema SHALL prover um checklist por cartão, com itens de texto, estado concluído/pendente,
ordenação e as operações de criar, marcar/desmarcar, editar, excluir e reordenar.

#### Scenario: Membro adiciona um item ao checklist

- **WHEN** um membro autenticado envia
  `POST /boards/:boardId/cards/:cardId/checklist` com `{text}` não vazio
- **THEN** o item é criado associado ao `cardId`, com `done: false` e `position` ao final da
  lista existente
- **AND** o evento `card.updated` é emitido para `board:{boardId}` com o cartão completo,
  incluindo o `checklist` atualizado

#### Scenario: Criação de item rejeita texto vazio

- **WHEN** um membro autenticado envia `POST .../checklist` com `text` vazio ou ausente
- **THEN** a requisição é rejeitada e nenhum item é persistido
- **AND** nenhum evento de tempo real é emitido

#### Scenario: Membro alterna o estado concluído de um item

- **WHEN** um membro autenticado envia
  `PATCH /boards/:boardId/cards/:cardId/checklist/:itemId` com `{done: true}` ou `{done: false}`
- **THEN** o `done` do item é atualizado
- **AND** o evento `card.updated` é emitido com o `checklist` atualizado

#### Scenario: Membro edita o texto de um item

- **WHEN** um membro autenticado envia
  `PATCH /boards/:boardId/cards/:cardId/checklist/:itemId/text` com `{text}` não vazio
- **THEN** o texto do item é atualizado
- **AND** o evento `card.updated` é emitido com o `checklist` atualizado

#### Scenario: Membro exclui um item do checklist

- **WHEN** um membro autenticado envia
  `DELETE /boards/:boardId/cards/:cardId/checklist/:itemId`
- **THEN** o item é removido do checklist
- **AND** o evento `card.updated` é emitido com o `checklist` atualizado, sem o item excluído

#### Scenario: Membro reordena os itens do checklist

- **WHEN** um membro autenticado envia `PUT /boards/:boardId/cards/:cardId/checklist/order` com
  `{itemIds: [...]}` contendo todos os ids dos itens do cartão em uma nova ordem
- **THEN** o `position` de cada item é reatribuído conforme a ordem enviada
- **AND** o evento `card.updated` é emitido com o `checklist` na nova ordem

#### Scenario: Operação de checklist em item de outro cartão é rejeitada

- **WHEN** um membro autenticado envia qualquer mutação de checklist referenciando um
  `itemId` que não pertence ao `cardId` da rota
- **THEN** a requisição é rejeitada e nenhuma alteração é persistida
- **AND** nenhum evento de tempo real é emitido

### Requirement: Responsáveis do cartão restritos a membros do quadro

O sistema SHALL permitir atribuir e remover responsáveis (`assignees`) de um cartão, de forma
idempotente, restrita a usuários que sejam membros (`BoardMember`) do quadro do cartão.

#### Scenario: Membro atribui um responsável a um cartão

- **WHEN** um membro autenticado envia
  `PUT /boards/:boardId/cards/:cardId/assignees/:userId` em que `:userId` é `BoardMember` do
  quadro
- **THEN** o usuário passa a constar em `assignees` do cartão
- **AND** o evento `card.updated` é emitido para `board:{boardId}` com o cartão completo,
  incluindo `assignees` atualizado

#### Scenario: Atribuição rejeita usuário que não é membro do quadro

- **WHEN** um membro autenticado envia `PUT .../assignees/:userId` em que `:userId` não é
  `BoardMember` do quadro do cartão
- **THEN** a requisição é rejeitada e nenhuma associação é persistida
- **AND** nenhum evento de tempo real é emitido

#### Scenario: Atribuir responsável já atribuído é idempotente

- **WHEN** um membro autenticado envia `PUT .../assignees/:userId` para um usuário já atribuído
  ao cartão
- **THEN** nenhuma linha duplicada de associação é criada
- **AND** o evento `card.updated` é emitido normalmente, sem duplicar o usuário em `assignees`

#### Scenario: Membro remove um responsável de um cartão

- **WHEN** um membro autenticado envia `DELETE /boards/:boardId/cards/:cardId/assignees/:userId`
  para um usuário atribuído ao cartão
- **THEN** o usuário deixa de constar em `assignees` do cartão
- **AND** o evento `card.updated` é emitido com `assignees` atualizado

#### Scenario: Remover responsável não atribuído é idempotente

- **WHEN** um membro autenticado envia `DELETE .../assignees/:userId` para um usuário que não
  está atribuído ao cartão
- **THEN** a requisição não lança erro
- **AND** o evento `card.updated` é emitido normalmente com `assignees` inalterado

### Requirement: Comentários do cartão

O sistema SHALL permitir que membros do quadro criem e listem (paginado, do mais recente para o
mais antigo) comentários em um cartão, e que apenas o autor de um comentário o exclua.

#### Scenario: Membro adiciona um comentário

- **WHEN** um membro autenticado envia `POST /boards/:boardId/cards/:cardId/comments` com
  `{text}` não vazio
- **THEN** o comentário é criado associado ao `cardId` e ao usuário autenticado como autor
- **AND** o evento `comment.created` é emitido para `board:{boardId}` com o comentário criado

#### Scenario: Criação de comentário rejeita texto vazio

- **WHEN** um membro autenticado envia `POST .../comments` com `text` vazio ou ausente
- **THEN** a requisição é rejeitada e nenhum comentário é persistido
- **AND** nenhum evento de tempo real é emitido

#### Scenario: Membro lista os comentários de um cartão

- **WHEN** um membro autenticado envia `GET /boards/:boardId/cards/:cardId/comments?page=1`
- **THEN** a resposta contém os comentários do cartão ordenados do mais recente para o mais
  antigo, paginados, com o total de comentários

#### Scenario: Autor exclui seu próprio comentário

- **WHEN** o autor de um comentário envia `DELETE .../comments/:id`
- **THEN** o comentário é removido
- **AND** o evento `comment.deleted` é emitido para `board:{boardId}` com o `commentId`

#### Scenario: Membro que não é o autor não pode excluir o comentário

- **WHEN** um membro autenticado do quadro (que não é o autor do comentário) envia
  `DELETE .../comments/:id`
- **THEN** a requisição é rejeitada com autorização negada
- **AND** o comentário não é removido
- **AND** nenhum evento de tempo real é emitido

### Requirement: Autorização por membership do quadro em todos os sub-recursos

O sistema SHALL restringir toda mutação e leitura de prazo, checklist, responsáveis e
comentários a usuários autenticados que sejam membros (`BoardMember`) do quadro dono do cartão.

#### Scenario: Não-membro é bloqueado em qualquer sub-recurso do cartão rico

- **WHEN** um usuário autenticado que não é `BoardMember` do quadro tenta definir prazo,
  criar/editar/alternar/excluir/reordenar item de checklist, atribuir/remover responsável ou
  criar/listar comentário em um cartão do quadro
- **THEN** a requisição é rejeitada antes de qualquer alteração de dados
- **AND** nenhum evento de tempo real é emitido

### Requirement: Persistência Prisma dos sub-recursos do cartão rico

O sistema SHALL persistir `dueDate` como coluna do próprio `Card`, e `ChecklistItem`,
`CardAssignee` e `Comment` via Prisma com FKs para o cartão (e para o usuário, no caso de
`CardAssignee`/`Comment`), removendo os registros dependentes automaticamente quando o cartão é
excluído.

#### Scenario: Sub-recursos são removidos em cascata com o cartão

- **WHEN** um cartão com itens de checklist, responsáveis atribuídos e/ou comentários é
  excluído
- **THEN** todos os `ChecklistItem`, `CardAssignee` e `Comment` associados a ele são removidos
  junto, sem erro de integridade referencial

### Requirement: Cartão enriquecido no payload de eventos e no detalhe do quadro

O sistema SHALL incluir `dueDate`, `assignees` e `checklist` no payload de cartão retornado por
`GET /boards/:id` (detalhe do quadro) e em todo evento de tempo real que carrega o cartão
completo (`card.created`, `card.updated`, e os eventos emitidos pelos casos de uso desta
change), sem remover ou renomear nenhum campo já existente (`id`, `listId`, `title`,
`description`, `position`, `createdAt`, `labels`). `comments` NÃO SHALL constar nesse payload —
é obtido separadamente via `GET /boards/:boardId/cards/:cardId/comments`.

#### Scenario: Detalhe do quadro traz o cartão enriquecido

- **WHEN** um membro autenticado envia `GET /boards/:id`
- **THEN** cada cartão no payload inclui `dueDate`, `assignees` e `checklist` (além dos campos
  já existentes, incluindo `labels`)
- **AND** o payload não inclui comentários do cartão

#### Scenario: Shape existente não é quebrado

- **WHEN** qualquer evento `card.created`/`card.updated` é emitido após esta change
- **THEN** os campos `id`, `listId`, `title`, `description`, `position`, `createdAt` e `labels`
  continuam presentes com o mesmo significado de antes
- **AND** `dueDate`, `assignees` e `checklist` são campos adicionais, nunca substituindo os
  existentes

### Requirement: Escopo restrito ao backend do cartão rico

Esta mudança SHALL entregar apenas o backend de prazo, checklist, responsáveis e comentários
(domínio, casos de uso, persistência, endpoints, eventos de tempo real, hidratação no
board-detail), e MUST NOT criar a UI do detalhe do cartão nem os filtros/visões por esses
campos.

#### Scenario: Nenhuma UI de detalhe do cartão é criada

- **WHEN** o backend do cartão rico é entregue
- **THEN** nenhuma tela de detalhe do cartão dedicada é criada (escopo da `018`)
- **AND** nenhum filtro ou visão por prazo/responsável/checklist é criado (escopo da `019`)
