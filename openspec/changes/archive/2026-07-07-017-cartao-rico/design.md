## Design — 017-cartao-rico

## Contexto

O módulo `board` já tem `board`/`membership` (`005`), `list` (`007`), `card` (`008`), `activity`
(`011`) e `label` (`016`, com `card-response.util.ts` e `get-board-detail.usecase.ts` já
hidratando `labels`). O tempo real (`006`) já provê a porta `RealtimeEmitter`, registrada e
exportada pelo `BoardModule`. Esta change adiciona quatro sub-recursos ao cartão — todos no
mesmo módulo `board`, sem workspace novo — e estende os dois pontos de leitura que `016` já
tocou (`card-response.util.ts`, `get-board-detail.usecase.ts`) para incluir os campos novos.

## Localização no código

```
modules/board/src/card/
  model/
    card.entity.ts                  <- ajustado: campo dueDate (Date | null)

modules/board/src/checklist-item/
  model/
    checklist-item.entity.ts        <- ChecklistItem { id, cardId, text, done, position }
  provider/
    checklist-item.repository.ts    <- porta: create, findById, findAllByCardId,
                                        findAllByCardIds, update, delete, countByCardId
  usecase/
    add-checklist-item.usecase.ts
    toggle-checklist-item.usecase.ts
    edit-checklist-item.usecase.ts
    delete-checklist-item.usecase.ts
    reorder-checklist-items.usecase.ts

modules/board/src/card-assignee/
  provider/
    card-assignee.repository.ts     <- porta: assign, unassign, findAllByCardId,
                                        findAllByCardIds
  usecase/
    assign-user.usecase.ts
    unassign-user.usecase.ts

modules/board/src/comment/
  model/
    comment.entity.ts                <- Comment { id, cardId, authorId, text, createdAt }
  provider/
    comment.repository.ts            <- porta: create, findById, findAllByCardId (paginado),
                                         countByCardId, delete
  usecase/
    add-comment.usecase.ts
    list-comments.usecase.ts
    delete-comment.usecase.ts

apps/backend/src/modules/board/
  card.controller.ts                 <- ajustado: PATCH .../cards/:id/due (definir/limpar prazo)
  checklist.controller.ts            <- /boards/:boardId/cards/:cardId/checklist
  card-assignee.controller.ts        <- /boards/:boardId/cards/:cardId/assignees
  comment.controller.ts              <- /boards/:boardId/cards/:cardId/comments
  card-response.util.ts              <- ajustado: buildCardResponse inclui dueDate/assignees/checklist
  checklist-item.prisma.ts           <- PrismaChecklistItemRepository
  card-assignee.prisma.ts            <- PrismaCardAssigneeRepository
  comment.prisma.ts                  <- PrismaCommentRepository

modules/board/src/board/usecase/
  get-board-detail.usecase.ts        <- ajustado: BoardDetailCard ganha dueDate/assignees/checklist
```

Convenção de pastas idêntica a `label` (`016`): `model`≈domínio, `usecase`≈aplicação,
`provider`≈porta; implementação Prisma e controllers em `apps/backend/src/modules/board`.

## Modelo de dados

**`Card.dueDate`** (ajuste no model existente): `dueDate DateTime?` — nullable, sem valor
default. Não é um agregado novo, é um campo a mais na entidade `Card` já existente.

**`ChecklistItem`**: `id`, `cardId` (FK → `Card`, cascade), `text` (string, obrigatório),
`done` (boolean, default `false`), `position` (int, ordena a exibição no checklist),
`createdAt`.

**`CardAssignee`**: `id`, `cardId` (FK → `Card`, cascade), `userId` (FK → `User`, cascade),
`unique(cardId, userId)` (não duplicar o mesmo responsável no mesmo cartão), `createdAt`.

**`Comment`**: `id`, `cardId` (FK → `Card`, cascade), `authorId` (FK → `User`, sem cascade —
manter o comentário mesmo se o usuário for removido é fora de escopo desta change; seguir o
padrão mais simples de FK cascade só quando o pai é o próprio `Card`), `text` (string,
obrigatório, não vazio), `createdAt`.

## Casos de uso

### Prazo

- **`edit-card` (existente, estendido) ou endpoint dedicado**: decisão — endpoint dedicado
  `PATCH /boards/:boardId/cards/:id/due` com `{ dueDate: string | null }`, chamando um caso de
  uso novo **`set-card-due-date(cardId, dueDate)`** (não reaproveita `EditCard`, que só lida com
  `title`/`description`). Motivo: manter `EditCard` sem crescer sua responsabilidade e permitir
  que `018` chame "limpar prazo" sem reenviar título/descrição. Valida existência do cartão e
  membership; `dueDate: null` limpa o prazo (idempotente).

### Checklist

- **`add-checklist-item(cardId, text)`**: valida `text` não vazio; calcula `position` como
  `max(position) + 1` entre os itens existentes do cartão; persiste.
- **`toggle-checklist-item(itemId, done)`**: valida existência e posse do `cardId`/`boardId` da
  rota; atualiza `done`.
- **`edit-checklist-item(itemId, text)`**: valida `text` não vazio; atualiza.
- **`delete-checklist-item(itemId)`**: remove o item; não recalcula `position` dos demais
  (gaps são aceitáveis — a ordenação é por valor relativo, não por sequência contígua).
- **`reorder-checklist-items(cardId, orderedItemIds)`**: recebe a lista completa de ids na nova
  ordem; reatribui `position` sequencialmente (0..n-1); valida que todos os ids pertencem ao
  `cardId`.

Todos validam que o `cardId` da rota pertence ao `boardId` da rota (padrão cross-board da `008`/
`016`) e que o requisitante é membro do quadro.

### Responsáveis

- **`assign-user(cardId, userId)`**: valida que `userId` é `BoardMember` do quadro do cartão
  (resolvendo `boardId` via lista); idempotente (atribuir um responsável já atribuído não
  duplica nem erra — mesmo padrão de `assign-label` da `016`); retorna o cartão com
  `assignees` atualizado.
- **`unassign-user(cardId, userId)`**: remove a linha `CardAssignee`, se existir (idempotente);
  retorna o cartão com `assignees` atualizado.

### Comentários

- **`add-comment(cardId, authorId, text)`**: valida `text` não vazio; `authorId` vem do usuário
  autenticado (`CurrentUser`), não do body; valida membership do quadro do cartão; persiste;
  retorna o comentário criado (com `author: { id, name }` hidratado).
- **`list-comments(cardId, page, pageSize)`**: retorna comentários **do mais recente para o
  mais antigo** (`createdAt DESC`) — decisão: uma thread de comentários geralmente é lida "o que
  aconteceu por último" primeiro, e é o padrão mais comum em ferramentas de kanban (Trello,
  Jira) para o topo da lista; paginação por `page`/`pageSize` (querystring), com `total` no
  payload para a `018` desenhar paginação.
- **`delete-comment(commentId, requesterId)`**: valida que `requesterId` é o `authorId` do
  comentário (autor-only, não é suficiente ser membro do quadro); remove.

## Persistência Prisma

- `Card` ganha coluna `dueDate DateTime?` (migration `alter table`, sem default).
- Novos models `ChecklistItem`, `CardAssignee`, `Comment` no schema modular
  (`apps/backend/prisma/models/board.model.prisma`), com FKs cascade descritas acima.
- `PrismaChecklistItemRepository.findAllByCardIds` e `PrismaCardAssigneeRepository.findAllByCardIds`
  seguem o mesmo padrão de `PrismaCardLabelRepository.findAllByCardIds` (`016`): uma única
  consulta com `IN`, sem N+1, usada por `get-board-detail.usecase.ts` para hidratar todos os
  cartões do quadro de uma vez.
- `PrismaCommentRepository.findAllByCardId` implementa paginação (`skip`/`take`) e
  `countByCardId` para o `total` — **não** é usado por `get-board-detail` (comentários ficam de
  fora do board-detail, conforme decisão abaixo).

## Endpoints e autorização

Protegidos pelo guard de autenticação JWT global (`004`) e pela checagem de `BoardMember` do
quadro (`005`) — qualquer membro pode mutar prazo/checklist/responsáveis/comentários (exceto
excluir comentário, que é autor-only):

- `PATCH /boards/:boardId/cards/:id/due` `{ dueDate: string | null }` → `set-card-due-date`.
- `POST /boards/:boardId/cards/:cardId/checklist` `{text}` → `add-checklist-item`.
- `PATCH /boards/:boardId/cards/:cardId/checklist/:itemId` `{done?}` → `toggle-checklist-item`.
- `PATCH /boards/:boardId/cards/:cardId/checklist/:itemId/text` `{text}` →
  `edit-checklist-item` (rota separada de `toggle` para não confundir o cliente sobre qual
  campo está mudando).
- `DELETE /boards/:boardId/cards/:cardId/checklist/:itemId` → `delete-checklist-item`.
- `PUT /boards/:boardId/cards/:cardId/checklist/order` `{itemIds: string[]}` →
  `reorder-checklist-items`.
- `PUT /boards/:boardId/cards/:cardId/assignees/:userId` (sem body) → `assign-user`; valida
  `userId` é `BoardMember` do quadro (rejeita `404`/`422` se não for).
- `DELETE /boards/:boardId/cards/:cardId/assignees/:userId` → `unassign-user`.
- `POST /boards/:boardId/cards/:cardId/comments` `{text}` → `add-comment`.
- `GET /boards/:boardId/cards/:cardId/comments?page=&pageSize=` → `list-comments`.
- `DELETE /boards/:boardId/cards/:cardId/comments/:id` → `delete-comment` (403 se
  `requesterId !== comment.authorId`, mesmo sendo membro do quadro).

Todos os controllers validam que `cardId` (via lista → quadro) pertence ao `boardId` da rota
antes de delegar ao caso de uso — mesmo padrão cross-board de `card-label.controller.ts`
(`016`).

## Tempo real: `card.updated` para prazo/checklist/responsáveis, `comment.created` dedicado

Seguindo a decisão registrada no `design.md` da `016`: prazo, checklist e responsáveis são
**sub-recursos do cartão** — qualquer mutação neles emite **`card.updated`** com o payload
completo do cartão (via `buildCardResponse`, incluindo `labels`, `dueDate`, `assignees`,
`checklist`), reaproveitando a reconciliação de estado que o frontend já tem para `card.updated`
desde a `008`/`016`. Isso vale mesmo para operações "pequenas" como `toggle-checklist-item` —
não existe `checklist.item.toggled` como evento separado.

**Comentários são a exceção**: `add-comment`/`delete-comment` emitem **`comment.created`**/
`comment.deleted` (payload `{comment}`/`{commentId, cardId}`), **não** `card.updated`. Motivo:
comentários não fazem parte do payload de `CardResponse` (ver "Fora do board-detail" abaixo) —
emitir `card.updated` não adiantaria nada ao cliente, que precisa de um evento próprio para
anexar o novo comentário à lista que já tem carregada (thread aberta na `018`).

Eventos emitidos após cada caso de uso ter sucesso, via
`RealtimeEmitter.emitToBoard(boardId, event, payload)`:

- `set-card-due-date` → `card.updated` `{card}` (com `dueDate` atualizado).
- `add-checklist-item`/`toggle-checklist-item`/`edit-checklist-item`/`delete-checklist-item`/
  `reorder-checklist-items` → `card.updated` `{card}` (com `checklist` atualizado).
- `assign-user`/`unassign-user` → `card.updated` `{card}` (com `assignees` atualizado).
- `add-comment` → `comment.created` `{comment: {id, cardId, authorId, authorName, text,
  createdAt}}`.
- `delete-comment` → `comment.deleted` `{commentId, cardId}`.

## Por que comentários ficam fora do payload do cartão e do board-detail

`GET /boards/:id` (via `get-board-detail.usecase.ts`) hidrata `dueDate`, `assignees` e
`checklist` em cada `BoardDetailCard`, mas **não** hidrata comentários. Motivo: um cartão pode
acumular dezenas de comentários ao longo do tempo — incluir a lista inteira em todo carregamento
do quadro (e em todo evento `card.updated`, disparado a cada toggle de checklist ou troca de
lista) inflaria o payload sem necessidade, já que comentários só são lidos quando a `018` abre o
detalhe de um cartão específico. Por isso `list-comments` é uma chamada HTTP separada e paginada
(`GET /cards/:id/comments`), disparada sob demanda pela `018`.

## Payload de resposta do cartão (ajuste em `card-response.util.ts` e `get-board-detail.usecase.ts`)

`CardResponse` ganha:

```ts
dueDate: string | null;               // ISO 8601, hidratado direto de card.dueDate
assignees: { id: string; name: string }[];   // via CardAssigneeRepository + UserRepository
checklist: { id: string; text: string; done: boolean; position: number }[];
```

`buildCardResponse` passa a receber `ChecklistItemRepository`, `CardAssigneeRepository` e
`UserRepository` (para resolver `name` dos assignees) por parâmetro, hidratando os três campos
da mesma forma que já hidrata `labels` (busca por `cardId`, mapeia para o shape de resposta).
`GetBoardDetail` ganha os mesmos três repositórios no construtor e usa as variantes
`findAllByCardIds` (evitar N+1) para hidratar todos os cartões do quadro de uma vez, seguindo
exatamente o padrão que `016` já estabeleceu para `labelsByCardId`.

`card.controller.ts` (`create`, `edit`, `move`) e o novo `set-card-due-date` continuam com o
mesmo shape de payload de evento (`card.created`/`card.updated`/`card.moved`) — só o shape
interno de "cartão" dentro do payload ganha os três campos novos, sem quebrar consumidores que
já leem `id`/`title`/`labels`/etc.

## Fora de escopo

- UI do detalhe do cartão (`018`): exibição de prazo, checklist interativo, avatares,
  thread de comentários.
- Filtros/visões por prazo/responsável/checklist (`019`).
- Notificações de prazo vencendo/vencido.
- Edição/reação de comentário, menções — apenas criar/listar/excluir (autor-only).
- Reimplementação de sala, presença ou handshake do Socket.IO (já entregues pela `006`).
