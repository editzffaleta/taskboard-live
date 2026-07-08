## Design — 031-cartao-copiar-capa-atividade

## Contexto

O módulo `board` já tem `card` (`008`, com `move`/`archive`/`restore` desde `008`/`022`),
`label` (`016`, com `LABEL_COLORS` e `card-response.util.ts`/`get-board-detail.usecase.ts` já
hidratando `labels`), `checklist-item`/`card-assignee` (`017`, mesmos dois arquivos já
hidratando `dueDate`/`assignees`/`checklist`) e `activity` (`011`, com `ActivityRepository`/
`ListActivity`/`activity.controller.ts` listando por `boardId` paginado). O tempo real (`006`)
já provê `RealtimeEmitter`. Esta change adiciona três sub-recursos ao mesmo módulo, sem
workspace novo, estendendo os arquivos que `016`/`017` já tocaram.

## Localização no código

```
modules/board/src/card/
  model/
    card.entity.ts                    <- ajustado: campo cover (LabelColor | null)
  usecase/
    duplicate-card.usecase.ts         <- novo

modules/board/src/activity/
  provider/
    activity.repository.ts            <- ajustado: findAllByCardId (paginado)
  usecase/
    list-card-activity.usecase.ts     <- novo

apps/backend/src/modules/board/
  card.controller.ts                  <- ajustado: POST .../cards/:id/copy,
                                          PATCH .../cards/:id/cover
  card-activity.controller.ts         <- novo: GET .../cards/:cardId/activity
  card-response.util.ts               <- ajustado: buildCardResponse inclui cover
  card.prisma.ts                      <- ajustado: persistir/ler cover
  activity.prisma.ts                  <- ajustado: findAllByCardId (filtro data.cardId)

modules/board/src/board/usecase/
  get-board-detail.usecase.ts         <- ajustado: BoardDetailCard ganha cover
```

Convenção idêntica a `016`/`017`: `model`≈domínio, `usecase`≈aplicação, `provider`≈porta;
implementação Prisma e controllers em `apps/backend/src/modules/board`.

## 1. Copiar cartão (`duplicate-card`)

**O que copia**: `title` (com sufixo `" (cópia)"`), `description`, `labels` (associações
`CardLabel` para os mesmos `labelId`), `dueDate`, `checklist` (novos `ChecklistItem` com o
mesmo `text`/`done`/`position`, `id` novo, associados ao cartão novo), e, opcionalmente,
`assignees` (flag `copyAssignees?: boolean`, default `false` — decisão: responsáveis
representam "quem está fazendo", copiar por padrão geraria falso sinal de que alguém já está
trabalhando na cópia; quem quiser, pede explicitamente). **Não copia**: `comments` (decisão:
comentários são uma conversa do cartão original, não fazem sentido "herdados" por uma cópia —
mesmo raciocínio de exclusão que `017` já registrou para fora do payload do cartão) nem `cover`
(decisão: capa é um destaque visual pontual do cartão original; copiar por padrão poluiria a
lista com faixas de cor idênticas sem intenção — quem quiser define a capa da cópia
manualmente).

- **`DuplicateCard(boardId, cardId, requesterId, toListId?, copyAssignees?)`**: valida
  `cardId` pertence a `boardId` (cross-board, padrão de `archive-card`/`move-card`); valida
  membership; resolve `toListId` (se ausente, usa a lista do cartão original) e que ela
  pertence ao mesmo `boardId`; calcula `position` como o fim da lista destino (mesmo cálculo de
  `CreateCard`); cria o `Card` novo com `cover: null`; copia `CardLabel` (mesmos `labelId`),
  `ChecklistItem` (novos itens, mesma ordem) e, se `copyAssignees`, `CardAssignee` (mesmos
  `userId`, ainda restritos a membros do quadro — já são, pois vieram do cartão original);
  retorna o cartão novo já enriquecido (para `card.controller.ts` montar `CardResponse` via
  `buildCardResponse`, igual a `create`/`restore`).
- Recebe por porta: `CardRepository`, `ListRepository`, `MembershipRepository`,
  `CardLabelRepository`, `ChecklistItemRepository`, `CardAssigneeRepository` (só quando
  `copyAssignees`).

### Endpoint

`POST /boards/:boardId/cards/:id/copy` `{toListId?: string; copyAssignees?: boolean}` → emite
`card.created` `{card}` (payload completo, mesmo shape de `create`) após sucesso.

## 2. Capa do cartão (`cover`)

**Decisão: capa é só cor, não imagem.** Motivo (fora de escopo explícito): capa por imagem
exigiria upload de arquivo, armazenamento e URL pública — infraestrutura de anexos que só
existe a partir da `032`. Modelar a capa como cor reaproveita a paleta `LABEL_COLORS` já
validada pela entidade `Label` (`016`), sem introduzir armazenamento binário nesta change. Se a
`032` (anexos) quiser permitir capa por imagem no futuro, é uma extensão aditiva do campo
`cover` (ex.: união de tipos), não tratada aqui.

- `Card.cover: LabelColor | null` — mesmo tipo `LabelColor` (`red`/`amber`/`green`/`blue`/
  `purple`/`teal`/`pink`) exportado por `modules/board/src/label/model/label.entity.ts`;
  validação na entidade `Card` usa `InRule(LABEL_COLORS)` quando `cover !== null` (mesma regra
  que `Label.color` já usa).
- **`SetCardCover(cardId, boardId, requesterId, cover)`**: caso de uso dedicado (mesmo padrão de
  `SetCardDueDate` da `017` — não reaproveita `EditCard`); valida cross-board e membership;
  `cover: null` limpa a capa (idempotente); `cover` fora de `LABEL_COLORS` é rejeitado.

### Endpoint

`PATCH /boards/:boardId/cards/:id/cover` `{cover: string | null}` → emite `card.updated`
`{card}` (payload completo) após sucesso.

### Persistência e payload

- Migration: coluna `cover String?` em `Card` (schema `apps/backend/prisma/models/board.model.prisma`),
  sem default; nenhum dado existente é afetado (`cover: null` para cartões atuais).
- `card-response.util.ts` (`buildCardResponse`) e `get-board-detail.usecase.ts`
  (`GetBoardDetail`/`BoardDetailCard`) passam a incluir `cover: string | null` no shape do
  cartão, hidratado diretamente de `card.cover` (sem repositório extra — não é um relacionamento,
  é uma coluna do próprio `Card`, ao contrário de `labels`/`checklist`/`assignees`).

## 3. Atividade do cartão

O agregado `Activity` (`011`) já grava `data: Record<string, unknown>` em todo evento de cartão
gravado por `card.controller.ts` (`create` grava `{cardId, listId, title}`, `edit` grava
`{cardId, listId, title}`, `move` grava `{cardId, fromListId, toListId, position}`, `delete`
grava `{cardId, listId}`) — todos incluem `cardId`. `ListActivity` (`011`) hoje só filtra por
`boardId`. Esta change adiciona a variante filtrada por cartão.

**Decisão de filtro**: filtrar `data.cardId` diretamente no JSON via query Prisma
(`data: { path: ['cardId'], equals: cardId }`, suportado pelo provider Postgres do Prisma) é
viável, mas teria performance pior sem índice dedicado e acopla o repositório ao shape interno
de `data`. Abordagem escolhida (mais simples e testável): o **repositório aceita um parâmetro de
filtro `cardId` opcional** em `findAllByBoardId` — a implementação Prisma resolve com
`data: { path: ['cardId'], equals: cardId }` (Postgres JSON path query), sem exigir novo índice
nesta change (volume de atividade por cartão é pequeno; se a performance se mostrar um problema
em produção, promover `cardId` a coluna indexável fica registrado como melhoria futura, fora de
escopo aqui).

- **`ActivityRepository.findAllByBoardId`** ganha um parâmetro opcional `cardId?: string` em
  `FindAllByBoardIdParams`; quando presente, filtra adicionalmente por
  `data.cardId === cardId` (JSON path), mantendo a ordenação `createdAt DESC` e a paginação
  existentes.
- **`ListCardActivity(boardId, cardId, requesterId, page?, perPage?)`**: novo caso de uso (não
  reaproveita `ListActivity` diretamente para deixar explícita a obrigatoriedade de `cardId` e a
  validação de que o cartão pertence ao `boardId` da rota — cross-board, mesmo padrão de
  `archive-card`); valida membership do quadro; delega a `ActivityRepository.findAllByBoardId`
  passando `cardId`.

### Endpoint

`GET /boards/:boardId/cards/:cardId/activity?page=&limit=` → `ListCardActivity`, mesmo shape de
resposta paginada de `activity.controller.ts` (`items`, `page`, `perPage`, `total`). Guard de
membership do quadro (não é preciso ser autor de nada — leitura de atividade já é aberta a
qualquer membro, mesmo padrão de `ListActivity`).

## Autorização

Todos os três endpoints novos exigem JWT (guard global, `004`) e membership do quadro
(`005`) — nenhuma restrição adicional (nem "autor-only", nem "owner-only"); mesmo padrão de
`move-card`/`archive-card`/checklist/assignees.

## Tempo real

- `duplicate-card` → `card.created` `{card}` (payload completo via `buildCardResponse`,
  incluindo `cover: null` do cartão recém-criado) — reaproveita a reconciliação de estado que o
  frontend já tem para `card.created` desde a `008`.
- `set-card-cover` → `card.updated` `{card}` (payload completo, com `cover` atualizado).
- `GET .../activity` é leitura pura — não emite evento (mesmo padrão de `GET /boards/:id` e
  `GET .../comments`).

Eventos emitidos **após** cada caso de uso ter sucesso, via
`RealtimeEmitter.emitToBoard(boardId, event, payload)` — nunca antes, nunca em erro.

## Fora de escopo

- Anexos (upload de arquivo, capa por imagem) — `032`.
- Menu de Ações na UI, seletor de capa, aba Atividade na tela do detalhe do cartão — `033`.
- Reimplementar Mover (`008`)/Arquivar (`022`) — já existem, não tocados.
- Promover `cardId` a coluna indexável em `Activity` — melhoria futura, registrada, não feita
  aqui.
