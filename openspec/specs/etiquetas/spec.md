# etiquetas Specification

## Purpose
TBD - created by archiving change 016-etiquetas. Update Purpose after archive.
## Requirements
### Requirement: Agregado label com criação, edição e exclusão

O sistema SHALL prover o agregado `label` no módulo `board`, permitindo que um membro do quadro
crie, edite (renomeie/recolorir) e exclua etiquetas do quadro, restritas à paleta de 7 cores
(`red`, `amber`, `green`, `blue`, `purple`, `teal`, `pink`).

#### Scenario: Membro cria uma etiqueta

- **WHEN** um membro autenticado do quadro envia `POST /boards/:boardId/labels` com `name` e
  `color` válidos (`color` ∈ paleta)
- **THEN** a etiqueta é criada associada ao `boardId`
- **AND** o evento `label.created` é emitido para `board:{boardId}` com a etiqueta criada

#### Scenario: Criação rejeita cor fora da paleta

- **WHEN** um membro autenticado envia `POST /boards/:boardId/labels` com `color` que não está
  entre `red, amber, green, blue, purple, teal, pink`
- **THEN** a requisição é rejeitada e nenhuma etiqueta é persistida
- **AND** nenhum evento de tempo real é emitido

#### Scenario: Membro edita uma etiqueta

- **WHEN** um membro autenticado envia `PATCH /boards/:boardId/labels/:id` com `name` e/ou
  `color` válidos
- **THEN** a etiqueta é atualizada
- **AND** o evento `label.updated` é emitido para `board:{boardId}` com a etiqueta atualizada

#### Scenario: Membro exclui uma etiqueta

- **WHEN** um membro autenticado envia `DELETE /boards/:boardId/labels/:id`
- **THEN** a etiqueta é removida e todas as suas associações `CardLabel` com cartões do quadro
  são removidas em cascata
- **AND** o evento `label.deleted` é emitido para `board:{boardId}` com o `labelId`

### Requirement: Listagem de etiquetas do quadro

O sistema SHALL permitir que um membro do quadro liste todas as etiquetas cadastradas nele.

#### Scenario: Membro lista as etiquetas do quadro

- **WHEN** um membro autenticado envia `GET /boards/:boardId/labels`
- **THEN** a resposta contém todas as etiquetas do quadro ordenadas por data de criação

### Requirement: Atribuição e remoção de etiqueta em cartão

O sistema SHALL permitir atribuir e remover etiquetas de um cartão, de forma idempotente,
restrita a etiquetas e cartões pertencentes ao mesmo quadro.

#### Scenario: Membro atribui etiqueta a um cartão

- **WHEN** um membro autenticado envia `PUT /boards/:boardId/cards/:cardId/labels/:labelId` com
  `cardId` e `labelId` pertencentes ao mesmo `boardId`
- **THEN** a etiqueta passa a constar em `labels` do cartão
- **AND** o evento `card.updated` é emitido para `board:{boardId}` com o cartão completo,
  incluindo `labels` atualizado

#### Scenario: Atribuir etiqueta já atribuída é idempotente

- **WHEN** um membro autenticado envia `PUT /boards/:boardId/cards/:cardId/labels/:labelId` para
  uma etiqueta já atribuída ao cartão
- **THEN** nenhuma linha duplicada de associação é criada
- **AND** o evento `card.updated` é emitido normalmente com o cartão (sem duplicar a etiqueta em
  `labels`)

#### Scenario: Membro remove etiqueta de um cartão

- **WHEN** um membro autenticado envia `DELETE /boards/:boardId/cards/:cardId/labels/:labelId`
  para uma etiqueta atribuída ao cartão
- **THEN** a etiqueta deixa de constar em `labels` do cartão
- **AND** o evento `card.updated` é emitido para `board:{boardId}` com o cartão completo,
  incluindo `labels` atualizado

#### Scenario: Remover etiqueta não atribuída é idempotente

- **WHEN** um membro autenticado envia `DELETE /boards/:boardId/cards/:cardId/labels/:labelId`
  para uma etiqueta que não está atribuída ao cartão
- **THEN** a requisição não lança erro
- **AND** o evento `card.updated` é emitido normalmente com o cartão inalterado em `labels`

#### Scenario: Atribuição cross-board é rejeitada

- **WHEN** um membro autenticado envia `PUT` ou `DELETE
  /boards/:boardId/cards/:cardId/labels/:labelId` em que `cardId` ou `labelId` pertence a um
  quadro diferente de `:boardId`
- **THEN** a requisição é rejeitada e nenhuma mutação é persistida
- **AND** nenhum evento de tempo real é emitido

### Requirement: Autorização por membership do quadro

O sistema SHALL restringir todas as mutações e leituras de etiqueta a usuários autenticados que
sejam membros (`BoardMember`) do quadro dono da etiqueta/cartão.

#### Scenario: Não-membro é bloqueado

- **WHEN** um usuário autenticado que não é `BoardMember` do quadro tenta criar, editar,
  excluir, listar, atribuir ou remover etiquetas em `/boards/:boardId/labels` ou
  `/boards/:boardId/cards/:cardId/labels/:labelId`
- **THEN** a requisição é rejeitada antes de qualquer alteração de dados
- **AND** nenhum evento de tempo real é emitido

### Requirement: Persistência Prisma da etiqueta e da associação com o cartão

O sistema SHALL persistir etiquetas via Prisma com FK para o quadro proprietário, e a associação
`CardLabel` com FKs para o cartão e para a etiqueta, removendo os registros dependentes
automaticamente quando quadro, cartão ou etiqueta são excluídos.

#### Scenario: Etiquetas são removidas em cascata com o quadro

- **WHEN** um quadro contendo etiquetas é excluído
- **THEN** todas as etiquetas associadas a ele são removidas junto, sem erro de integridade
  referencial

#### Scenario: Associações são removidas em cascata com o cartão ou com a etiqueta

- **WHEN** um cartão com etiquetas atribuídas é excluído, ou uma etiqueta atribuída a cartões é
  excluída
- **THEN** todas as associações `CardLabel` correspondentes são removidas junto, sem erro de
  integridade referencial

### Requirement: Escopo restrito a etiquetas, sem tela de gestão completa

Esta mudança SHALL entregar apenas o agregado `label` (domínio, casos de uso, persistência,
endpoints e eventos de tempo real), os chips de etiqueta no cartão do quadro ao vivo e um
popover mínimo de criação/atribuição a partir do cartão, e MUST NOT criar a tela completa de
gestão de etiquetas em "Configurações do Quadro", nem os demais campos do cartão rico (prazo,
checklist, responsáveis, comentários) ou o detalhe do cartão como tela dedicada.

#### Scenario: Nenhuma tela de configurações do quadro é criada

- **WHEN** o agregado `label` é entregue
- **THEN** nenhuma tela de "Configurações do Quadro" para gestão completa de etiquetas é criada
  (escopo da `020`)
- **AND** nenhum campo de prazo, checklist, responsáveis ou comentários é adicionado ao cartão
  (escopo da `017`)
- **AND** nenhuma tela de detalhe do cartão dedicada é criada (escopo da `018`)

