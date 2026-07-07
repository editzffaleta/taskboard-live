# detalhe-cartao Specification

## Purpose
TBD - created by archiving change 018-detalhe-cartao. Update Purpose after archive.
## Requirements
### Requirement: Abertura do modal de detalhe do cartão

O sistema SHALL permitir que um membro do quadro abra o modal de detalhe de um cartão clicando
no corpo do cartão no quadro ao vivo, exibindo os dados já carregados em memória, sem nova
requisição HTTP de cartão.

#### Scenario: Membro abre o modal de um cartão

- **WHEN** um membro autenticado clica no corpo de um cartão do quadro (fora do título em edição
  e dos botões de ação)
- **THEN** o modal de detalhe abre exibindo título, descrição, etiquetas, prazo, responsáveis e
  checklist atuais do cartão

#### Scenario: Modal fecha ao ser excluído por outro membro

- **WHEN** o cartão exibido no modal é excluído (localmente ou por outro membro, refletido via
  `card.deleted`) enquanto o modal está aberto
- **THEN** o modal fecha automaticamente, sem erro

#### Scenario: Membro fecha o modal

- **WHEN** um membro clica fora do modal ou pressiona `Esc`
- **THEN** o modal fecha e o quadro permanece no mesmo estado de antes da abertura

### Requirement: Edição de título e descrição no detalhe do cartão

O sistema SHALL permitir editar o título e a descrição do cartão a partir do modal de detalhe,
persistindo via o endpoint de edição de cartão já existente.

#### Scenario: Membro edita o título pelo modal

- **WHEN** um membro edita o título no modal e confirma (blur ou Enter)
- **THEN** o título é persistido
- **AND** o cartão no quadro e em qualquer outra sessão conectada reflete o novo título via
  `card.updated`

#### Scenario: Membro edita a descrição pelo modal

- **WHEN** um membro edita a descrição no modal e confirma (blur)
- **THEN** a descrição é persistida
- **AND** o cartão reflete a nova descrição via `card.updated` em qualquer sessão conectada

### Requirement: Gestão de etiquetas no detalhe do cartão

O sistema SHALL permitir, a partir do modal de detalhe, atribuir e remover etiquetas do cartão,
reaproveitando o popover e os endpoints de etiquetas já existentes.

#### Scenario: Membro atribui etiqueta a partir do modal

- **WHEN** um membro marca uma etiqueta do quadro no seletor de etiquetas do modal
- **THEN** a etiqueta é atribuída ao cartão
- **AND** o modal aberto reflete a etiqueta assim que o `card.updated` correspondente chega

#### Scenario: Membro remove etiqueta a partir do modal

- **WHEN** um membro desmarca uma etiqueta atribuída no seletor do modal
- **THEN** a etiqueta é removida do cartão
- **AND** o modal aberto reflete a remoção assim que o `card.updated` correspondente chega

### Requirement: Prazo do cartão no detalhe

O sistema SHALL permitir definir e limpar o prazo (`dueDate`) do cartão a partir do modal de
detalhe, exibindo um selo indicando se o prazo está atrasado, é hoje ou é futuro.

#### Scenario: Membro define um prazo

- **WHEN** um membro escolhe uma data no seletor de prazo do modal
- **THEN** o prazo é persistido via `PATCH /cards/:id/due`
- **AND** o cartão exibe o selo correspondente (atrasado, hoje ou futuro) conforme a data
  escolhida em relação à data atual

#### Scenario: Membro limpa o prazo

- **WHEN** um membro limpa o prazo definido no modal
- **THEN** o prazo é removido (`dueDate: null`)
- **AND** nenhum selo de prazo é exibido no cartão

#### Scenario: Selo de prazo classifica corretamente

- **WHEN** o cartão tem `dueDate` definido
- **THEN** o selo exibido é "atrasado" se a data civil do prazo for anterior à data civil atual,
  "hoje" se for a mesma data civil, e "futuro" (com a data) caso contrário

### Requirement: Responsáveis do cartão no detalhe

O sistema SHALL permitir adicionar e remover responsáveis (membros do quadro) do cartão a partir
do modal de detalhe.

#### Scenario: Membro adiciona um responsável

- **WHEN** um membro seleciona outro membro do quadro no seletor de responsáveis do modal
- **THEN** o responsável é atribuído ao cartão
- **AND** o cartão reflete o responsável assim que o `card.updated` correspondente chega (sem
  atualização otimista imediata)

#### Scenario: Membro remove um responsável

- **WHEN** um membro desmarca um responsável já atribuído no seletor do modal
- **THEN** o responsável é removido do cartão
- **AND** o cartão reflete a remoção assim que o `card.updated` correspondente chega

### Requirement: Checklist interativo no detalhe do cartão

O sistema SHALL permitir adicionar, marcar/desmarcar, editar, excluir e reordenar itens do
checklist a partir do modal de detalhe, exibindo uma barra de progresso `feitos/total`.

#### Scenario: Membro adiciona item ao checklist

- **WHEN** um membro digita um texto e confirma a adição de um item de checklist no modal
- **THEN** o item é adicionado ao final do checklist do cartão
- **AND** a barra de progresso do checklist é recalculada

#### Scenario: Membro marca/desmarca um item

- **WHEN** um membro marca ou desmarca o checkbox de um item do checklist no modal
- **THEN** o estado `done` do item é atualizado imediatamente na interface (otimista)
- **AND** persistido via o endpoint de toggle do checklist

#### Scenario: Membro edita o texto de um item

- **WHEN** um membro edita o texto de um item existente do checklist e confirma
- **THEN** o novo texto é persistido e refletido no modal

#### Scenario: Membro exclui um item

- **WHEN** um membro exclui um item do checklist
- **THEN** o item deixa de aparecer na lista
- **AND** a barra de progresso é recalculada sem o item excluído

#### Scenario: Membro reordena os itens

- **WHEN** um membro arrasta um item do checklist para uma nova posição
- **THEN** a nova ordem é persistida via o endpoint de reordenação
- **AND** a ordem exibida no modal reflete a posição escolhida

#### Scenario: Barra de progresso só aparece com itens

- **WHEN** o checklist do cartão não tem nenhum item
- **THEN** a barra de progresso não é exibida

### Requirement: Comentários no detalhe do cartão

O sistema SHALL permitir, na aba de comentários do modal de detalhe, listar comentários
paginados (mais recente primeiro), adicionar um novo comentário e excluir apenas comentários do
próprio autor.

#### Scenario: Membro abre a aba de comentários

- **WHEN** um membro abre a aba "Comentários" do modal
- **THEN** a primeira página de comentários do cartão é carregada, do mais recente para o mais
  antigo

#### Scenario: Membro carrega mais comentários

- **WHEN** um membro aciona "Carregar mais" na aba de comentários
- **THEN** a página seguinte de comentários é buscada e anexada à lista já carregada, sem
  duplicar itens

#### Scenario: Membro adiciona um comentário

- **WHEN** um membro escreve um texto e confirma um novo comentário
- **THEN** o comentário é persistido e aparece na lista
- **AND** qualquer outra sessão conectada ao quadro recebe o comentário via `comment.created`

#### Scenario: Autor exclui o próprio comentário

- **WHEN** o autor de um comentário aciona a exclusão desse comentário
- **THEN** o comentário é removido da lista
- **AND** qualquer outra sessão conectada recebe a remoção via `comment.deleted`

#### Scenario: Membro não vê opção de excluir comentário alheio

- **WHEN** um membro visualiza um comentário cujo autor não é o usuário atual
- **THEN** nenhum controle de exclusão é exibido para esse comentário

### Requirement: Reflexo ao vivo do cartão aberto no modal

O sistema SHALL atualizar o modal de detalhe aberto em tempo real quando outro membro do quadro
altera o mesmo cartão, sem exigir fechar e reabrir o modal.

#### Scenario: Mudança de outro membro reflete no modal aberto

- **WHEN** o modal de detalhe de um cartão está aberto e outro membro altera título, descrição,
  etiquetas, prazo, responsáveis ou checklist desse mesmo cartão
- **THEN** o modal aberto reflete a mudança assim que o evento `card.updated` correspondente
  chega, sem necessidade de fechar e reabrir

### Requirement: Badges do cartão no quadro a partir de dados reais

O sistema SHALL exibir, em cada cartão do quadro kanban, selos de prazo, avatares de
responsáveis, progresso do checklist e contador de comentários, cada um exibido apenas quando o
respectivo dado existir para aquele cartão — nunca um valor inventado ou um placeholder vazio.

#### Scenario: Cartão sem dados extras não exibe badges

- **WHEN** um cartão não tem prazo, responsáveis, itens de checklist nem comentários observados
  nesta sessão
- **THEN** nenhuma badge de prazo, responsáveis, checklist ou comentários é exibida nesse cartão

#### Scenario: Cartão com prazo exibe o selo correspondente

- **WHEN** um cartão tem `dueDate` definido
- **THEN** o cartão exibe o selo de prazo (atrasado, hoje ou futuro) correspondente

#### Scenario: Cartão com responsáveis exibe avatares

- **WHEN** um cartão tem um ou mais responsáveis atribuídos
- **THEN** o cartão exibe um avatar de iniciais por responsável

#### Scenario: Cartão com checklist exibe progresso

- **WHEN** um cartão tem um ou mais itens de checklist
- **THEN** o cartão exibe o progresso no formato "feitos/total"

#### Scenario: Cartão com comentários observados exibe contador

- **WHEN** o quadro registra ao menos um evento de comentário (`comment.created`) para um
  cartão nesta sessão, ou a aba de comentários desse cartão já foi aberta ao menos uma vez
- **THEN** o cartão exibe o contador de comentários correspondente

### Requirement: Escopo restrito ao consumo frontend, sem alteração de backend

Esta mudança SHALL consumir exclusivamente os endpoints e eventos já definidos por `016`/`017`
e MUST NOT introduzir endpoint, caso de uso, migration ou model novo no backend, nem construir
filtros/visões (`019`) ou a tela de "Configurações do Quadro" (`020`).

#### Scenario: Nenhum endpoint novo é criado

- **WHEN** o modal de detalhe do cartão é entregue
- **THEN** nenhum endpoint, caso de uso ou migration novos são adicionados ao backend
- **AND** nenhuma tela de filtros/visões ou de "Configurações do Quadro" é criada

