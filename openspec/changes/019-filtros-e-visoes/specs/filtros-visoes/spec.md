## ADDED Requirements

### Requirement: Filtro por etiqueta

O sistema SHALL permitir filtrar os cartões do quadro por uma ou mais etiquetas, exibindo
apenas (ou destacando apenas) os cartões que tenham ao menos uma das etiquetas selecionadas.

#### Scenario: Membro filtra por uma etiqueta

- **WHEN** um membro seleciona uma etiqueta do quadro no filtro
- **THEN** somente cartões que possuem essa etiqueta permanecem totalmente visíveis; os demais
  são atenuados sem desaparecer das colunas

#### Scenario: Membro filtra por múltiplas etiquetas

- **WHEN** um membro seleciona mais de uma etiqueta no filtro
- **THEN** cartões que tenham ao menos uma das etiquetas selecionadas permanecem totalmente
  visíveis (OU lógico entre etiquetas selecionadas)

### Requirement: Filtro por responsável

O sistema SHALL permitir filtrar os cartões do quadro por um ou mais responsáveis (membros do
quadro), exibindo apenas (ou destacando apenas) os cartões atribuídos a algum deles.

#### Scenario: Membro filtra por um responsável

- **WHEN** um membro seleciona um responsável no filtro
- **THEN** somente cartões atribuídos a esse responsável permanecem totalmente visíveis

#### Scenario: Membro filtra por múltiplos responsáveis

- **WHEN** um membro seleciona mais de um responsável no filtro
- **THEN** cartões atribuídos a ao menos um dos responsáveis selecionados permanecem totalmente
  visíveis (OU lógico entre responsáveis selecionados)

### Requirement: Filtro por prazo

O sistema SHALL permitir filtrar os cartões do quadro por situação de prazo: atrasado, hoje,
próximos 7 dias ou sem prazo.

#### Scenario: Membro filtra por "atrasado"

- **WHEN** um membro seleciona a opção "atrasado" no filtro de prazo
- **THEN** somente cartões cujo prazo é anterior à data civil atual permanecem totalmente
  visíveis

#### Scenario: Membro filtra por "hoje"

- **WHEN** um membro seleciona a opção "hoje" no filtro de prazo
- **THEN** somente cartões cujo prazo é a data civil atual permanecem totalmente visíveis

#### Scenario: Membro filtra por "próximos 7 dias"

- **WHEN** um membro seleciona a opção "próximos 7 dias" no filtro de prazo
- **THEN** somente cartões cujo prazo está entre 1 e 7 dias civis a partir de hoje permanecem
  totalmente visíveis

#### Scenario: Membro filtra por "sem prazo"

- **WHEN** um membro seleciona a opção "sem prazo" no filtro de prazo
- **THEN** somente cartões sem `dueDate` definido permanecem totalmente visíveis

#### Scenario: Membro combina mais de uma opção de prazo

- **WHEN** um membro seleciona mais de uma opção de prazo (ex.: "atrasado" e "hoje")
- **THEN** cartões que satisfazem qualquer uma das opções selecionadas permanecem totalmente
  visíveis (OU lógico entre opções de prazo)

### Requirement: Busca textual por título

O sistema SHALL permitir buscar cartões do quadro por texto livre, comparando o título de forma
insensível a maiúsculas/minúsculas e a diacríticos.

#### Scenario: Membro busca por um termo presente no título

- **WHEN** um membro digita um termo que está contido no título de um cartão (ignorando
  maiúsculas/minúsculas e acentos)
- **THEN** esse cartão permanece totalmente visível

#### Scenario: Membro busca por um termo ausente

- **WHEN** um membro digita um termo que não está contido no título de nenhum cartão
- **THEN** todos os cartões do quadro são atenuados

### Requirement: Combinação de filtros

O sistema SHALL combinar filtros de categorias diferentes (etiqueta, responsável, prazo, busca)
com E lógico entre categorias, mantendo OU lógico dentro de uma mesma categoria.

#### Scenario: Membro combina etiqueta e responsável

- **WHEN** um membro seleciona uma etiqueta e um responsável simultaneamente
- **THEN** somente cartões que têm a etiqueta selecionada E o responsável selecionado
  permanecem totalmente visíveis

#### Scenario: Contador de filtros ativos

- **WHEN** um ou mais filtros de qualquer categoria estão ativos
- **THEN** a barra de filtros exibe um contador com a quantidade de categorias de filtro ativas

#### Scenario: Membro limpa todos os filtros

- **WHEN** um membro aciona "Limpar filtros" com ao menos um filtro ativo
- **THEN** todas as categorias de filtro voltam ao estado vazio
- **AND** todos os cartões do quadro voltam a ficar totalmente visíveis

### Requirement: Filtragem preserva a estrutura de colunas

O sistema SHALL manter todas as colunas do quadro visíveis durante a filtragem, mesmo quando uma
coluna não tem nenhum cartão que satisfaça o filtro ativo.

#### Scenario: Coluna sem cartões correspondentes ao filtro permanece visível

- **WHEN** um filtro está ativo e nenhum cartão de uma coluna específica o satisfaz
- **THEN** essa coluna continua exibida no quadro, vazia de cartões destacados

### Requirement: Visão Kanban (padrão)

O sistema SHALL exibir, por padrão, a visão Kanban já existente do quadro, respeitando os
filtros ativos.

#### Scenario: Visão Kanban sem filtro ativo

- **WHEN** nenhum filtro está ativo e a visão Kanban está selecionada
- **THEN** todos os cartões aparecem normalmente, sem atenuação, organizados nas colunas do
  quadro

### Requirement: Visão Lista

O sistema SHALL oferecer uma visão em formato de lista/tabela, agrupando os cartões visíveis por
lista de origem, exibindo cartão, lista, responsáveis, etiquetas e prazo.

#### Scenario: Membro alterna para a visão Lista

- **WHEN** um membro seleciona a visão "Lista" no seletor de visão
- **THEN** os cartões que satisfazem o filtro ativo são exibidos em formato de tabela, cada linha
  mostrando cartão, lista de origem, responsáveis, etiquetas e prazo

#### Scenario: Membro abre um cartão a partir da visão Lista

- **WHEN** um membro clica em uma linha da visão Lista
- **THEN** o modal de detalhe do cartão correspondente é aberto

### Requirement: Visão Calendário

O sistema SHALL oferecer uma visão em formato de calendário mensal, posicionando cartões com
prazo definido no dia correspondente e agrupando cartões sem prazo em uma área separada.

#### Scenario: Membro alterna para a visão Calendário

- **WHEN** um membro seleciona a visão "Calendário" no seletor de visão
- **THEN** cartões visíveis com `dueDate` definido aparecem no dia correspondente do mês exibido

#### Scenario: Cartões sem prazo aparecem separadamente no Calendário

- **WHEN** a visão Calendário está ativa e existem cartões visíveis sem `dueDate`
- **THEN** esses cartões aparecem em uma área dedicada de "sem prazo", fora do grid de dias

#### Scenario: Membro navega entre meses

- **WHEN** um membro aciona a navegação de mês anterior/seguinte na visão Calendário
- **THEN** o grid passa a exibir os cartões com prazo no mês selecionado

#### Scenario: Membro abre um cartão a partir da visão Calendário

- **WHEN** um membro clica em um cartão exibido no grid ou na área de "sem prazo"
- **THEN** o modal de detalhe do cartão correspondente é aberto

### Requirement: Visões respeitam os filtros ativos

O sistema SHALL aplicar os mesmos filtros ativos independentemente da visão selecionada
(Kanban, Lista ou Calendário).

#### Scenario: Filtro aplicado permanece ao trocar de visão

- **WHEN** um filtro está ativo e um membro troca de visão (Kanban para Lista, Lista para
  Calendário, ou qualquer combinação)
- **THEN** a nova visão exibe apenas os cartões que satisfazem o mesmo filtro que estava ativo
  antes da troca

### Requirement: Persistência de filtro e visão por quadro

O sistema SHALL persistir a visão selecionada e os filtros ativos por quadro, restaurando-os
quando o mesmo quadro é reaberto na mesma sessão de navegador.

#### Scenario: Preferência restaurada ao reabrir o mesmo quadro

- **WHEN** um membro define uma visão e/ou filtros num quadro, fecha e reabre esse mesmo quadro
  no mesmo navegador
- **THEN** a visão e os filtros definidos anteriormente são restaurados automaticamente

#### Scenario: Preferência não vaza entre quadros diferentes

- **WHEN** um membro define uma visão e/ou filtros num quadro e em seguida abre um quadro
  diferente
- **THEN** o quadro diferente não herda a visão nem os filtros definidos no primeiro quadro

### Requirement: Reflexo ao vivo sob filtro e visão ativos

O sistema SHALL refletir, em tempo real, mudanças de cartões (criação, edição, movimentação,
exclusão) feitas por outros membros do quadro, respeitando o filtro e a visão correntes, sem
recarregar a página.

#### Scenario: Cartão alterado por outro membro passa a satisfazer o filtro ativo

- **WHEN** um filtro está ativo e outro membro altera um cartão (ex.: adiciona uma etiqueta ou
  define um responsável) de forma que ele passa a satisfazer o filtro
- **THEN** esse cartão aparece totalmente visível na visão corrente, sem necessidade de recarregar
  a página

#### Scenario: Cartão criado por outro membro aparece na visão corrente

- **WHEN** outro membro cria um cartão que satisfaz o filtro ativo
- **THEN** o cartão aparece automaticamente na visão corrente (Kanban, Lista ou Calendário)

### Requirement: Escopo restrito ao consumo frontend, sem alteração de backend

Esta mudança SHALL consumir exclusivamente os dados já expostos por `016`/`017`/`018` no
`BoardState` do frontend e MUST NOT introduzir endpoint, caso de uso, migration ou campo novo no
payload de cartão/quadro no backend.

#### Scenario: Nenhum endpoint novo é criado

- **WHEN** a barra de filtros e o seletor de visões são entregues
- **THEN** nenhum endpoint, caso de uso ou migration novos são adicionados ao backend
- **AND** nenhum campo novo é adicionado ao payload de `GET /boards/:id` ou aos eventos de
  `card.*` além dos já existentes desde `018`
