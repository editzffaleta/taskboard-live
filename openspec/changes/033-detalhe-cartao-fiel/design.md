## Design — 033-detalhe-cartao-fiel

## Contexto

O detalhe do cartão (`018`) já entrega `card-detail-modal.component.tsx` com título, descrição,
etiquetas, checklist, anexos (`032`), responsáveis e prazo na barra lateral, aba Comentários,
e o botão "Arquivar cartão" solto no rodapé da barra lateral (`022`). O backend de copiar/capa/
atividade por cartão foi entregue **inteiro** pela `031` (endpoints, eventos de tempo real,
payload de `cover`). Esta change é **só frontend**: reorganiza o layout existente para o formato
de duas colunas do mockup e monta as três peças que faltam (Ações, Adicionar ao cartão,
Atividade), sem criar nenhum endpoint novo.

## Localização no código

```
apps/frontend/src/modules/boards/
  api/
    boards.api.ts                          <- ajustado: CardDto/BoardDetailCard ganham cover
    card-detail.api.ts                     <- ajustado: copyCard, setCardCover, listCardActivity
  types/
    board-state.type.ts                    <- ajustado: CardState ganha cover
  util/
    board-state.reducer.ts                 <- ajustado: toCardState hidrata cover
  components/
    card-detail-modal.component.tsx        <- ajustado: layout de duas colunas, monta as peças novas
    card-detail-actions.component.tsx       <- novo: seção "Ações" (Mover/Copiar/Arquivar)
    card-detail-move-dialog.component.tsx   <- novo: diálogo de lista destino (Mover)
    card-detail-add-to-card.component.tsx   <- novo: seção "Adicionar ao cartão"
    card-detail-cover-picker.component.tsx  <- novo: popover de cor da capa
    card-detail-cover-banner.component.tsx  <- novo: faixa de capa no topo do modal
    card-detail-activity.component.tsx      <- novo: aba "Atividade" do cartão
    kanban-card.component.tsx               <- ajustado: exibe a faixa de capa no cartão do quadro
    board-view.component.tsx                <- ajustado: handlers copiar/capa/mover-do-modal, passa board.lists
  shared/i18n/
    messages.pt.ts / messages.en.ts         <- ajustado: chaves novas (Ações, Adicionar ao cartão,
                                                Mover, Copiar, Capa, Atividade, Nenhuma)
```

## Layout de duas colunas (mockup)

O `DialogContent` já usa `flex md:flex-row` com duas divs — a principal (`flex-1`) e a lateral
(`md:w-60`). Mantém-se essa estrutura; ajustes:

1. **Faixa de capa** (`card-detail-cover-banner.component.tsx`): renderizada no topo da coluna
   principal, **acima** do título, quando `card.cover !== null` — uma barra de altura fixa
   (~40px) na cor da paleta (`LABEL_COLORS`), mesmo mapeamento de cor usado por `LabelChip`.
   `null` não renderiza nada (sem espaço reservado).
2. **Barra lateral direita**, na ordem do mockup: Responsáveis → Etiquetas (mockup mostra as
   duas seções na lateral; decisão: mantém Etiquetas na coluna principal como já está hoje —
   ver "Divergência aceita" abaixo) → Data de entrega → "Adicionar ao cartão" → "Ações".
3. Remove o botão solto "Arquivar cartão" do rodapé da lateral; ele passa a viver dentro de
   `CardDetailActions`, seção "Ações", junto de Mover/Copiar.

### Divergência aceita (registrada, não é erro de fidelidade)

O mockup mostra Etiquetas na barra lateral; a implementação atual (`018`) já tem Etiquetas na
coluna principal, logo abaixo da descrição, por causa do `LabelPopover` (que precisa de mais
largura para o color picker). Mover Etiquetas para a lateral de 240px comprimiria demais o
popover. Decisão: manter Etiquetas na coluna principal (já fiel ao mockup em conteúdo/textos),
e mover apenas Responsáveis/Prazo/Adicionar ao cartão/Ações para a lateral — que é exatamente
onde já estão hoje (Responsáveis/Prazo) mais as duas seções novas.

## Seção "Adicionar ao cartão" (`card-detail-add-to-card.component.tsx`)

Três botões, na ordem do mockup:

- **Checklist**: se `card.checklist.length === 0`, rola a coluna principal até a seção de
  checklist e foca o campo de "adicionar item" (usa `ref`/`scrollIntoView` + `focus()`); se já
  houver itens, mesmo comportamento (a seção já é visível, o botão só garante foco no campo de
  novo item). Não cria nenhum estado novo de checklist — delega ao componente existente
  (`CardDetailChecklist`, `017`).
- **Anexo**: abre o seletor de arquivo do componente `CardDetailAttachments` (`032`) — expõe um
  `ref`/callback (`onRequestAttach`) que dispara o mesmo `<input type="file">` que o botão interno
  de `CardDetailAttachments` já usa, evitando duplicar lógica de upload.
- **Capa**: abre `CardDetailCoverPicker` (popover com as 7 cores de `LABEL_COLORS` + opção
  "Nenhuma"), chamando `onSetCardCover(card.id, color | null)` →
  `PATCH /boards/:boardId/cards/:id/cover` (`031`, já existe). Otimista: atualiza `card.cover` no
  estado local antes da resposta (mesmo padrão de `handleToggleLabel`), reverte com
  `revertToSnapshot` em erro (mesmo padrão de `handleArchiveCard`).

## Seção "Ações" (`card-detail-actions.component.tsx`)

Três botões, na ordem do mockup:

- **Mover**: abre `CardDetailMoveDialog`, um `Dialog` simples com um `<select>`/lista das listas
  do quadro (`board.lists`, já disponível em `board-view.component.tsx` — passado como prop nova
  `boardLists: { id: string; title: string }[]` ao `CardDetailModal`), excluindo a lista atual do
  cartão da UI só visualmente (selecioná-la de novo é um no-op tolerado, não precisa bloquear).
  Confirmar chama `onMoveCard(card.id, toListId, position)` → `PATCH .../move` (`008`, já existe
  em `boards.api.ts` como `moveCard`); `position` calculado como fim da lista destino (mesmo
  padrão do drag-and-drop: `destinationList.cards.length`). Fecha o diálogo e o modal principal
  permanece aberto, refletindo a nova lista via `card.moved`/`applyCardMoved` já tratado pelo
  reducer.
- **Copiar**: chama `onCopyCard(card.id)` → `POST /boards/:boardId/cards/:id/copy` (sem
  `toListId`, copia na mesma lista, sem `copyAssignees` — mesmo padrão default do backend,
  `031`); fecha o modal do cartão original após a chamada ter sucesso (o cartão novo aparece no
  quadro via `card.created`, já tratado por `applyCardCreated` no reducer — o usuário vê a cópia
  aparecer na lista ao vivo, sem precisar abrir um segundo modal). Erro: mantém o modal aberto e
  mostra toast (mesmo padrão de outros handlers).
- **Arquivar**: reaproveita `onArchiveCard` já existente e passado ao `CardDetailModal` — apenas
  reposicionado nesta seção (remove do rodapé da lateral, sem alterar o handler em
  `board-view.component.tsx`).

## Aba "Atividade" (`card-detail-activity.component.tsx`)

Nova `TabsTrigger`/`TabsContent` ao lado de "Comentários" na coluna principal (mesma
`Tabs`/`TabsList` já existente). Ao ativar a aba pela primeira vez, chama
`listCardActivity(token, boardId, cardId, page=1)` → `GET .../cards/:cardId/activity` (`031`, já
existe); renderiza cada item com `formatActivityLabel(activity, members)` e
`formatRelativeTime(activity.createdAt, locale)`, reaproveitando `util/activity-label.util.ts`
(`011`) — mesmo padrão do painel de atividade do quadro. Botão "Carregar mais" ao final da
página quando `items.length < total`, incrementando `page`. Sem tempo real dedicado nesta change
(a `031` decidiu que a leitura de atividade é pura); ao fechar e reabrir o modal, a aba recarrega
do zero (sem cache entre aberturas — consistente com o padrão de `CardDetailComments`, que também
recarrega ao abrir).

## Exibição da capa

- `CardDto`/`BoardDetailCard` (`boards.api.ts`) e `CardState` (`board-state.type.ts`) ganham
  `cover: LabelColor | null`, espelhando o que o backend da `031` já retorna em
  `buildCardResponse`/`GetBoardDetail`. `board-state.reducer.ts` (`toCardState`) passa a
  hidratar `cover` a partir do payload de `card.created`/`card.updated`/`card.moved` (o payload
  de `card` já inclui `cover` desde a `031` — só falta o frontend ler o campo).
- `kanban-card.component.tsx` exibe uma faixa fina de cor no topo do cartão quando `card.cover`
  não for `null` — mesma paleta de cor de `LabelChip`, sem texto, decorativa; não altera a
  altura/scroll da lista (faixa dentro do cartão, não acima dele).

## Estado local do modal (novos handlers em `board-view.component.tsx`)

- `handleSetCardCover(cardId, cover)`: otimista, `PATCH .../cover`, revert em erro.
- `handleCopyCard(cardId)`: `POST .../copy`, fecha o modal (`setSelectedCardId(null)`) só após a
  chamada ter sucesso; toast de erro sem fechar em falha.
- `handleMoveCardFromModal(cardId, toListId, position)`: reaproveita a mesma função `moveCard`
  já usada pelo drag-and-drop (`boards.api.ts`), sem duplicar lógica — só chamada a partir do
  diálogo em vez do `onDragEnd`.
- `CardDetailModal` ganha as novas props `boardLists`, `onSetCardCover`, `onCopyCard`,
  `onMoveCard` (mantém `onArchiveCard` já existente).

## i18n

Chaves novas em `messages.pt.ts`/`messages.en.ts`, mesmo padrão de `cardDetail.*` já existente:
`cardDetail.sidebar.addToCard`, `cardDetail.sidebar.actions`, `cardDetail.addToCard.checklist`,
`cardDetail.addToCard.attachment`, `cardDetail.addToCard.cover`, `cardDetail.actions.move`,
`cardDetail.actions.copy`, `cardDetail.actions.archive` (reaproveita o texto já existente de
`cardDetail.archive.button` — não duplica chave, só reposiciona o uso), `cardDetail.cover.none`,
`cardDetail.moveDialog.title`, `cardDetail.moveDialog.confirm`, `cardDetail.tabs.activity`,
`cardDetail.activity.empty`, `cardDetail.activity.loadMore`.

## Fora de escopo

- Qualquer endpoint de backend novo — tudo consumido já existe (`008`/`022`/`031`/`032`).
- Capa por imagem/upload.
- Abrir automaticamente o modal do cartão copiado (decisão: só fecha o modal original e deixa o
  usuário ver a cópia aparecer ao vivo na lista — evita uma segunda chamada de detalhe e mantém
  o comportamento simples).
- Tempo real dedicado para a aba Atividade (leitura sob demanda, sem push ao vivo — decisão
  herdada da `031`).
