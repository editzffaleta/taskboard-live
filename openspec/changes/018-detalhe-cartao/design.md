## Design — 018-detalhe-cartao

## Contexto

O frontend do quadro ao vivo (`apps/frontend/src/modules/boards/`) já tem `BoardView` orquestrando
estado + socket, `KanbanCard` com título editável e o popover de etiquetas (`016`). O backend
(`017`, já arquivada) expõe `dueDate`, `checklist`, `assignees` no mesmo payload de cartão
(`buildCardResponse`, consumido por `GET /boards/:id` e por `card.created`/`card.updated`) e
`comment.created`/`comment.deleted` como eventos dedicados (comentários **não** vêm no payload de
cartão — ver "Por que comentários ficam fora" no `design.md` da `017`). Esta change é
exclusivamente frontend: nenhum endpoint novo, nenhuma migration, nenhum caso de uso.

## Roteamento do modal: estado local, não rota dedicada

**Decisão: o modal abre via estado (`selectedCardId` em `BoardView`), não via rota
`/boards/[id]/cards/[cardId]`.** Motivos:

1. O quadro inteiro (`BoardState`) já vive em memória no `BoardView`, reconciliado ao vivo pelo
   socket. Se o modal fosse uma rota própria, ela precisaria (a) buscar o cartão de novo via
   HTTP ao montar, e (b) manter uma segunda assinatura de socket independente do `BoardView` —
   duplicando a reconciliação que já existe, ou forçando um contexto compartilhado só para isso.
2. Trello e ferramentas similares tratam o detalhe do cartão como um overlay do quadro, não como
   navegação — fechar o modal volta exatamente para onde o usuário estava, sem re-fetch.
3. Mantém o contrato de tempo real simples: o mesmo `applyCardUpdated`/`applyCommentCreated` que
   atualiza o cartão na coluna também atualiza o cartão aberto no modal, porque é o **mesmo
   objeto de estado** (`board.lists[].cards[]`), não uma cópia buscada à parte.

Implementação: `BoardView` ganha `const [selectedCardId, setSelectedCardId] = useState<string |
null>(null)`. `KanbanCard` recebe `onOpen: (cardId: string) => void`, chamado num clique no corpo
do cartão (não no título em edição, não nos botões de ação). `BoardView` deriva `selectedCard =
board.lists.flatMap(l => l.cards).find(c => c.id === selectedCardId) ?? null` a cada render e
passa para `<CardDetailModal card={selectedCard} onClose={...} .../>` — se `selectedCard` for
`null` (cartão foi excluído por outra pessoa enquanto o modal estava aberto, via
`card.deleted`), o modal fecha sozinho (efeito que observa `selectedCard === null &&
selectedCardId !== null`).

## Estrutura de componentes

```
apps/frontend/src/modules/boards/
  components/
    card-detail-modal.component.tsx        <- shell do modal: título editável, descrição,
                                               abas Detalhes/Comentários (mockup:
                                               tabDetails/tabComments), fecha em overlay click/Esc
    card-detail-due-date.component.tsx      <- date picker + badge atrasado/hoje/futuro
    card-detail-assignees.component.tsx     <- avatares atribuídos + popover de membros do quadro
    card-detail-checklist.component.tsx     <- barra de progresso + lista de itens
                                               (add/toggle/editar/excluir/reordenar)
    card-detail-comments.component.tsx      <- lista paginada ("carregar mais") + form de novo
                                               comentário + excluir (autor-only)
    card-due-badge.component.tsx            <- selo compacto reaproveitado no modal e no
                                               kanban-card (mesma lógica atrasado/hoje/futuro)
    card-assignee-avatar.component.tsx      <- avatar circular de iniciais, reaproveitado no
                                               modal e no kanban-card
  api/
    card-detail.api.ts                      <- setCardDueDate, addChecklistItem,
                                               toggleChecklistItem, editChecklistItem,
                                               deleteChecklistItem, reorderChecklistItems,
                                               assignUser, unassignUser, addComment,
                                               listComments, deleteComment
  types/
    board-state.type.ts                     <- ajustado: CardState ganha dueDate/assignees/
                                               checklist; novo CommentState (local, ver seção
                                               "Contador de comentários")
  util/
    board-state.reducer.ts                  <- ajustado: toCardState hidrata os 3 campos novos;
                                               novo applyCommentCreated/applyCommentDeleted
                                               (ajusta commentsCount por cartão)
    due-date.util.ts                        <- classifica dueDate em 'late'|'today'|'upcoming'|
                                               null, puro, testável sem DOM
  components/kanban-card.component.tsx      <- ajustado: badges (prazo, avatares, checklist,
                                               comentários) a partir de CardState

hooks/use-board-socket.ts                   <- ajustado: CardEventPayload.card ganha
                                               dueDate/assignees/checklist; novos
                                               onCommentCreated/onCommentDeleted assinando
                                               comment.created/comment.deleted
```

Convenção de nomes: sufixo `.component.tsx` para componentes, `.util.ts` para funções puras,
`.api.ts` para chamadas HTTP — mesma convenção de `label-chip`/`label-color.util.ts` da `016`.

## Cada seção do modal → endpoint/estado/evento

| Seção | Endpoint (017) | Ação local | Evento ao vivo |
|---|---|---|---|
| Título | `PATCH /cards/:id` (edit-card, já existente desde `008`) | otimista (mesmo padrão de `handleRenameCard`) | `card.updated` reconcilia |
| Descrição | `PATCH /cards/:id` (edit-card) | otimista | `card.updated` reconcilia |
| Etiquetas | `PUT`/`DELETE .../labels/:labelId` (`016`) | reaproveita `LabelPopover`/`handleToggleLabel` já existentes, **sem** otimismo (mesma decisão da `016`: só reflete via socket) | `card.updated` reconcilia |
| Prazo | `PATCH /cards/:id/due` | otimista (mostra o valor escolhido imediatamente; reverte se a request falhar, mesmo padrão de `revertToSnapshot`) | `card.updated` reconcilia `dueDate` |
| Responsáveis | `PUT`/`DELETE /cards/:cardId/assignees/:userId` | **sem** otimismo (mesma decisão de etiquetas — evita mostrar um responsável que a API rejeitou por não ser membro) | `card.updated` reconcilia `assignees` |
| Checklist (add/toggle/editar/excluir/reordenar) | `POST`/`PATCH`/`PATCH(text)`/`DELETE`/`PUT(order)` `.../checklist(...)` | otimista para toggle (resposta imediata ao clique); demais operações aguardam o evento (evita reordenar duas vezes) | `card.updated` reconcilia `checklist` completo |
| Comentários (listar) | `GET /cards/:cardId/comments?page=&pageSize=` | busca sob demanda ao abrir a aba "Comentários" (não no `GET /boards/:id`, que não inclui comentários — decisão da `017`) | — (paginação é pull, não push) |
| Comentários (adicionar) | `POST /cards/:cardId/comments` | otimista (comentário temporário até a resposta) | `comment.created` reconcilia (substitui o temporário pelo `id` real, mesmo padrão de reconciliação de eco usado em `handleCreateCard`) |
| Comentários (excluir) | `DELETE /cards/:cardId/comments/:id` | otimista (remove da lista local) | `comment.deleted` reconcilia (idempotente: remover um id já removido não lança erro no cliente) |

Toda mutação que chama `card.updated`/`comment.*` do socket só precisa atualizar o estado se o
`cardId` do payload bater com `selectedCard.id` OU com qualquer cartão do quadro — como o modal
lê o cartão diretamente de `board.lists[].cards[]` (ver seção de roteamento), essa atualização já
acontece via `applyCardUpdated` existente; não há reconciliação duplicada a escrever.

## Prazo: classificação atrasado/hoje/futuro

`due-date.util.ts` exporta `classifyDueDate(dueDate: string | null, now = new Date()): 'late' |
'today' | 'upcoming' | null` — comparação por data civil (ano/mês/dia), não por timestamp exato,
para não marcar "atrasado" um cartão cujo prazo é hoje às 23:59. Reaproveitado por
`card-due-badge.component.tsx` (modal e `kanban-card`) para escolher cor/rótulo (mockup: `late`
vermelho "Atrasado · {data}", `today` "Hoje", `upcoming` a data formatada `dd MMM`).

## Responsáveis: seletor a partir de `GET /boards/:boardId/members`

`card-detail-assignees.component.tsx` busca a lista de membros do quadro (reaproveitando
`listMembers` de `members.api.ts`, já usada por `members-panel.component.tsx`) uma vez ao abrir o
modal (a lista de membros já é mantida viva em `BoardView.members` via `member.added` — passada
como prop, sem nova busca) e oferece um popover de seleção (mesmo padrão visual do
`LabelPopover`: checkbox por membro, `assigned` = está em `card.assignees`). Nenhum membro pode
ser removido do quadro a partir daqui — é apenas atribuição ao cartão.

## Checklist: progresso e reordenação

Barra de progresso: `done = checklist.filter(i => i.done).length`, `total =
checklist.length`, `percent = total === 0 ? 0 : Math.round((done / total) * 100)` — barra e texto
("{done}/{total}") só renderizam se `total > 0` (mockup mostra a seção sempre visível com botão
"+ item", mas a barra de progresso em si é condicional). Reordenação: drag-and-drop com
`@hello-pangea/dnd` (já é dependência do projeto, reaproveitada em vez de introduzir uma segunda
lib de DnD) dentro do modal, chamando `PUT .../checklist/order` com a lista completa de ids na
nova posição ao soltar (mesmo padrão de `handleDragEnd` para listas, mas escopado ao checklist de
um único cartão).

## Comentários: paginação e exclusão autor-only

`list-comments` retorna DESC (mais recente primeiro, decisão da `017`). O modal carrega a
primeira página ao abrir a aba "Comentários" e oferece "Carregar mais" (não scroll infinito, mais
simples e testável) que busca a página seguinte e concatena. Botão de excluir só aparece quando
`comment.authorId === currentUser.id` (o backend já rejeita com `403` se não for, mas o frontend
não deve nem oferecer a ação — evita uma chamada fadada ao erro).

## Contador de comentários no `kanban-card`: limitação assumida

O payload de cartão (`buildCardResponse`, `GET /boards/:id`, `card.created`/`card.updated`) **não
inclui** uma contagem de comentários — decisão explícita da `017` (comentários ficam fora do
board-detail para não inflar o payload). Introduzir esse campo seria mudança de contrato de
backend, fora do escopo desta change (frontend-only). Decisão: `BoardState` mantém um
`commentsCountByCardId: Record<string, number>` **somente em memória, alimentado ao vivo** por
`comment.created` (incrementa) e `comment.deleted` (decrementa), inicializado vazio ao carregar o
quadro. Consequência assumida: um cartão que já tinha comentários **antes** de o usuário atual
abrir o quadro só mostra o contador depois que a aba de comentários for aberta ao menos uma vez
nesta sessão (o `GET /cards/:cardId/comments` retorna `total`, usado para popular
`commentsCountByCardId[cardId]` no momento em que a aba é aberta) — e cartões nunca abertos nesta
sessão simplesmente não mostram o badge de comentários (consistente com "sem dado real, não
mostra"; não é inventado, é ausente até ser observado). Registrado como pendência para o humano
avaliar se vale abrir uma change de backend dedicada (`commentsCount` no board-detail) no futuro.

## Badges no `kanban-card`: só o que existe

`kanban-card.component.tsx` passa a renderizar, condicionalmente:
- selo de prazo (`card-due-badge`) — só se `card.dueDate !== null`.
- avatares de responsáveis (`card-assignee-avatar`, empilhados com leve sobreposição, igual ao
  mockup) — só se `card.assignees.length > 0`.
- progresso do checklist ("✓ {done}/{total}") — só se `card.checklist.length > 0`.
- contador de comentários — só se `commentsCountByCardId[card.id]` existir e for `> 0` (ver seção
  acima).

Nenhum desses elementos renderiza para um cartão sem o dado correspondente — sem placeholder,
sem "0/0".

## i18n

Chaves novas em `pt`/`en`: `cardDetail.*` (títulos de seção, placeholders, botões, estados
vazios, abas "Detalhes"/"Comentários") e códigos de erro dos endpoints da `017`
(`checklistItem.not.found`, `checklistItem.text.required`, `comment.not.found`,
`comment.text.required`, `comment.forbidden`, `cardAssignee.not.member`, etc.) seguindo a mesma
convenção de códigos crus já usada por `label`/`card-label` (`016`) — sem inventar infraestrutura
nova de i18n de domínio.

## Fora de escopo

- Qualquer endpoint, caso de uso, migration ou model novo (`016`/`017` já entregaram tudo).
- Filtros/visões por prazo/responsável/checklist/comentário (`019`).
- Tela de "Configurações do Quadro" (`020`).
- Edição/reação de comentário (autor só cria e exclui).
- Notificações de prazo vencendo/vencido.
- `commentsCount` persistido no backend (ver limitação assumida acima) — decisão registrada
  como pendência para o humano.
