# cartoes Specification

## Purpose
TBD - created by archiving change 008-cartoes. Update Purpose after archive.
## Requirements
### Requirement: Agregado card com criação, edição e exclusão

O sistema SHALL prover o agregado `card` no módulo `board`, permitindo que um membro do quadro
crie, edite e exclua cartões dentro de uma lista existente.

#### Scenario: Membro cria um cartão

- **WHEN** um membro autenticado do quadro envia `POST /boards/:boardId/cards` com `listId` e
  `title` válidos
- **THEN** o cartão é criado com `position` no fim da lista informada
- **AND** o evento `card.created` é emitido para `board:{boardId}` com o cartão criado

#### Scenario: Membro edita um cartão

- **WHEN** um membro autenticado envia `PATCH /boards/:boardId/cards/:id` com `title` e/ou
  `description`
- **THEN** o cartão é atualizado sem alterar `listId` ou `position`
- **AND** o evento `card.updated` é emitido para `board:{boardId}` com o cartão atualizado

#### Scenario: Membro exclui um cartão

- **WHEN** um membro autenticado envia `DELETE /boards/:boardId/cards/:id`
- **THEN** o cartão é removido e as posições dos cartões remanescentes da mesma lista são
  renormalizadas sem gaps
- **AND** o evento `card.deleted` é emitido para `board:{boardId}` com o `cardId` e o `listId`

### Requirement: Movimentação de cartão entre listas

O sistema SHALL permitir mover um cartão para outra posição dentro da mesma lista ou para outra
lista do mesmo quadro, renormalizando as posições afetadas.

#### Scenario: Membro move cartão dentro da mesma lista

- **WHEN** um membro autenticado envia `PATCH /boards/:boardId/cards/:id/move` com `toListId`
  igual à lista atual do cartão e uma nova `position`
- **THEN** o cartão é reposicionado dentro da lista e as posições dos demais cartões da lista
  são renormalizadas
- **AND** o evento `card.moved` é emitido para `board:{boardId}` com
  `{cardId, fromListId, toListId, position}`

#### Scenario: Membro move cartão para outra lista do mesmo quadro

- **WHEN** um membro autenticado envia `PATCH /boards/:boardId/cards/:id/move` com `toListId`
  de uma lista diferente pertencente ao mesmo quadro e uma `position`
- **THEN** o cartão é removido da lista de origem, as posições remanescentes da origem são
  renormalizadas, o cartão é inserido na posição pedida da lista de destino e as posições da
  lista de destino são renormalizadas
- **AND** o evento `card.moved` é emitido para `board:{boardId}` com
  `{cardId, fromListId, toListId, position}`

#### Scenario: Movimentação para lista de outro quadro é rejeitada

- **WHEN** um membro autenticado envia `PATCH /boards/:boardId/cards/:id/move` com `toListId`
  que pertence a um quadro diferente de `:boardId`
- **THEN** a requisição é rejeitada e nenhuma mutação é persistida
- **AND** nenhum evento de tempo real é emitido

### Requirement: Autorização por membership do quadro

O sistema SHALL restringir todas as mutações de cartão a usuários autenticados que sejam
membros (`BoardMember`) do quadro dono da lista/cartão.

#### Scenario: Não-membro é bloqueado

- **WHEN** um usuário autenticado que não é `BoardMember` do quadro tenta criar, editar, excluir
  ou mover um cartão em `/boards/:boardId/cards`
- **THEN** a requisição é rejeitada antes de qualquer alteração de dados
- **AND** nenhum evento de tempo real é emitido

### Requirement: Persistência Prisma do cartão

O sistema SHALL persistir cartões via Prisma com FK para a lista proprietária, removendo os
cartões automaticamente quando a lista é excluída.

#### Scenario: Cartão é removido em cascata com a lista

- **WHEN** uma lista contendo cartões é excluída
- **THEN** todos os cartões associados a ela são removidos junto, sem erro de integridade
  referencial

### Requirement: Escopo restrito ao agregado card sem UI

Esta mudança SHALL entregar apenas o agregado `card` (domínio, casos de uso, persistência,
endpoints e eventos de tempo real) e MUST NOT criar interface de usuário ou registro de
atividade/auditoria.

#### Scenario: Nenhuma UI ou auditoria é criada

- **WHEN** o agregado `card` é entregue
- **THEN** nenhuma tela, componente de drag-and-drop ou renderização de cartões é criada (escopo
  da `009`)
- **AND** nenhum registro de atividade/auditoria dos eventos de cartão é criado (escopo da `011`)

