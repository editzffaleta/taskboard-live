## ADDED Requirements

### Requirement: Busca global escopada ao usuário

O sistema SHALL prover um endpoint de busca agregado que retorna, para o usuário autenticado,
apenas quadros e cartões pertencentes a quadros de que ele é membro, excluindo itens arquivados.

#### Scenario: Busca retorna quadros do usuário que casam com a consulta

- **WHEN** um usuário autenticado envia `GET /search?q=sprint`
- **THEN** a resposta inclui, em `boards`, os quadros de que o usuário é membro cujo `name`
  contém "sprint" (case-insensitive)
- **AND** não inclui quadros de que o usuário não é membro, mesmo que o nome também case

#### Scenario: Busca retorna cartões dentro dos quadros do usuário

- **WHEN** um usuário autenticado envia `GET /search?q=presença`
- **THEN** a resposta inclui, em `cards`, os cartões (não arquivados) cujo `title` ou
  `description` contém "presença" (case-insensitive), dentro de quadros de que o usuário é
  membro
- **AND** cada item de `cards` traz `boardId`, `boardName` e `listTitle` suficientes para exibir
  o contexto do resultado
- **AND** não inclui cartões de quadros de que o usuário não é membro

#### Scenario: Itens arquivados não aparecem na busca

- **WHEN** um cartão ou quadro que casaria com a consulta está com `archivedAt` preenchido
- **THEN** ele **não** aparece nos resultados de `GET /search`

#### Scenario: Consulta vazia ou muito curta não dispara busca no banco

- **WHEN** `q` está ausente, vazio após `trim()`, ou tem menos de 2 caracteres
- **THEN** a resposta é `{ boards: [], cards: [] }`, sem executar consulta de busca no banco

#### Scenario: Resultados são limitados por grupo

- **WHEN** uma consulta casa com mais de 20 quadros ou mais de 20 cartões elegíveis
- **THEN** a resposta traz no máximo 20 itens em `boards` e no máximo 20 itens em `cards`

### Requirement: Tela de busca global agrupa e navega para o resultado

O sistema SHALL prover uma tela de busca (`/search`) que exibe os resultados de
`GET /search` agrupados por tipo (Quadros/Cartões) e permite navegar diretamente ao quadro ou ao
cartão selecionado.

#### Scenario: Usuário busca e vê resultados agrupados

- **WHEN** um usuário autenticado digita uma consulta na tela de busca
- **THEN** os resultados são exibidos em duas seções, "Quadros" e "Cartões", cada uma mostrando
  os itens retornados pelo endpoint com o contexto (nome do quadro/lista para cartões)

#### Scenario: Selecionar um quadro nos resultados navega até ele

- **WHEN** o usuário clica em um resultado de quadro
- **THEN** a navegação leva à página do quadro correspondente (`/boards/{boardId}`)

#### Scenario: Selecionar um cartão nos resultados abre seu detalhe

- **WHEN** o usuário clica em um resultado de cartão
- **THEN** a navegação leva ao quadro correspondente com o modal de detalhe do cartão já aberto

### Requirement: Command palette (⌘K) acessível de qualquer tela privada

O sistema SHALL prover um command palette acionável pelo atalho `Cmd+K`/`Ctrl+K` a partir de
qualquer rota autenticada, que realiza a mesma busca com debounce e permite navegar direto ao
resultado escolhido.

#### Scenario: Atalho abre o command palette em qualquer rota privada

- **WHEN** o usuário pressiona `Cmd+K` (ou `Ctrl+K`) estando em qualquer rota autenticada do
  aplicativo
- **THEN** o modal de busca rápida abre em primeiro plano, com o campo de busca focado

#### Scenario: Digitação no command palette usa debounce

- **WHEN** o usuário digita no campo do command palette
- **THEN** a chamada a `GET /search` só é disparada após uma pausa de digitação (debounce),
  não a cada tecla pressionada

#### Scenario: Selecionar um resultado no command palette fecha o modal e navega

- **WHEN** o usuário seleciona um resultado (quadro ou cartão) no command palette
- **THEN** o modal fecha
- **AND** a navegação ocorre para o mesmo destino da tela `/search` (quadro ou cartão)

#### Scenario: Esc fecha o command palette sem navegar

- **WHEN** o usuário pressiona `Esc` com o command palette aberto
- **THEN** o modal fecha sem executar nenhuma navegação
