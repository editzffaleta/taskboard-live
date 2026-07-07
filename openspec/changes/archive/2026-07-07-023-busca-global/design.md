## Design — 023-busca-global

## Contexto

O módulo `board` já expõe, para cada agregado, os repositórios `BoardRepository`/
`ListRepository`/`CardRepository`/`MembershipRepository` (`modules/board/src/*/provider/*.ts`) e
um endpoint agregado que enumera dados de vários quadros do usuário em uma única resposta:
`GET /archived` (`022`, `apps/backend/src/modules/board/archived.controller.ts` + `ListArchivedItems`,
`modules/board/src/board/usecase/list-archived-items.usecase.ts`). Este é o **modelo direto**
para o endpoint `GET /search`: mesmo padrão de "enumerar boards do usuário via
`membershipRepository.listBoardsByUser`, depois consultar os agregados internos". A diferença é
que a busca filtra por `q` (texto) em vez de por `archivedAt`.

Cards, listas e boards já têm `archivedAt?: Date | null` (`022`) — a busca **reaproveita** esse
campo para excluir arquivados das duas coleções, sem introduzir nenhum conceito novo.

## Backend

### Caso de uso `Search`

Novo `modules/board/src/board/usecase/search.usecase.ts`, mesmo padrão estrutural de
`ListArchivedItems` (guard implícito pela própria consulta — nenhuma autorização adicional além
de "só enumera boards de que o usuário é membro"):

```ts
export interface SearchIn {
  requesterId: string;
  query: string;
}

export interface SearchBoardResult { id: string; name: string; }
export interface SearchCardResult {
  id: string; title: string; boardId: string; boardName: string; listTitle: string;
}
export interface SearchOut {
  boards: SearchBoardResult[];
  cards: SearchCardResult[];
}
```

Fluxo do `execute`:

1. `Validator.validate` para `requesterId` (`RequiredRule`, `UuidRule`) e `query`
   (`RequiredRule`; regra mínima de tamanho — ver "Query mínima" abaixo).
2. `query` normalizada com `.trim()`; se vazia após `trim()`, retorna `{ boards: [], cards: [] }`
   sem consultar nada (evita `contains: ''`, que casaria com tudo).
3. `membershipRepository.listBoardsByUser(requesterId)` → lista de `boardId` de que o usuário é
   membro (mesmo primeiro passo de `ListArchivedItems`).
4. Se não há boards, retorna vazio cedo.
5. `boardRepository.searchByIds(boardIds, query, limit)` → quadros (não arquivados) cujo `name`
   casa com `query` (`contains`, `mode: 'insensitive'`), só dentre os `boardIds` do passo 3.
6. `cardRepository.searchByBoardIds(boardIds, query, limit)` → cartões (não arquivados) cujo
   `title` **ou** `description` casa com `query`, só dentro dos `boardIds` do passo 3; hidrata
   `boardName`/`listTitle` (join com `list`/`board` na própria query Prisma, não em memória).
7. Monta `{ boards, cards }`.

**Não faça**: não iterar quadro a quadro fazendo uma query por `boardId` — as buscas 5/6 usam
`where: { id: { in: boardIds } }`/`where: { list: { boardId: { in: boardIds } } }` em uma única
chamada Prisma cada, exatamente como `findManyByIds` já faz para boards.

### Métodos novos nos repositórios (reaproveitando os existentes)

`BoardRepository` (`modules/board/src/board/provider/board.repository.ts`) ganha:

```ts
searchByIds(ids: string[], query: string, limit: number): Promise<Board[]>;
```

`CardRepository` (`modules/board/src/card/provider/card.repository.ts`) ganha:

```ts
searchByBoardIds(
  boardIds: string[],
  query: string,
  limit: number,
): Promise<{ card: Card; boardId: string; boardName: string; listTitle: string }[]>;
```

Implementação Prisma (`apps/backend/src/modules/board/board.prisma.ts`/`card.prisma.ts`):

```ts
// board.prisma.ts
async searchByIds(ids: string[], query: string, limit: number): Promise<Board[]> {
  const found = await this.prisma.board.findMany({
    where: { id: { in: ids }, archivedAt: null, name: { contains: query, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return found.map((item) => this.toDomain(item));
}

// card.prisma.ts
async searchByBoardIds(boardIds: string[], query: string, limit: number) {
  const found = await this.prisma.card.findMany({
    where: {
      archivedAt: null,
      list: { boardId: { in: boardIds }, archivedAt: null },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: { list: { include: { board: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return found.map((item) => ({
    card: this.toDomain(item),
    boardId: item.list.boardId,
    boardName: item.list.board.name,
    listTitle: item.list.title,
  }));
}
```

**Por quê `contains`/`ILIKE` (via `mode: 'insensitive'`) e não full-text search**: o volume de
dados por usuário é pequeno (dezenas de quadros, centenas de cartões) — um `LIKE` indexável
(considerar índice `gin`/`trigram` é overkill fora de escopo) resolve com latência aceitável.
Introduzir Postgres full-text search (`tsvector`/`to_tsquery`) ou um serviço externo
(Elasticsearch/Algolia) é desproporcional ao problema atual e adicionaria uma migration de schema
e infraestrutura nova — **não fazer** nesta change.

### Limite por grupo

`SEARCH_RESULT_LIMIT = 20` (constante em `search.usecase.ts`), aplicada a `boards` e a `cards`
separadamente — 20 quadros + 20 cartões no máximo por resposta. Documentado aqui porque é a
única "política" arbitrária do endpoint: evita que uma busca genérica (ex.: `q=a`) devolva
centenas de linhas. **Não fazer** paginação (`skip`/`cursor`) — se o usuário precisar refinar,
refina a query de texto, não pagina.

### Query mínima

`query.length < 2` após `trim()` retorna vazio direto no caso de uso (mesma checagem do passo 2
acima, sem round-trip ao banco) — evita `contains: 'a'` varrendo tudo a cada tecla digitada
enquanto o usuário ainda está começando a escrever (a responsabilidade de não disparar buscas
demais a cada tecla também vive no frontend via debounce, ver seção Frontend).

### Endpoint

Novo `SearchController` (`apps/backend/src/modules/board/search.controller.ts`), mesmo padrão de
injeção de `archived.controller.ts` (repositórios Prisma injetados, caso de uso instanciado no
handler):

```ts
@Controller('search')
export class SearchController {
  constructor(
    private readonly boardRepository: PrismaBoardRepository,
    private readonly cardRepository: PrismaCardRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
  ) {}

  @Get()
  async search(
    @CurrentUser('id') requesterId: string,
    @Query('q') q: string,
  ): Promise<SearchOut> {
    const useCase = new Search(
      this.boardRepository,
      this.cardRepository,
      this.membershipRepository,
    );
    return useCase.execute({ requesterId, query: q ?? '' });
  }
}
```

Registrado em `BoardModule` (mesma lista de `controllers` que já tem `ArchivedController`) — sem
provider novo (reaproveita os `Prisma*Repository` já providos pelo módulo).

**Autorização**: nenhum guard de membership explícito adicional — igual a `GET /archived`, a
autorização é implícita: o caso de uso só consulta dentro dos `boardIds` retornados por
`listBoardsByUser(requesterId)`. Um quadro de que o usuário não é membro nunca entra no `where`,
logo nunca aparece no resultado, mesmo que o `name`/`title` case com `q`.

## Frontend

### API (`boards.api.ts`)

Novo tipo e função, mesmo padrão de `listArchivedItems`:

```ts
export type SearchBoardResult = { id: string; name: string };
export type SearchCardResult = {
  id: string; title: string; boardId: string; boardName: string; listTitle: string;
};
export type SearchResult = { boards: SearchBoardResult[]; cards: SearchCardResult[] };

export function search(token: string, query: string): Promise<SearchResult> {
  return request(token, `/search?q=${encodeURIComponent(query)}`);
}
```

### Tela `/search`

Nova rota `apps/frontend/src/app/(private)/search/page.tsx`, delegando para
`search-view.component.tsx` (`apps/frontend/src/modules/boards/components/`), reproduzindo
`Busca Global.dc.html`: campo de busca no topo, chips de filtro **Tudo/Quadros/Cartões**
(client-side, sobre o resultado já carregado — mesmo padrão de filtro client-side de
`archived-view.component.tsx`, sem parâmetro novo de API), resultados agrupados por seção
("Quadros"/"Cartões") com contexto (nome do quadro/lista para cartões). O mockup também mostra
chips "Pessoas"/"Etiqueta"/"Data" e uma seção "Ações rápidas" — **fora de escopo** (ver
`proposal.md`); a tela renderiza só os grupos que o backend suporta (Quadros/Cartões).

- Busca com **debounce de 300ms** na digitação (mesmo padrão de debounce simples usado em
  qualquer input de filtro — `useEffect` com `setTimeout`/`clearTimeout`, sem biblioteca nova).
- Clicar em um quadro navega para `/boards/{boardId}`.
- Clicar em um cartão navega para `/boards/{boardId}?card={cardId}` — pequeno ajuste em
  `board-view.component.tsx` (que já mantém `selectedCardId` em estado local, ver
  `card={selectedCard}` no render) para ler `useSearchParams().get('card')` num efeito de
  montagem e chamar `setSelectedCardId(cardId)` se o card existir no board carregado, abrindo o
  modal de detalhe automaticamente. **Não fazer** nenhuma outra mudança em
  `board-view.component.tsx` além dessa leitura de query param.

### Command palette `⌘K`

Novo componente `command-palette.component.tsx`
(`apps/frontend/src/shared/components/ui/` — componente de shell, não específico do módulo
`board`, mesmo diretório de outros componentes de UI compartilhados como
`delete-confirmation-dialog.tsx`), montado uma única vez em
`apps/frontend/src/app/(private)/layout.tsx` (dentro de `PrivateShell`, ao lado de
`AdminShell`), visível/acionável de qualquer rota privada:

- Listener global de teclado (`useEffect` com `window.addEventListener('keydown', ...)`,
  detecta `(event.metaKey || event.ctrlKey) && event.key === 'k'`, chama
  `event.preventDefault()` e abre o modal). Fecha com `Escape` ou clique fora (reaproveita o
  primitivo de diálogo já usado no projeto, ex. `Dialog` de `shared/components/ui`, mesmo de
  `delete-confirmation-dialog.tsx`).
- Campo de busca interno com o **mesmo debounce de 300ms** e a **mesma função `search()`** da
  tela `/search` (nenhuma duplicação de lógica de fetch — só o componente de UI é diferente).
- Resultados agrupados (Quadros/Cartões), navegação por teclado (setas + Enter, mesmo padrão do
  mockup) opcional/nice-to-have; navegação por clique é obrigatória.
- Selecionar um resultado fecha o modal e navega (mesmas rotas de destino da tela `/search`:
  `/boards/{boardId}` ou `/boards/{boardId}?card={cardId}`).
- Um atalho "Ver todos os resultados" / rodapé "Enter para abrir" pode linkar para `/search?q=...`
  para consultas mais elaboradas — opcional, não bloqueante.

**Por quê um componente próprio em vez de reaproveitar `search-view.component.tsx` dentro do
modal**: o command palette é compacto (lista curta, sem chips de filtro extensos) enquanto a
tela `/search` é a versão completa/agrupada — mesma relação que existe entre um modal de busca
rápida e uma página de resultados em qualquer produto de referência (Linear, Notion). Os dois
consomem a mesma função `search()` de `boards.api.ts`, evitando duplicar a chamada de rede, mas
a apresentação é intencionalmente distinta.

### i18n

pt/en: título da tela `/search`, placeholder do campo, rótulos dos filtros (Tudo/Quadros/
Cartões), texto de "nenhum resultado", rótulo de contexto do cartão (quadro · lista), textos do
command palette (placeholder, dica de atalho `⌘K`/`Ctrl+K`, "esc para fechar").

## Fora de escopo (reforço)

- Full-text search com `tsvector`/Postgres extensions ou motor externo.
- Busca por responsáveis/pessoas, etiquetas ou data (chips do mockup não suportados nesta
  change).
- Paginação/"carregar mais" — limite fixo de 20 por grupo.
- Navegação por teclado completa (setas) no command palette — clique é o caminho obrigatório;
  teclado é nice-to-have.
