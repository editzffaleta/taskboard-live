## Design — 022-arquivados

## Contexto

O módulo `board` já tem os agregados `card` (`008`), `list` (`007`) e `board` (`005`), cada um
com um caso de uso `delete-*` que faz **hard delete** (guard de membro para card/list, guard de
owner para board — ver `delete-card.usecase.ts`, `delete-list.usecase.ts`,
`delete-board.usecase.ts`). `Board` e `BoardMember` já têm uma coluna `deletedAt DateTime?` no
Prisma (`apps/backend/prisma/models/board.model.prisma`), mas ela **não é usada** por nenhum
caso de uso hoje — é herança do `EntityState` base, morta. Esta change **não reaproveita**
`deletedAt`: cria um campo **novo e distinto**, `archivedAt`, com semântica própria
(reversível, some das leituras normais, mas nunca reaproveitado como "excluído"). Não mexe em
`deletedAt`.

`018` (detalhe do cartão) e `020` (configurações do quadro) já previram esta change: `020`
renderiza o botão "Arquivar quadro" desabilitado com `data-testid="board-settings-archive-button"`
e o texto "Em breve" (`board-settings.component.tsx`); `018` deixou "arquivar" **fora de escopo**
sem sequer criar um botão desabilitado (confirmado por leitura de
`card-detail-modal.component.tsx`) — esta change **cria** o botão "Arquivar" no detalhe do
cartão (não apenas o habilita).

## Backend

### Campo `archivedAt`

`archivedAt?: Date | null` adicionado ao `EntityState`-derivado de `Card`, `List` e `Board`
(getters `archivedAt`), seguindo o mesmo padrão de campo opcional já usado por `Card.dueDate`
(`modules/board/src/card/model/card.entity.ts`). Sem regra de `validate()` nova: `archivedAt` não
é um dado de entrada do usuário, é escrito só pelos casos de uso de archive/restore via
`clone({ archivedAt })`.

- `modules/board/src/card/model/card.entity.ts`: `CardState.archivedAt?: Date | null`; getter
  `archivedAt(): Date | null`.
- `modules/board/src/list/model/list.entity.ts`: idem para `ListState`/`List`.
- `modules/board/src/board/model/board.entity.ts`: idem para `BoardState`/`Board` (campo
  **novo**, não confundir com o `deletedAt` já existente e não usado).

### Persistência (migration única)

`apps/backend/prisma/models/{card,list,board}.model.prisma`: adicionar
`archivedAt DateTime?` (sem `@default`, fica `null`) aos três models. Gerar com
`prisma migrate dev --create-only` seguido de `prisma migrate dev` (mesmo procedimento já
documentado nas changes `016`/`020` para não deixar o `--schema` explícito ignorar a pasta
modular). Uma única migration cobre os três models.

**Não faça**: não usar o `deletedAt` já existente em `Board`/`BoardMember`; não adicionar
`archivedAt` a `BoardMember`, `Label`, `Comment`, `ChecklistItem` ou `CardAssignee` — só
`Card`, `List` e `Board` são arquiváveis nesta change.

### Repositórios — leituras existentes passam a filtrar

`PrismaCardRepository.findAllByListId`, `PrismaListRepository.findAllByBoardId` e
`PrismaBoardRepository.findManyByIds` (usado por `list-my-boards`) ganham
`where: { archivedAt: null, ... }` acrescentado ao `where` já existente. `findById` **não**
filtra (precisa continuar enxergando o item arquivado para os casos de uso de restore/archive
funcionarem e para os endpoints de detalhe individual, se necessário) — a exclusão de arquivados
é responsabilidade das listagens, não do `findById`.

Cada repositório ganha três métodos novos (interface + implementação Prisma):

```ts
// card.repository.ts / list.repository.ts / board.repository.ts
archive(id: string, archivedAt: Date): Promise<void>;
restore(id: string): Promise<void>; // seta archivedAt: null
findAllArchivedByBoardId(boardId: string): Promise<Card[] | List[]>; // card/list
findAllArchivedByOwnerId(ownerId: string): Promise<Board[]>; // board
```

Implementação Prisma: `archive` faz `update({ where: { id }, data: { archivedAt } })`;
`restore` faz `update({ where: { id }, data: { archivedAt: null } })`; os `findAllArchived*`
fazem `findMany({ where: { archivedAt: { not: null }, ... } })`.

### Casos de uso (seis, mesmo padrão de `delete-*`)

Cada par `Archive*`/`Restore*` segue **exatamente** a estrutura de validação/guard de
`delete-card.usecase.ts`/`delete-list.usecase.ts`/`delete-board.usecase.ts` (valida UUIDs,
busca a entidade, verifica membership/owner, `NotFoundError`/`DomainError(403)` nos mesmos
pontos), trocando só a mutação final:

- `ArchiveCard`/`RestoreCard` (`modules/board/src/card/usecase/`): guard de **membro do quadro**
  (mesmo de `DeleteCard` — resolve a lista do cartão, confere `boardId`, confere
  `MembershipRepository.findByBoardAndUser`). `RestoreCard` rejeita se o cartão já não está
  arquivado (`DomainError("card.not.archived", 400)`) e `ArchiveCard` rejeita se já está
  arquivado (`DomainError("card.already.archived", 400)`), para idempotência explícita.
- `ArchiveList`/`RestoreList` (`modules/board/src/list/usecase/`): guard de **membro do quadro**
  (mesmo de `DeleteList`), mesmos erros `list.not.archived`/`list.already.archived`.
- `ArchiveBoard`/`RestoreBoard` (`modules/board/src/board/usecase/`): guard de **owner** (mesmo
  de `DeleteBoard` — só o owner arquiva/restaura o próprio quadro, decisão consistente com quem
  pode excluir o quadro), mesmos erros `board.not.archived`/`board.already.archived`.

**Não faça**: arquivar um `List`/`Board` **não** propaga `archivedAt` para seus filhos (cartões
da lista, listas/cartões do quadro) — eles continuam com `archivedAt = null` no banco. Eles ficam
"escondidos" das leituras normais só porque o **pai** já está escondido (o quadro arquivado não
aparece mais em `list-my-boards`, logo suas listas/cartões nunca são buscados; a lista arquivada
não aparece mais em `get-board-detail`, mas seus cartões continuam com `archivedAt: null` — se
o usuário restaurar só a lista, os cartões reaparecem juntos automaticamente, sem qualquer
migração de dados). Isso simplifica a restauração: restaurar o pai basta.

### Endpoints

Adições a `card.controller.ts`, `list.controller.ts`, `board.controller.ts` (mesmo padrão de
injeção/uso dos controllers existentes — `PrismaCardRepository`/`PrismaListRepository`/
`PrismaBoardRepository`/`PrismaMembershipRepository`/`RealtimeEmitterImpl`):

| Rota | Caso de uso | Guard |
|---|---|---|
| `POST /boards/:boardId/cards/:id/archive` | `ArchiveCard` | membro |
| `POST /boards/:boardId/cards/:id/restore` | `RestoreCard` | membro |
| `POST /lists/:id/archive` | `ArchiveList` | membro |
| `POST /lists/:id/restore` | `RestoreList` | membro |
| `POST /boards/:id/archive` | `ArchiveBoard` | owner |
| `POST /boards/:id/restore` | `RestoreBoard` | owner |

Todos retornam `204` sem corpo (mesmo padrão de `DELETE :id` existente) e, em caso de sucesso,
emitem o evento de tempo real (ver seção abaixo) **depois** da mutação — nunca antes, nunca em
erro (mesmo princípio já usado em `020`/`006`).

### Endpoint agregado `GET /archived`

Novo `ArchivedController` (`apps/backend/src/modules/board/archived.controller.ts`),
`@Controller('archived')`, com um único handler `GET /archived`, autenticado. Executa um novo
caso de uso `ListArchivedItems` (`modules/board/src/board/usecase/list-archived-items.usecase.ts`)
que, para o `requesterId`:

1. Busca `membershipRepository.listBoardsByUser(requesterId)` → todos os `boardId` de que o
   usuário é membro (arquivados ou não — a listagem de memberships não filtra por
   `archivedAt` do quadro, `BoardMember` não é tocado por esta change).
2. Separa os boards do usuário em **arquivados** (owned + `archivedAt != null`) e **ativos**.
3. Para cada board **ativo**, busca `findAllArchivedByBoardId` de `list` e de `card` — ou seja,
   listas/cartões arquivados **dentro** de quadros que ainda estão ativos (o caso comum do
   mockup: arquivar um cartão ou lista específica sem arquivar o quadro inteiro).
4. Para boards **arquivados**, **não** desce a buscar listas/cartões internos (ver "Não faça" da
   seção de casos de uso — arquivar o quadro já esconde tudo, evitar ruído duplicado na aba
   "Cartões"/"Listas" da tela).
5. Hidrata cada item com o necessário para o mockup (`board.name`, `list.title`, `archivedAt`):

```ts
interface ArchivedCardItem {
  id: string; title: string; archivedAt: string;
  boardId: string; boardName: string; listId: string; listTitle: string;
}
interface ArchivedListItem {
  id: string; title: string; archivedAt: string;
  boardId: string; boardName: string; cardCount: number;
}
interface ArchivedBoardItem {
  id: string; name: string; archivedAt: string; listCount: number; cardCount: number;
}
interface ListArchivedItemsOut {
  cards: ArchivedCardItem[]; lists: ArchivedListItem[]; boards: ArchivedBoardItem[];
}
```

**Decisão de forma**: um único endpoint agregado (`GET /archived`), em vez de três chamadas por
board (`GET /boards/:boardId/archived` × N boards do usuário) — o mockup mostra uma tela única,
global, com abas e contadores agregados ("Cartões 6 · Listas 2 · Quadros 1"); um agregado
server-side evita N chamadas HTTP do frontend e mantém a contagem consistente em uma única
resposta. **Não criar** `GET /boards/:boardId/archived` como rota separada nesta change — só o
agregado global.

### Tempo real: qual evento usar

**Decisão**: reaproveitar os eventos já existentes de exclusão/criação, em vez de criar
`card.archived`/`card.restored`/`list.archived`/`list.restored`:

- **Arquivar** um cartão emite `card.deleted` `{cardId, listId}` (mesmo payload já usado por
  `DeleteCard`) para `board:{boardId}`. Arquivar uma lista emite `list.deleted` `{listId}`.
  Arquivar um quadro **não emite nada nessa sala** (quem está com o quadro arquivado aberto
  simplesmente perde acesso na próxima ação que passar pelo guard de membership normal do
  quadro ao vivo — arquivar quadro não corta a conexão de socket ativa; é aceitável para esta
  change, sem invalidar sessão de socket em tempo real).
- **Restaurar** um cartão emite `card.created` `{card}` (mesmo payload de `CreateCard`,
  reidratado via `buildCardResponse`) para `board:{boardId}`. Restaurar uma lista emite
  `list.created` com o `ListResponse` completo.

**Por quê**: para qualquer cliente com o quadro aberto ao vivo, o efeito visual de "arquivar" é
idêntico a "sumiu do quadro" e o de "restaurar" é idêntico a "reapareceu no quadro" — os
handlers de `card.deleted`/`card.created`/`list.deleted`/`list.created` já existem no frontend
(`use-board-socket.ts`/`board-state.reducer.ts`, changes `008`/`007`) e não precisam de nenhuma
alteração. Criar eventos novos (`card.archived`) exigiria handlers novos no reducer que fariam
exatamente a mesma coisa que os handlers de `card.deleted` já fazem — duplicação sem ganho.
**Não faça**: não introduzir `*.archived`/`*.restored` como eventos de socket nesta change.

### Autorização — reforço

- Card/List: guard de **membro** (`BoardMember` qualquer role), igual ao guard de
  `delete-card`/`delete-list` — arquivar não é mais restritivo que excluir.
- Board: guard de **owner**, igual ao guard de `delete-board`.
- `GET /archived`: nenhum guard de membership adicional — o próprio caso de uso só enumera
  boards de que o `requesterId` já é membro (via `listBoardsByUser`), então a autorização é
  implícita pela própria consulta.

### i18n de erro (backend)

Códigos crus (mesma convenção de `board.color.in`/`board.owner.required` já usada):
`card.already.archived`, `card.not.archived`, `list.already.archived`, `list.not.archived`,
`board.already.archived`, `board.not.archived`. Sem infraestrutura nova de i18n de domínio.

## Frontend

### Habilitar/criar os botões "Arquivar"

- **Detalhe do cartão** (`018`, `card-detail-modal.component.tsx`): adicionar um botão
  "Arquivar cartão" (não existia nem desabilitado — `018` deixou isso inteiramente fora do
  mockup renderizado) próximo ao título ou no rodapé do painel lateral direito (ao lado de
  responsáveis/prazo), chamando `POST /boards/:boardId/cards/:id/archive` e fechando o modal
  após sucesso (o cartão some do quadro ao vivo via `card.deleted`, já tratado pelo reducer
  existente da `008`).
- **Configurações do quadro** (`020`, `board-settings.component.tsx`): remover o `disabled` e o
  rótulo "Em breve" (`data-testid="board-settings-archive-button"`) do botão "Arquivar quadro"
  na zona de perigo; ao confirmar (reaproveitar o mesmo padrão de diálogo de confirmação já
  usado por "Excluir quadro", task `3.6` da `020`), chama
  `POST /boards/:id/archive` e redireciona para o dashboard (`/boards`), já que o quadro some de
  `list-my-boards`.
- **Cabeçalho da coluna** (`kanban-column.component.tsx`): adicionar a ação "Arquivar lista"
  (novo botão/ícone junto de onde hoje só existe excluir lista), chamando
  `POST /lists/:id/archive`; a lista some do quadro via `list.deleted` (reducer existente).

### Tela Arquivados

Nova rota `apps/frontend/src/app/(private)/archived/page.tsx`, delegando para
`archived-view.component.tsx` (`apps/frontend/src/modules/boards/components/`), reproduzindo
`Arquivados.dc.html`: cabeçalho "Arquivados" + texto informativo de retenção de 90 dias
(estático, sem job de expurgo — ver "Fora de escopo" do `proposal.md`), três abas
(Cartões/Listas/Quadros) com contadores no rótulo da aba, campo de busca (filtro client-side por
`title`/`name`, sem novo parâmetro de API), e por item: nome + contexto (`boardName` ·
`listTitle`/contadores · "arquivado há X"), botão "Restaurar" e ícone "Excluir definitivamente".

- Busca `GET /archived` uma vez ao montar (sem socket — a tela Arquivados não precisa de tempo
  real; se dois usuários arquivam simultaneamente, o próximo `GET /archived` já reflete).
- "Restaurar" chama `POST .../restore` do item (card/list/board conforme a aba) e remove o item
  da lista local após sucesso (sem esperar recarregar `GET /archived` inteiro).
- "Excluir definitivamente" reaproveita o **mesmo** endpoint de hard delete já existente
  (`DELETE /boards/:boardId/cards/:id`, `DELETE /lists/:id`, `DELETE /boards/:id`, `008`/`007`/
  `005`) com o mesmo diálogo de confirmação já usado em `board-settings.component.tsx` (`020`).
- "Formatação de tempo relativo" ("arquivado há 2 dias"): novo util simples
  `relative-time.util.ts` (`apps/frontend/src/shared/util/`) — sem biblioteca nova, cálculo
  manual em dias/semanas a partir de `archivedAt` (ISO) e `Date.now()`.

### Navegação

Item "Arquivados" (ícone `inventory_2` / equivalente `lucide`) na navegação lateral
(`app-sidebar-navigation.component.tsx`, já existente desde `003`/`009`), abaixo de "Meus
quadros", navegando para `/archived`. Visível para qualquer usuário autenticado (a tela em si só
mostra o que é dele via `requesterId` do token).

### i18n

pt/en: título da tela, nomes das três abas, texto de retenção de 90 dias, rótulos de
"Restaurar"/"Excluir definitivamente", texto de confirmação de exclusão definitiva (reaproveitar
padrão de `020`), textos novos dos botões "Arquivar cartão"/"Arquivar lista"/"Arquivar quadro"
(o de quadro já tinha chave de "Em breve" na `020` — reaproveitar/ajustar), chaves de erro novas
do backend (`card.already.archived` etc.).

## Fora de escopo (reforço)

- Job/cron de expurgo automático após 90 dias — texto informativo apenas.
- Arquivamento em cascata explícito de filhos (listas de um quadro arquivado, cartões de uma
  lista arquivada continuam com `archivedAt: null` no banco).
- Eventos de socket novos (`*.archived`/`*.restored`) — reaproveita `*.deleted`/`*.created`.
- `GET /boards/:boardId/archived` como rota própria — só o agregado `GET /archived`.
