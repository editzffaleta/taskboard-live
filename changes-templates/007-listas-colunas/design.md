# Design — 007 Listas (colunas do kanban)

## Arquitetura

O agregado `list` vive dentro do módulo de negócio `board` já criado pela `005`, seguindo a mesma
Clean Architecture + DDD: `domain` (entidade `List`, sem imports de infraestrutura) → `application`
(casos de uso, recebem `ListRepository` e `BoardMemberRepository`/checagem de membership como
*ports*) → `infrastructure` (repositório Prisma) → `interface` (controller HTTP).

```
apps/backend/src/modules/board/
  domain/
    list.entity.ts
  application/
    use-cases/
      create-list.use-case.ts
      rename-list.use-case.ts
      delete-list.use-case.ts
      move-list.use-case.ts
    ports/
      list-repository.port.ts
  infrastructure/
    prisma/
      list.repository.ts
  interface/
    http/
      list.controller.ts
```

Reaproveite os *ports* já existentes do módulo `board` (`005`) para checagem de membership
(`BoardMemberRepository` ou serviço equivalente) — **não** duplique lógica de autorização por
quadro; a checagem "usuário é membro do quadro `boardId`" já existe desde a `005` e deve ser
reutilizada nos quatro casos de uso desta change.

## Entidade `List`

Campos: `id`, `boardId` (FK para `Board`), `title` (string, obrigatório), `position` (inteiro,
define a ordem das colunas no quadro), `createdAt`.

Invariantes de domínio:
- `title` não pode ser vazio.
- `position` é sempre um inteiro não-negativo, atribuído/recalculado pelos casos de uso — nunca
  informado livremente pelo cliente na criação (a criação sempre insere no fim).

## Casos de uso

- **`create-list`**: recebe `boardId`, `title`, `requesterId`. Confere que `requesterId` é membro
  do quadro. Calcula `position` como `max(position das listas do quadro) + 1` (ou `0` se o quadro
  não tiver listas ainda). Persiste via `ListRepository.create`.
- **`rename-list`**: recebe `listId`, `title`, `requesterId`. Carrega a lista, confere membership
  do `boardId` dela, atualiza `title`.
- **`delete-list`**: recebe `listId`, `requesterId`. Confere membership. Exclui a lista **e seus
  cartões** — a exclusão em cascata deve estar declarada na migration Prisma (`onDelete: Cascade`
  no FK `listId` de `Card`, definida quando a `008` criar o model `Card`; nesta change, garanta que
  o `onDelete: Cascade` do FK `boardId` de `List` já cobre a exclusão de listas quando um quadro é
  excluído, e documente no `ListRepository.delete` que a exclusão de cartões da lista é
  responsabilidade da constraint de FK, não de código de aplicação).
- **`move-list`**: recebe `listId`, `newPosition`, `requesterId`. Confere membership. Recalcula a
  `position` de todas as listas do quadro: remove a lista movida da ordem atual, insere na
  `newPosition` solicitada, e renormaliza as posições das demais listas do mesmo quadro em uma
  única operação (transação) para evitar posições duplicadas ou lacunas.

Todos os quatro casos de uso lançam um erro de domínio (mapeado para HTTP 403) quando o
`requesterId` não é membro do quadro, e um erro de "não encontrado" (mapeado para HTTP 404) quando
`listId`/`boardId` não existem.

## Persistência Prisma

Adicionar ao `schema.prisma` (schema modular do módulo `board`, iniciado na `005`):

```prisma
model List {
  id        String   @id @default(uuid())
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  title     String
  position  Int
  createdAt DateTime @default(now())
  cards     Card[]

  @@index([boardId])
}
```

Rodar migration (`npx prisma migrate dev --name add-list`) dentro de `apps/backend`. A relação
`cards Card[]` é declarada aqui como preparação para a `008`, mas o model `Card` em si **não** é
criado nesta change — se o `schema.prisma` ainda não tiver `Card`, omita a linha `cards Card[]` e
deixe para a `008` adicioná-la junto com o model `Card`.

`ListRepository` (porta em `application/ports`) expõe: `create`, `findById`, `findAllByBoardId`
(ordenado por `position`), `update` (título), `updatePositions` (batch, usado pelo `move-list`) e
`delete`. A implementação Prisma vive em `infrastructure/prisma/list.repository.ts` e implementa
essa porta sem vazar tipos do Prisma para os casos de uso.

## Endpoints HTTP

Sob `/boards/:boardId/lists` e `/lists/:id`, todos autenticados (guard JWT global da `004`) e
protegidos por um guard/checagem de membership do quadro (reaproveitar o padrão da `005`):

- `POST /boards/:boardId/lists` — body `{ title }` → `create-list`.
- `PATCH /lists/:id` — body `{ title }` → `rename-list`.
- `DELETE /lists/:id` → `delete-list`.
- `PATCH /lists/:id/move` — body `{ position }` → `move-list`.

O `boardId` necessário para checagem de membership e para o emit do evento em `PATCH`/`DELETE`
`/lists/:id` deve ser resolvido a partir da lista carregada pelo próprio caso de uso (o
controller não recebe `boardId` na URL dessas três rotas).

## Integração com tempo real

Após cada caso de uso retornar com sucesso, o controller injeta a porta `RealtimeEmitter` (`006`,
já registrada/exportada pelo `BoardModule`) e chama:

- `create-list` → `emitToBoard(boardId, 'list.created', listDTO)`
- `rename-list` → `emitToBoard(boardId, 'list.updated', listDTO)`
- `move-list` → `emitToBoard(boardId, 'list.moved', { lists: listasReordenadasDTO })`
- `delete-list` → `emitToBoard(boardId, 'list.deleted', { listId })`

O emit acontece **no controller**, nunca dentro do caso de uso (o caso de uso não conhece
infraestrutura de tempo real — mantém `application` livre de dependências de `interface`).

## Guardrails

- Não criar o agregado `card` nem seus endpoints — isso é escopo da `008`.
- Não criar nenhum componente de frontend/cliente Socket.IO — isso é escopo da `009`.
- Não registrar/gravar atividade do quadro (log de auditoria) — isso é escopo da `011`.
- Não reimplementar checagem de membership do zero: reutilizar o mecanismo já existente desde a
  `005`.
