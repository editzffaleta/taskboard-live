# Design — 008-cartoes

## Contexto

O módulo `board` já existe (`005`) com os agregados `board`/`membership`, e a `007` adicionou o
agregado `list`. Esta change adiciona o agregado `card` no mesmo módulo. O tempo real (`006`) já
provê a porta `RealtimeEmitter` (interface) e sua implementação sobre o gateway Socket.IO,
registrada e exportada pelo `BoardModule`. Esta change apenas **consome** essa porta — não a
reimplementa.

## Localização no código

```
apps/backend/src/modules/board/
  domain/
    card/
      card.entity.ts
      card.repository.ts          <- porta (interface)
  application/
    card/
      create-card.use-case.ts
      edit-card.use-case.ts
      delete-card.use-case.ts
      move-card.use-case.ts
  infrastructure/
    card/
      card.prisma.repository.ts   <- adapter Prisma da porta acima
  interface/
    card/
      card.controller.ts          <- /boards/:boardId/cards
      dto/
        create-card.dto.ts
        edit-card.dto.ts
        move-card.dto.ts
```

Ajuste os nomes de pasta acima ao padrão real do módulo `board` já existente no repositório
(`domain`/`application`/`infrastructure`/`interface` conforme a Clean Architecture do projeto,
ver `AGENTS.md`). Se as pastas de `list` (`007`) seguirem outra convenção de nomes, siga a mesma
convenção para `card` — consistência dentro do módulo é mais importante que o nome exato aqui.

## Modelo

`Card`: `id`, `listId` (FK → `List`), `title` (string), `description` (text, nullable),
`position` (int), `createdAt`.

Regra de posição: `position` é um inteiro por lista, começando em `0`, sem gaps após qualquer
mutação que afete a ordem (renormalizar sempre que um cartão sai ou entra numa lista).

## Casos de uso

- **`create-card(listId, title)`**: valida que a lista existe e pertence ao quadro; calcula
  `position` como o próximo inteiro disponível no fim da lista (`count` de cartões da lista);
  persiste; retorna o cartão criado.
- **`edit-card(cardId, title, description)`**: valida existência; atualiza `title`/`description`;
  não mexe em `listId`/`position`.
- **`delete-card(cardId)`**: valida existência; remove o cartão; renormaliza as posições dos
  cartões remanescentes da lista de origem (fecha o buraco deixado).
- **`move-card(cardId, toListId, position)`**: valida que o cartão existe e que `toListId`
  pertence ao mesmo quadro do cartão; se `toListId === listId` atual, apenas reordena dentro da
  mesma lista; se for diferente, remove o cartão da lista de origem (renormaliza as posições
  remanescentes da origem) e insere na posição pedida da lista de destino (desloca os cartões
  seguintes da posição pedida em diante, depois renormaliza a lista de destino). Retorna o
  cartão atualizado com `fromListId`/`toListId`/`position`.

Todos os casos de uso recebem repositórios via porta (`CardRepository`, `ListRepository`, nunca
Prisma diretamente) — testáveis com fakes em memória.

## Endpoints e autorização

Sob `/boards/:boardId/cards`, protegidos pelo guard de autenticação JWT global (`004`) e pela
checagem de membership do quadro (reaproveitar o guard/estratégia de autorização por
`BoardMember` introduzida na `005` — qualquer membro pode mutar cartões, não apenas o owner):

- `POST /boards/:boardId/cards` `{listId, title}` → `create-card`.
- `PATCH /boards/:boardId/cards/:id` `{title?, description?}` → `edit-card`.
- `DELETE /boards/:boardId/cards/:id` → `delete-card`.
- `PATCH /boards/:boardId/cards/:id/move` `{toListId, position}` → `move-card`.

O controller valida que a lista informada (`listId` na criação, `toListId` no move) pertence ao
`boardId` da rota antes de chamar o caso de uso — cross-board move é rejeitado.

## Tempo real

Após cada caso de uso retornar com sucesso, o controller chama
`RealtimeEmitter.emitToBoard(boardId, event, payload)` (injetada via o provider já registrado
pelo `BoardModule` na `006`):

- `create-card` → `card.created` `{card}`.
- `edit-card` → `card.updated` `{card}`.
- `move-card` → `card.moved` `{cardId, fromListId, toListId, position}`.
- `delete-card` → `card.deleted` `{cardId, listId}`.

O `boardId` usado na emissão é sempre o da rota (`:boardId`), já validado pelo guard de
membership — não é necessário resolver o `boardId` a partir da lista em memória, pois a rota já
o traz.

## Fora de escopo

- UI de drag-and-drop e renderização dos cartões no quadro (`009`).
- Registro de atividade/auditoria dos eventos de cartão (`011`).
- Reimplementação de sala, presença ou handshake do Socket.IO (já entregues pela `006`).
