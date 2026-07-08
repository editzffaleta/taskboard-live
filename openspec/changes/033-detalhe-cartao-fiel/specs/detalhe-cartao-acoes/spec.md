## ADDED Requirements

### Requirement: Barra lateral direita com seção "Adicionar ao cartão"

O sistema SHALL exibir, na barra lateral direita do detalhe do cartão, uma seção "Adicionar ao
cartão" com os atalhos Checklist, Anexo e Capa, fiéis ao mockup.

#### Scenario: Atalho de Checklist foca o campo de novo item

- **WHEN** um usuário abre o detalhe de um cartão e clica no atalho "Checklist" da seção
  "Adicionar ao cartão"
- **THEN** a seção de checklist na coluna principal recebe foco no campo de adicionar novo item

#### Scenario: Atalho de Anexo abre o seletor de arquivo

- **WHEN** um usuário clica no atalho "Anexo" da seção "Adicionar ao cartão"
- **THEN** o seletor de arquivo nativo já usado pela seção de Anexos é aberto

#### Scenario: Atalho de Capa abre o seletor de cor

- **WHEN** um usuário clica no atalho "Capa" da seção "Adicionar ao cartão"
- **THEN** um seletor com as cores da paleta de etiquetas e uma opção para remover a capa é
  exibido

### Requirement: Definir e limpar a capa do cartão pela UI

O sistema SHALL permitir que um usuário defina uma cor de capa para o cartão a partir do
seletor de cor, ou remova a capa já definida, refletindo o resultado no cartão aberto e no
cartão correspondente no quadro.

#### Scenario: Usuário define uma capa

- **WHEN** um usuário seleciona uma cor no seletor de capa do cartão aberto
- **THEN** o cartão passa a exibir uma faixa de cor no topo do modal de detalhe
- **AND** o cartão correspondente no quadro passa a exibir a mesma faixa de cor

#### Scenario: Usuário remove a capa

- **WHEN** um usuário seleciona a opção de remover a capa em um cartão que já tem cor definida
- **THEN** a faixa de cor deixa de ser exibida no modal e no cartão do quadro

### Requirement: Barra lateral direita com seção "Ações" (Mover/Copiar/Arquivar)

O sistema SHALL exibir, na barra lateral direita do detalhe do cartão, uma seção "Ações" com
Mover, Copiar e Arquivar, fiéis ao mockup.

#### Scenario: Mover o cartão para outra lista pelo detalhe

- **WHEN** um usuário abre o diálogo de "Mover" a partir do detalhe do cartão e escolhe uma
  lista destino do mesmo quadro
- **THEN** o cartão passa a pertencer à lista escolhida, refletido no quadro para todos os
  usuários conectados

#### Scenario: Copiar o cartão pelo detalhe

- **WHEN** um usuário clica em "Copiar" no detalhe do cartão
- **THEN** um novo cartão, cópia do original, aparece na lista de destino do quadro para todos
  os usuários conectados
- **AND** o modal de detalhe do cartão original é fechado

#### Scenario: Arquivar o cartão pela nova seção "Ações"

- **WHEN** um usuário clica em "Arquivar" na seção "Ações" do detalhe do cartão
- **THEN** o cartão é removido do quadro, com o mesmo comportamento já existente de
  arquivamento

### Requirement: Aba "Atividade" do cartão

O sistema SHALL exibir, na coluna principal do detalhe do cartão, uma aba "Atividade" ao lado
da aba "Comentários", listando o histórico de eventos daquele cartão específico, paginado e do
mais recente para o mais antigo.

#### Scenario: Usuário abre a aba Atividade de um cartão com histórico

- **WHEN** um usuário abre a aba "Atividade" de um cartão que já teve eventos registrados
  (criação, edição, movimentação, etc.)
- **THEN** a lista exibe cada evento com um texto legível e o tempo relativo desde sua
  ocorrência, do mais recente para o mais antigo

#### Scenario: Usuário carrega mais atividade paginada

- **WHEN** a aba "Atividade" exibe menos itens do que o total disponível
- **THEN** um controle de "carregar mais" permite buscar a próxima página, adicionando os itens
  sem duplicar os já exibidos

#### Scenario: Aba Atividade de um cartão sem histórico

- **WHEN** um usuário abre a aba "Atividade" de um cartão sem nenhum evento registrado
- **THEN** uma mensagem de estado vazio é exibida no lugar da lista

### Requirement: Layout fiel ao mockup — duas colunas

O detalhe do cartão SHALL ser organizado em duas colunas conforme o mockup: coluna principal à
esquerda (capa, título, descrição, etiquetas, checklist, anexos, abas Comentários/Atividade) e
barra lateral à direita (Responsáveis, Data de entrega, "Adicionar ao cartão", "Ações").

#### Scenario: Layout de duas colunas preserva as seções já existentes

- **WHEN** um usuário abre o detalhe de qualquer cartão
- **THEN** todas as seções já existentes antes desta change (título, descrição, etiquetas,
  checklist, anexos, comentários, responsáveis, prazo) continuam presentes e funcionais, apenas
  reorganizadas conforme o layout de duas colunas

### Requirement: Escopo restrito à montagem de UI, sem novo backend

Esta mudança SHALL entregar apenas a montagem de UI (barra lateral, abas, capa) consumindo
endpoints já existentes de mover, arquivar, copiar, capa e atividade por cartão, e MUST NOT
criar nenhum endpoint, caso de uso, migration ou evento de tempo real novo.

#### Scenario: Nenhum backend novo é criado

- **WHEN** esta change é entregue
- **THEN** nenhum endpoint, caso de uso, migration ou evento de tempo real novo é adicionado ao
  backend
- **AND** todas as ações da UI (Mover/Copiar/Arquivar/Capa/Atividade) consomem endpoints já
  existentes antes desta change
