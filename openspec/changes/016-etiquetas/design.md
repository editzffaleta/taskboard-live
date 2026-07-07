## Design — 016-etiquetas

## Contexto

O módulo `board` já tem os agregados `board`/`membership` (`005`), `list` (`007`), `card` (`008`)
e `activity` (`011`). O tempo real (`006`) já provê a porta `RealtimeEmitter` (interface) e sua
implementação sobre o gateway Socket.IO, registrada e exportada pelo `BoardModule`. Esta change
adiciona o agregado `label` no mesmo módulo e o relacionamento N:N `Card`↔`Label`, consumindo a
porta existente — não a reimplementa.

## Localização no código

```
modules/board/src/label/
  model/
    label.entity.ts            <- Label { id, boardId, name, color }
  provider/
    label.repository.ts        <- porta (interface): create, findById, findAllByBoardId,
                                   update, delete
    card-label.repository.ts   <- porta (interface): assign, unassign, findAllByCardId,
                                   findAllByCardIds (para hidratar vários cartões de uma vez)
  usecase/
    create-label.usecase.ts
    update-label.usecase.ts
    delete-label.usecase.ts
    list-labels.usecase.ts
    assign-label.usecase.ts
    unassign-label.usecase.ts

apps/backend/src/modules/board/
  label.prisma.ts               <- PrismaLabelRepository + PrismaCardLabelRepository
  label.controller.ts           <- /boards/:boardId/labels
  card-label.controller.ts      <- /boards/:boardId/cards/:cardId/labels/:labelId
  card.controller.ts            <- ajustado: toResponse(card) passa a incluir `labels`
```

Siga a mesma convenção de pastas de `card`/`list` (`domain`≈`model`, `application`≈`usecase`,
`provider` como porta, `infrastructure`/`interface` no `apps/backend`) — consistência dentro do
módulo é mais importante que o nome exato aqui.

## Modelo

`Label`: `id`, `boardId` (FK → `Board`, cascade), `name` (string, obrigatório), `color` (enum
restrito a `red | amber | green | blue | purple | teal | pink` — as 7 cores do mockup, validadas
no domínio, não em Prisma nativo `enum` para manter portabilidade com o padrão já usado no
projeto de strings validadas em `role`), `createdAt`.

`CardLabel`: `id`, `cardId` (FK → `Card`, cascade), `labelId` (FK → `Label`, cascade),
`unique(cardId, labelId)` (não duplicar a mesma etiqueta no mesmo cartão), `createdAt`.

## Casos de uso

- **`create-label(boardId, name, color)`**: valida `name` não vazio e `color` ∈ paleta; persiste;
  retorna a etiqueta criada.
- **`update-label(labelId, name?, color?)`**: valida existência e que a etiqueta pertence ao
  `boardId` da rota; atualiza `name`/`color` informados.
- **`delete-label(labelId)`**: valida existência/posse; remove a etiqueta (cascade remove as
  linhas de `CardLabel` associadas — nenhuma limpeza manual necessária).
- **`list-labels(boardId)`**: retorna todas as etiquetas do quadro, ordenadas por `createdAt`.
- **`assign-label(cardId, labelId)`**: valida que o cartão e a etiqueta pertencem ao mesmo
  `boardId` (resolvendo `boardId` do cartão via lista, e o `boardId` da etiqueta diretamente);
  idempotente — atribuir uma etiqueta já atribuída não duplica nem erra (verifica antes de
  inserir, ou usa `unique` do banco e ignora conflito). Retorna o cartão com suas `labels`.
- **`unassign-label(cardId, labelId)`**: remove a linha `CardLabel` correspondente, se existir
  (idempotente); retorna o cartão com suas `labels` atualizadas.

Todos os casos de uso recebem repositórios via porta (`LabelRepository`, `CardLabelRepository`,
`CardRepository`, `MembershipRepository`), testáveis com fakes em memória.

## Endpoints e autorização

Protegidos pelo guard de autenticação JWT global (`004`) e pela checagem de `BoardMember` do
quadro (`005`) — qualquer membro pode mutar etiquetas, não apenas o owner:

- `GET /boards/:boardId/labels` → `list-labels`.
- `POST /boards/:boardId/labels` `{name, color}` → `create-label`.
- `PATCH /boards/:boardId/labels/:id` `{name?, color?}` → `update-label`.
- `DELETE /boards/:boardId/labels/:id` → `delete-label`.
- `PUT /boards/:boardId/cards/:cardId/labels/:labelId` (sem body) → `assign-label`.
- `DELETE /boards/:boardId/cards/:cardId/labels/:labelId` → `unassign-label`.

O controller de atribuição valida que `cardId` (via lista → quadro) e `labelId` pertencem ao
`boardId` da rota antes de chamar o caso de uso — cross-board é rejeitado (mesmo padrão de
`move-card` na `008`).

## Tempo real: por que `card.updated` (e não `card.labels.changed`)

Decisão: `assign-label`/`unassign-label` emitem **`card.updated`** com o payload completo do
cartão (incluindo `labels: LabelResponse[]`), em vez de um evento dedicado
`card.labels.changed`. Motivo: o frontend já reconcilia o estado do cartão inteiro ao receber
`card.updated` (herdado da `008`/`009`); reaproveitar o mesmo evento evita duplicar lógica de
merge no cliente para um segundo tipo de evento, e mantém o payload de cartão sempre completo e
consistente (útil também para `017`, que vai adicionar mais campos ao mesmo payload de cartão).
`017`/`018`/`019` devem seguir esse mesmo padrão: qualquer mudança de sub-recurso do cartão
(prazo, checklist, responsáveis, comentários) também emite `card.updated` com o cartão completo,
não eventos fragmentados por campo.

Eventos emitidos após cada caso de uso ter sucesso, via
`RealtimeEmitter.emitToBoard(boardId, event, payload)`:

- `create-label` → `label.created` `{label}`.
- `update-label` → `label.updated` `{label}`.
- `delete-label` → `label.deleted` `{labelId}`.
- `assign-label`/`unassign-label` → `card.updated` `{card}` (com `card.labels` atualizado).

## Payload de resposta do cartão (ajuste em `card.controller.ts`)

`CardResponse` ganha o campo `labels: { id: string; name: string; color: string }[]`. O
controller de `card` passa a receber `CardLabelRepository`/`LabelRepository` (ou um serviço de
leitura combinando ambos) para hidratar `labels` em `create`/`edit`/`move` — os quatro handlers
existentes de `card.controller.ts` (`create`, `edit`, `delete`, `move`) continuam emitindo seus
próprios eventos (`card.created`, `card.updated`, `card.moved`, `card.deleted`); apenas o shape de
`CardResponse` muda para incluir `labels` (lista vazia em cartão recém-criado).

## Frontend

- **Chips no `kanban-card.component.tsx`**: renderizar `card.labels` (novo campo em
  `CardState`) como chips coloridos acima/ao lado do título, reproduzindo a paleta exata do
  mockup (`--lbl-<cor>-bg` / `--lbl-<cor>-fg` de `Quadro ao Vivo.dc.html`): `red`, `amber`,
  `green`, `blue`, `purple`, `teal`, `pink`. Mapear essas 7 cores para classes Tailwind (ou
  tokens CSS) equivalentes no design system do frontend — não inventar cores fora da paleta.
- **Popover de etiquetas**: acionado por um botão no cartão (ex.: ícone "label"), lista as
  etiquetas do quadro (via `GET /boards/:boardId/labels`, socket já traz `label.created`/
  `label.updated`/`label.deleted` para manter a lista viva) com checkbox de atribuído/não
  atribuído (chama `PUT`/`DELETE .../labels/:labelId`); campo de criação rápida (nome + seletor
  das 7 cores) que chama `POST /boards/:boardId/labels`. **Não** construir a tela de
  "Configurações do Quadro" — isso é `020`.
- i18n pt/en: textos do popover ("Etiquetas", "Criar etiqueta", nomes das 7 cores) e chaves de
  erro dos novos endpoints.

## Fora de escopo

- Tela completa de gestão de etiquetas em "Configurações do Quadro" (`020`).
- Prazo, checklist, responsáveis, comentários no cartão (`017`).
- Detalhe do cartão como tela dedicada (`018`).
- Filtros/visões por etiqueta (`019`).
- Reimplementação de sala, presença ou handshake do Socket.IO (já entregues pela `006`).
