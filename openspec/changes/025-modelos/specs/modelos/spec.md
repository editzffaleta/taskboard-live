## ADDED Requirements

### Requirement: Catalogo estatico de modelos de quadro

O sistema SHALL prover um catálogo estático (em código, sem tabela no banco) de modelos de quadro,
cada um com `id` estável, `name`, `description`, `category`, `color` e uma lista de listas com
cartões de exemplo, contendo ao menos os modelos Scrum (Engenharia), Roadmap (Produto), CRM
(Vendas), Editorial (Marketing), Pessoal e Bugs (Engenharia).

#### Scenario: Catálogo com ids únicos e listas com cartões

- **WHEN** o catálogo `BOARD_TEMPLATES` é carregado
- **THEN** todo `id` de modelo é único
- **AND** toda lista de todo modelo possui ao menos um cartão de exemplo

### Requirement: Listagem de modelos

O backend SHALL expor `GET /board-templates`, autenticado, retornando o catálogo de modelos com a
prévia das colunas (sem os cartões de exemplo).

#### Scenario: Listar modelos disponíveis

- **WHEN** uma requisição `GET /board-templates` é enviada por um usuário autenticado
- **THEN** a resposta `200` contém os modelos do catálogo, cada um com `id`, `name`, `description`,
  `category`, `color` e `lists[].title`

#### Scenario: Requisição sem autenticação

- **WHEN** uma requisição `GET /board-templates` é enviada sem token válido
- **THEN** a resposta é `401`

### Requirement: Criacao de quadro a partir de modelo

O sistema SHALL prover o caso de uso `create-board-from-template` e o endpoint
`POST /boards/from-template`, que criam um `Board` real e populado (com `BoardMember` owner, todas
as `List`s e todos os `Card`s de exemplo do modelo escolhido) de forma atômica.

#### Scenario: Criação a partir de um modelo válido

- **WHEN** o caso de uso `create-board-from-template` é executado com `{ templateId, ownerId }`
  referenciando um modelo existente
- **THEN** um `Board` é criado e persistido
- **AND** na mesma operação atômica um `BoardMember` com `role = 'owner'` é criado para `ownerId`
- **AND** todas as `List`s do modelo são criadas com a posição sequencial correspondente
- **AND** todos os `Card`s de exemplo de cada lista do modelo são criados com a posição sequencial
  correspondente

#### Scenario: Nome customizado ou padrão do modelo

- **WHEN** `create-board-from-template` é executado sem `name`
- **THEN** o `Board` criado usa o `name` do próprio modelo como nome padrão
- **AND** quando `name` é informado, o `Board` criado usa o nome informado

#### Scenario: Atomicidade da criação em lote

- **WHEN** ocorre uma falha durante a criação de qualquer lista ou cartão do modelo
- **THEN** nenhum registro (board, membership, lists, cards) é persistido — a operação é revertida
  por inteiro

#### Scenario: Modelo inexistente

- **WHEN** `create-board-from-template` é executado com um `templateId` que não existe no catálogo
- **THEN** a operação é rejeitada com erro `boardTemplate.not.found` (404)

#### Scenario: Endpoint autenticado retorna o quadro populado

- **WHEN** uma requisição `POST /boards/from-template` válida é enviada por um usuário autenticado
- **THEN** a resposta `201` contém o quadro criado com as listas e os cartões de exemplo já
  aninhados, no mesmo formato de `GET /boards/:id`

### Requirement: Galeria de modelos no frontend

O frontend SHALL prover, em `/templates`, uma galeria de modelos reproduzindo o mockup
`Modelos.dc.html`, com filtro por categoria e criação de quadro a partir de um modelo escolhido.

#### Scenario: Listagem e filtro de modelos

- **WHEN** o usuário autenticado acessa `/templates`
- **THEN** os modelos do catálogo são listados como cards, com nome, descrição e prévia das
  colunas
- **AND** o usuário pode filtrar os modelos por categoria sem nova requisição ao backend

#### Scenario: Uso de um modelo cria e navega para o quadro

- **WHEN** o usuário clica em "Usar modelo" em um card de modelo
- **THEN** um novo quadro é criado a partir daquele modelo, já com colunas e cartões de exemplo
- **AND** o usuário é navegado para `/boards/[id]` do quadro recém-criado

#### Scenario: Item de navegação para a galeria

- **WHEN** o usuário autenticado vê a navegação lateral
- **THEN** existe um item "Modelos" apontando para `/templates`
