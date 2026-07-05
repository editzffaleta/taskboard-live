# Design — 009-quadro-ao-vivo-ui

## Contexto e decisão principal

Este é o trilho da tela vitrine do TaskBoard Live. Ele é **autossuficiente**: qualquer detalhe de
API que este documento não citar deve ser tratado como "descobrir lendo o controller/DTO real do
backend no momento da execução" — não como motivo para abrir outras changes ou o repositório
inteiro. Se algo aqui parecer incompleto, é defeito deste `design.md`: pare e corrija-o antes de
prosseguir com a execução.

## Por que `@hello-pangea/dnd`

`react-beautiful-dnd` (Atlassian) está sem manutenção ativa desde 2023. `@hello-pangea/dnd` é o
fork mantido pela comunidade, com a **mesma API** (`DragDropContext`, `Droppable`, `Draggable`),
suporte a React 18/19 e correções de bugs que o original nunca recebeu. Escolhido em vez de
alternativas mais novas (`dnd-kit`, `@atlaskit/pragmatic-drag-and-drop`) porque:
- API declarativa madura, ideal para o padrão "lista de listas de cartões" do kanban.
- Menor superfície de código para implementar reordenação em duas dimensões (cartão dentro da
  lista + lista dentro do quadro) com poucos hooks/handlers.
- Documentação e exemplos de kanban board prontos, reduzindo risco de erro de um modelo executor
  mais fraco.

## Estrutura de arquivos

```
apps/frontend/src/app/(private)/boards/[id]/
  page.tsx                      # Server/Client boundary: busca dados iniciais, monta BoardView
  board-view.tsx                # 'use client' — estado do quadro, DragDropContext, orquestra tudo
  components/
    board-column.tsx            # Uma coluna (List): título inline, cartões, botão "novo cartão"
    board-card.tsx               # Um cartão (Card): título/descrição inline, excluir
    board-presence.tsx           # Avatares/iniciais de quem está vendo o quadro
    board-toolbar.tsx            # Cabeçalho do quadro: nome, botão "nova lista"
apps/frontend/src/hooks/
  use-board-socket.ts           # Hook do cliente Socket.IO
apps/frontend/src/lib/
  boards-api.ts                 # Funções fetch para /boards, /lists, /cards (se já não existir
                                 # de 005/007/008 — reaproveitar se existir, não duplicar)
```

Se `apps/frontend/src/lib/boards-api.ts` (ou nome equivalente) já existir das changes `005`/`007`/
`008`, **estenda-o** em vez de criar um arquivo novo — confirme lendo `apps/frontend/src/lib/` no
início da execução (permitido pelo contrato de leitura, é código, não outra change).

## Modelo de dados no cliente (estado local da página)

```ts
type BoardState = {
  id: string;
  name: string;
  lists: ListState[];
};

type ListState = {
  id: string;
  title: string;
  position: number;
  cards: CardState[];
};

type CardState = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
};
```

`board-view.tsx` mantém `BoardState` em `useState`, derivado do fetch inicial de `page.tsx` (passado
como prop `initialBoard`). Todas as mutações — locais (drag) ou remotas (socket) — passam por
funções puras de reducer-like (`applyCardMoved`, `applyListMoved`, `applyCardCreated`, etc.) para
evitar duplicação de lógica de reconciliação entre origem otimista e origem socket.

## Carregamento inicial (REST)

`page.tsx` é um Server Component que busca, em paralelo:
- `GET /boards/:id` — dados do quadro (nome, id, papel do usuário atual se o endpoint devolver).
- Endpoint de listas com cartões aninhados, se `007`/`008` expuserem `GET /boards/:id` já com
  `lists` e `cards` embutidos (comum em specs de kanban) — **confirmar isso lendo o controller do
  backend no início da execução**; se não vier aninhado, buscar `GET /boards/:id/lists` e depois
  `GET /lists/:id/cards` para cada lista (ou o endpoint equivalente que a `007`/`008` exponham).

Cabeçalho de autenticação: usar o mesmo mecanismo já estabelecido pelo `AuthContext`/cliente HTTP
das changes anteriores (cookie `auth_token` enviado automaticamente pelo fetch com
`credentials: 'include'`, ou wrapper existente em `lib/`). Não reimplementar autenticação aqui.

Falha ao carregar (404/403) → renderizar estado de erro simples com link de volta ao dashboard.

## Drag-and-drop: fluxo otimista

`board-view.tsx` envolve tudo em `<DragDropContext onDragEnd={handleDragEnd}>`. Duas categorias de
`Droppable`:
1. Um `Droppable droppableId="board" direction="horizontal" type="LIST"` envolvendo as colunas —
   trata reordenação de listas.
2. Cada coluna é um `Droppable droppableId={list.id} type="CARD"` — trata mover/reordenar cartões.

`handleDragEnd(result)`:
- Se `result.type === 'LIST'`: recalcula a ordem local das listas (`reorder` array), atualiza
  `BoardState.lists` imediatamente (otimista), depois chama
  `PATCH /lists/:id/move { position: novaPosicao }` (ajustar payload exato ao DTO real do backend
  na execução — se o backend usar índice 0-based contíguo ou campo `position` numérico, seguir o
  que `007` implementou). Em caso de erro na chamada: reverter para o snapshot anterior guardado em
  uma ref e mostrar toast de erro.
- Se `result.type === 'CARD'`: recalcula a lista de origem e destino localmente (remove o cartão da
  lista de origem, insere na lista de destino na posição do drop), atualiza `BoardState`
  imediatamente, depois chama `PATCH /cards/:id/move { toListId, position }` (novamente, confirmar o
  payload exato do DTO da `008` na execução). Erro → reverter snapshot e toast.

Padrão de reversão: antes de aplicar a mutação otimista, guardar `structuredClone(boardState)` (ou
equivalente) em uma ref; se a chamada REST falhar, `setBoardState(snapshotRef.current)`.

## Reconciliação com eventos de Socket.IO

Como o próprio usuário já aplicou sua mudança otimisticamente **antes** de o servidor emitir o
evento de volta, o hook precisa evitar duplicar a aplicação. Estratégia: cada mutação otimista
gera um `clientMutationId` (uuid) enviado como parte do payload REST (se o backend ecoar esse id no
evento emitido) OU, mais simples e robusto quando o backend não suporta correlação, os handlers de
evento no cliente são **idempotentes por construção**: `applyCardMoved(state, event)` sempre
recoloca o cartão `event.cardId` na lista/posição informada, então reaplicar o mesmo evento que o
próprio usuário já originou é um no-op (mesmo estado final). Preferir esta segunda estratégia —
não requer mudança no backend das changes `006`/`007`/`008`.

Eventos e handlers no `board-view.tsx` (registrados via callbacks passados a `useBoardSocket`):
- `card.created` → insere o cartão na lista indicada (se ainda não existir localmente por id).
- `card.updated` → atualiza título/descrição do cartão pelo id.
- `card.moved {cardId, fromListId, toListId, position}` → remove de `fromListId`, insere em
  `toListId` na `position`; idempotente mesmo se já aplicado otimisticamente.
- `card.deleted` → remove o cartão do estado pelo id.
- `list.created` → insere a lista.
- `list.updated` → atualiza o título da lista.
- `list.moved` → reordena as listas pela nova posição.
- `list.deleted` → remove a lista (e seus cartões) do estado.
- `member.added` → gancho reservado para a `010`: apenas repassar o payload para um callback opcional
  `onMemberAdded?` (no-op por padrão nesta change, sem UI própria).
- `presence.update {boardId, users}` → atualiza o estado de presença (lista de usuários vendo o
  quadro), consumido por `board-presence.tsx`.

## Hook `useBoardSocket(boardId)`

```ts
// apps/frontend/src/hooks/use-board-socket.ts
type BoardSocketHandlers = {
  onCardCreated?: (payload: CardEventPayload) => void;
  onCardUpdated?: (payload: CardEventPayload) => void;
  onCardMoved?: (payload: CardMovedPayload) => void;
  onCardDeleted?: (payload: { cardId: string }) => void;
  onListCreated?: (payload: ListEventPayload) => void;
  onListUpdated?: (payload: ListEventPayload) => void;
  onListMoved?: (payload: ListMovedPayload) => void;
  onListDeleted?: (payload: { listId: string }) => void;
  onMemberAdded?: (payload: unknown) => void;      // gancho para 010
  onPresenceUpdate?: (payload: PresencePayload) => void;
  onActivityAppended?: (payload: unknown) => void; // gancho reservado para 011 (evento futuro,
                                                    // não emitido por nenhuma change atual — apenas
                                                    // registrar o listener condicionalmente se o
                                                    // handler for passado, sem quebrar se o evento
                                                    // nunca chegar)
};

function useBoardSocket(boardId: string, handlers: BoardSocketHandlers): { connected: boolean };
```

Implementação:
- Cria o socket uma vez por `boardId` com `io(NEXT_PUBLIC_API_URL, { auth: { token } })`. O token é
  obtido do mesmo lugar em que o `AuthContext` (`004`) já expõe o JWT no cliente (ex.: contexto de
  auth ou leitura do cookie nao-httpOnly, conforme o que `004` implementou — checar na execução).
  Se o `AuthContext` não expuser o token diretamente porque o cookie é `httpOnly`, usar a
  alternativa que `006` já definiu para o handshake do frontend (o `design.md` de `006` é uma
  change de infraestrutura backend-only; se nenhum mecanismo de exposição do token existir ainda,
  criar um endpoint mínimo ou expor o token via um contexto client-side já populado no login — essa
  decisão fica documentada como nota de execução no `EXECUTION-LOG.md`, não bloqueia a change).
- `useEffect` na montagem: conecta, registra listeners para cada evento, emite `board:join
  { boardId }`. Na desmontagem ou troca de `boardId`: emite `board:leave { boardId }` e
  `socket.disconnect()`.
- Reconexão: escuta `connect` (reemite `board:join` se `wasConnectedBefore`), `disconnect` (marca
  `connected=false`), `connect_error` (loga e mantém tentativa automática do próprio
  `socket.io-client`, que já faz retry com backoff por padrão — não implementar retry manual).
- Retorna `{ connected }` para a UI mostrar um indicador discreto de status de conexão (ex.: no
  `board-toolbar.tsx`).

## CRUD inline de listas e cartões

- **Nova lista**: botão no fim das colunas abre um input inline; `onSubmit` chama
  `POST /lists` (ou `POST /boards/:id/lists`, conforme o que `007` expuser) com `{ boardId, title }`
  e insere a lista otimisticamente com um id temporário, substituído pelo id real na resposta (ou
  pelo evento `list.created` de volta, o que chegar primeiro — idempotente pelo mesmo princípio).
- **Renomear lista/cartão**: título vira `<input>` ao clicar; `onBlur`/Enter chama `PATCH /lists/:id`
  ou `PATCH /cards/:id` com o novo título; atualiza otimisticamente, reverte em erro.
- **Excluir lista/cartão**: botão com confirmação simples (não modal pesado); chama `DELETE
  /lists/:id` ou `DELETE /cards/:id`; remove otimisticamente, reverte em erro.
- **Novo cartão**: input no fim da coluna; `POST /cards` com `{ listId, title }`.

Ajustar o path exato de cada endpoint (`/lists` vs `/boards/:id/lists`, etc.) ao que os controllers
de `007`/`008` realmente expõem — ler os controllers na execução é permitido pelo contrato (são
"arquivos de código" que este `design.md` cita nominalmente para esse fim).

## Presença (`board-presence.tsx`)

Recebe `users: {id, name}[]` do estado de presença mantido em `board-view.tsx` (atualizado por
`onPresenceUpdate`). Renderiza até 5 iniciais/avatares sobrepostos + contador "+N" se houver mais.
Sem clique/interação nesta change — é só leitura visual.

## Pontos de extensão para `010` e `011`

- `useBoardSocket` já expõe `onMemberAdded` e `onActivityAppended` como handlers opcionais vazios —
  `010` e `011` apenas passam implementações reais sem tocar no hook.
- `board-view.tsx` reserva um `<aside>` comentado (`{/* painel de membros/atividade — 010/011 */}`)
  ao lado do quadro, para que as changes seguintes insiram seus painéis sem reestruturar o layout.
- O estado `BoardState` não inclui membros nem atividade — cada change futura gerencia seu próprio
  estado local, evitando acoplamento.

## Tratamento de erros e loading

- Fetch inicial: estado `loading`/`error` simples em `page.tsx`/`board-view.tsx`.
- Mutações REST (drag, CRUD inline): erro reverte o estado otimista e dispara um toast (reaproveitar
  o sistema de toast já existente em `shared/`, se houver — checar em `apps/frontend/src/shared/`
  antes de criar um novo).
- Desconexão do socket: indicador visual discreto (ex.: badge "reconectando..." no toolbar) — nunca
  bloqueia a interação com o quadro (REST continua funcionando mesmo com o socket caído).

## Fora de escopo (lembrete)

Nenhum código de backend, nenhuma gestão de membros além da presença de leitura, nenhum feed de
atividade. Este design apenas deixa os ganchos descritos acima para que `010` e `011` os preencham.
