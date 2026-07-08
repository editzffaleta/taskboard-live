# cartao-acoes Specification

## Purpose
TBD - created by archiving change 031-cartao-copiar-capa-atividade. Update Purpose after archive.
## Requirements
### Requirement: Copiar cartão

O sistema SHALL permitir que um membro do quadro crie uma cópia de um cartão existente, na
mesma lista ou em uma lista destino informada, copiando `title` (com sufixo indicando cópia),
`description`, `labels`, `dueDate` e `checklist`, opcionalmente `assignees`, e MUST NOT copiar
`comments` nem `cover`.

#### Scenario: Membro copia um cartão na mesma lista

- **WHEN** um membro autenticado envia `POST /boards/:boardId/cards/:id/copy` sem `toListId`
- **THEN** um novo cartão é criado na mesma lista do cartão original, ao final da lista
- **AND** o cartão novo tem `title` do original com sufixo indicando cópia, mesma
  `description`, `dueDate`, `labels` e `checklist` (itens novos com os mesmos `text`/`done`)
- **AND** o cartão novo tem `cover: null` e nenhum `assignee`, independentemente do original
- **AND** o evento `card.created` é emitido para `board:{boardId}` com o cartão completo

#### Scenario: Membro copia um cartão para uma lista destino

- **WHEN** um membro autenticado envia `POST /boards/:boardId/cards/:id/copy` com
  `{toListId}` de uma lista do mesmo quadro
- **THEN** o cartão novo é criado ao final da lista destino, com os mesmos campos copiados do
  cenário anterior
- **AND** o evento `card.created` é emitido com o cartão completo

#### Scenario: Cópia com responsáveis explicitamente solicitada

- **WHEN** um membro autenticado envia `POST .../copy` com `{copyAssignees: true}`
- **THEN** o cartão novo recebe os mesmos `assignees` do cartão original
- **AND** sem `copyAssignees: true`, o cartão novo não recebe nenhum `assignee`

#### Scenario: Cópia nunca inclui comentários

- **WHEN** um cartão com comentários é copiado, com ou sem `copyAssignees`
- **THEN** o cartão novo não possui nenhum comentário associado

#### Scenario: Cópia para lista de outro quadro é rejeitada

- **WHEN** um membro autenticado envia `POST .../copy` com `toListId` pertencente a um quadro
  diferente do `boardId` da rota
- **THEN** a requisição é rejeitada e nenhum cartão é criado
- **AND** nenhum evento de tempo real é emitido

### Requirement: Capa do cartão restrita a cores

O sistema SHALL permitir que um membro do quadro defina ou limpe a capa (`cover`) de um cartão,
restrita a uma cor da mesma paleta usada por etiquetas, e MUST NOT aceitar imagem como capa
nesta change.

#### Scenario: Membro define a capa de um cartão

- **WHEN** um membro autenticado envia `PATCH /boards/:boardId/cards/:id/cover` com
  `{cover: "<cor da paleta>"}`
- **THEN** o `cover` do cartão é atualizado
- **AND** o evento `card.updated` é emitido para `board:{boardId}` com o cartão completo,
  incluindo o `cover` atualizado

#### Scenario: Membro limpa a capa de um cartão

- **WHEN** um membro autenticado envia `PATCH .../cover` com `{cover: null}` em um cartão que já
  tem capa definida
- **THEN** o `cover` do cartão passa a `null`
- **AND** o evento `card.updated` é emitido com o cartão completo refletindo `cover: null`

#### Scenario: Definir capa com cor fora da paleta é rejeitado

- **WHEN** um membro autenticado envia `PATCH .../cover` com `{cover: "<valor fora da paleta>"}`
- **THEN** a requisição é rejeitada e o `cover` do cartão não é alterado
- **AND** nenhum evento de tempo real é emitido

### Requirement: Atividade filtrada por cartão

O sistema SHALL permitir que um membro do quadro liste, paginado e do mais recente para o mais
antigo, somente as atividades relacionadas a um cartão específico daquele quadro.

#### Scenario: Membro lista a atividade de um cartão específico

- **WHEN** um membro autenticado envia `GET /boards/:boardId/cards/:cardId/activity?page=1`
- **THEN** a resposta contém somente as atividades cujo evento se refere àquele `cardId`,
  ordenadas do mais recente para o mais antigo, paginadas, com o total de atividades daquele
  cartão

#### Scenario: Atividade de um cartão não inclui eventos de outro cartão do mesmo quadro

- **WHEN** um quadro tem atividade registrada para dois cartões diferentes
- **AND** um membro autenticado consulta `GET .../cards/:cardId/activity` para um deles
- **THEN** a resposta não contém nenhuma atividade cujo evento se refira ao outro cartão

#### Scenario: Cartão de outro quadro é rejeitado

- **WHEN** um membro autenticado envia `GET /boards/:boardId/cards/:cardId/activity` em que
  `:cardId` não pertence ao `:boardId` da rota
- **THEN** a requisição é rejeitada

### Requirement: Autorização por membership do quadro nos três sub-recursos

O sistema SHALL restringir cópia de cartão, definição/limpeza de capa e listagem de atividade
por cartão a usuários autenticados que sejam membros (`BoardMember`) do quadro dono do cartão.

#### Scenario: Não-membro é bloqueado em qualquer sub-recurso desta change

- **WHEN** um usuário autenticado que não é `BoardMember` do quadro tenta copiar um cartão,
  definir/limpar sua capa, ou listar sua atividade
- **THEN** a requisição é rejeitada antes de qualquer alteração de dados ou leitura de atividade
- **AND** nenhum evento de tempo real é emitido nos casos de mutação (copiar/capa)

### Requirement: Emissão de eventos de tempo real após sucesso do caso de uso

O sistema SHALL emitir `card.created` ao copiar um cartão e `card.updated` ao definir/limpar sua
capa, sempre após o caso de uso correspondente ter sucesso, e MUST NOT emitir evento de tempo
real para a listagem de atividade por cartão (leitura pura).

#### Scenario: Nenhum evento é emitido em caso de erro

- **WHEN** uma requisição de cópia de cartão ou de definição de capa falha por qualquer motivo
  (autorização, validação, cross-board)
- **THEN** nenhum evento de tempo real é emitido para `board:{boardId}`

#### Scenario: Listagem de atividade não emite evento

- **WHEN** um membro autenticado consulta `GET .../cards/:cardId/activity`, com sucesso ou erro
- **THEN** nenhum evento de tempo real é emitido

### Requirement: Escopo restrito ao backend de copiar/capa/atividade do cartão

Esta mudança SHALL entregar apenas o backend de cópia de cartão, capa por cor e atividade
filtrada por cartão (domínio, casos de uso, persistência, endpoints, eventos de tempo real,
hidratação no card-response/board-detail), e MUST NOT criar a UI do detalhe do cartão, o menu de
Ações, o seletor de capa, a aba Atividade na tela, capa por imagem, ou qualquer recurso de
anexos.

#### Scenario: Nenhuma UI ou anexo é criado

- **WHEN** o backend desta change é entregue
- **THEN** nenhuma tela de detalhe do cartão, menu de Ações ou aba Atividade é criada (escopo
  da `033`)
- **AND** nenhum recurso de upload/anexo ou capa por imagem é criado (escopo da `032`)

