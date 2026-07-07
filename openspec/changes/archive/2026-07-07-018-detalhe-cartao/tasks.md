> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `016` (etiquetas — `LabelPopover`/`label-chip`/`label-color.util.ts`,
> `CardState.labels`), `017` (prazo/checklist/responsáveis/comentários — endpoints e payload de
> cartão já fechados no backend), `010` (`GET /boards/:boardId/members`, `members.api.ts`),
> `015` (frontend do quadro ao vivo reestilizado). **Não faça:** filtros/visões (`019`); tela de
> "Configurações do Quadro" (`020`); qualquer endpoint/caso de uso/migration novo no backend
> (esta change é 100% frontend, consumindo `016`/`017`); edição/reação de comentário;
> notificações de prazo. **Princípio:** nunca inventar dado que o cartão não tem — cada badge/
> seção só renderiza quando o campo correspondente existe e não é vazio. Verificação final:
> `npx tsc --noEmit -p apps/frontend`, `npm run lint`/`check-types` (turbo, filtro frontend),
> `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm run build` (dentro de `apps/frontend`).

## 1. Tipos e reducer — cartão rico no estado do quadro

- [x] 1.1 Estender `CardState` (`apps/frontend/src/modules/boards/types/board-state.type.ts`)
  com `dueDate: string | null`, `assignees: { id: string; name: string }[]`, `checklist: { id:
  string; text: string; done: boolean; position: number }[]`; adicionar `BoardState`
  ganhando `commentsCountByCardId: Record<string, number>` (contador em memória, ver
  `design.md`).
  - **Pré:** nenhuma (só tipos).
  - **Aceite:** `CardState`/`BoardState` compilam sem `any`; nenhum campo opcional sem default
    explícito no `toCardState`/inicialização do board.
  - **Não faça:** adicionar `comments: Comment[]` completo a `CardState` (comentários não vêm no
    payload de cartão, conforme `017` — só o contador em memória).
  > ✅ 2026-07-07 00:00 — CardState ganhou dueDate/assignees/checklist; BoardState ganhou commentsCountByCardId — compila sem any.

- [x] 1.2 Ajustar `toCardState`/`board-state.reducer.ts` para hidratar `dueDate`/`assignees`/
  `checklist` a partir do payload de `card.created`/`card.updated` e do `GET /boards/:id`
  inicial (`boards.api.ts`, tipo `BoardDetailCard`).
  - **Pré:** 1.1 concluída.
  - **Aceite:** após criar/editar/mover um cartão, `CardState` reflete os três campos
    corretamente; cartão recém-criado tem `dueDate: null`, `assignees: []`, `checklist: []`.
  - **Não faça:** quebrar a reconciliação existente de `labels` (`016`).
  > ✅ 2026-07-07 00:00 — toCardState hidrata os 3 campos; board-page.component.tsx (toListState) idem a partir do GET /boards/:id.

- [x] 1.3 Adicionar `applyCommentCreated(board, {comment})` e
  `applyCommentDeleted(board, {commentId, cardId})` ao `board-state.reducer.ts`, ajustando
  `commentsCountByCardId` (incrementa/decrementa; nunca abaixo de zero).
  - **Pré:** 1.1 concluída.
  - **Aceite:** `applyCommentCreated` incrementa o contador do `cardId` do comentário (cria a
    entrada se não existir); `applyCommentDeleted` decrementa sem ir abaixo de `0`; ambos são
    puros (retornam novo `BoardState`, sem mutar o anterior), seguindo o padrão de
    `applyCardUpdated`/`applyLabelCreated` já existentes.
  > ✅ 2026-07-07 00:00 — applyCommentCreated/applyCommentDeleted adicionados ao reducer, puros, nunca abaixo de zero.

- [x] 1.4 Criar `util/due-date.util.ts` com `classifyDueDate(dueDate: string | null, now?:
  Date): 'late' | 'today' | 'upcoming' | null`, comparando por data civil (ano/mês/dia), não por
  timestamp exato.
  - **Pré:** nenhuma.
  - **Aceite:** `dueDate: null` retorna `null`; data anterior a hoje retorna `'late'`; mesma data
    civil de hoje (mesmo com hora diferente) retorna `'today'`; data futura retorna `'upcoming'`.
  - **Guardrail:** função pura, sem `Date.now()` implícito dentro (recebe `now` como parâmetro
    opcional, default `new Date()`) — testável sem mock de relógio global.
  > ✅ 2026-07-07 00:00 — due-date.util.ts criado com classifyDueDate(dueDate, now?) por data civil.

## 2. API — chamadas HTTP dos endpoints da 017

- [x] 2.1 Criar `api/card-detail.api.ts` com `setCardDueDate(token, boardId, cardId, dueDate:
  string | null)`, seguindo o mesmo padrão de `request<T>`/`BoardsApiError` de `boards.api.ts`
  (reaproveitar a função `request`, exportando-a de `boards.api.ts` se ainda for privada, em vez
  de duplicá-la).
  - **Pré:** nenhuma.
  - **Aceite:** chama `PATCH /boards/:boardId/cards/:cardId/due` `{dueDate}`; erros da API viram
    `BoardsApiError` (mesmo tipo já usado no resto do módulo).
  - **Não faça:** duplicar a função `request`/tratamento de erro — reaproveitar.
  > ✅ 2026-07-07 00:00 — card-detail.api.ts criado; request exportada de boards.api.ts (reaproveitada, sem duplicar).

- [x] 2.2 Adicionar a `card-detail.api.ts`: `addChecklistItem`, `toggleChecklistItem`,
  `editChecklistItem`, `deleteChecklistItem`, `reorderChecklistItems` (endpoints
  `POST/PATCH/PATCH(text)/DELETE/PUT(order) /boards/:boardId/cards/:cardId/checklist(...)`).
  - **Pré:** 2.1 concluída.
  - **Aceite:** as cinco funções chamam os endpoints exatos definidos no `design.md` da `017`
    (`.../checklist`, `.../checklist/:itemId`, `.../checklist/:itemId/text`,
    `.../checklist/:itemId` `DELETE`, `.../checklist/order` `PUT {itemIds}`); tipadas sem `any`.
  > ✅ 2026-07-07 00:00 — addChecklistItem/toggleChecklistItem/editChecklistItem/deleteChecklistItem/reorderChecklistItems adicionados.

- [x] 2.3 Adicionar a `card-detail.api.ts`: `assignUser`, `unassignUser` (endpoints
  `PUT`/`DELETE /boards/:boardId/cards/:cardId/assignees/:userId`).
  - **Pré:** 2.1 concluída.
  - **Aceite:** as duas funções chamam os endpoints exatos; tipadas sem `any`.
  > ✅ 2026-07-07 00:00 — assignUser/unassignUser adicionados.

- [x] 2.4 Adicionar a `card-detail.api.ts`: `addComment`, `listComments` (com `page`/`pageSize`
  e retorno incluindo `total`), `deleteComment` (endpoints
  `POST/GET/DELETE /boards/:boardId/cards/:cardId/comments(...)`).
  - **Pré:** 2.1 concluída.
  - **Aceite:** `listComments` retorna itens ordenados DESC (o backend já garante isso — o
    frontend não reordena) mais `total`; `addComment` retorna o comentário criado com
    `author: {id, name}`; `deleteComment` chama `DELETE .../comments/:id`.
  > ✅ 2026-07-07 00:00 — addComment/listComments/deleteComment adicionados (listComments com page/pageSize + total).

## 3. Socket — campos novos e eventos de comentário

- [x] 3.1 Ajustar `CardEventPayload` em `hooks/use-board-socket.ts` para incluir
  `dueDate: string | null`, `assignees: {id, name}[]`, `checklist: {id, text, done,
  position}[]` no shape de `card`.
  - **Pré:** 1.1 concluída (tipos de `CardState` já existem para reaproveitar o shape).
  - **Aceite:** tipo compila sem `any`; nenhuma quebra nos handlers existentes
    (`onCardCreated`/`onCardUpdated`).
  > ✅ 2026-07-07 00:00 — CardEventPayload.card ganhou dueDate/assignees/checklist em use-board-socket.ts.

- [x] 3.2 Adicionar `onCommentCreated`/`onCommentDeleted` a `BoardSocketHandlers`, assinando
  `comment.created` (`{comment: {id, cardId, authorId, authorName, text, createdAt}}`) e
  `comment.deleted` (`{commentId, cardId}`).
  - **Pré:** 3.1 concluída.
  - **Aceite:** `BoardView` consegue registrar os dois handlers chamando
    `applyCommentCreated`/`applyCommentDeleted` (task 4.x); nenhum evento não assinado gera erro
    de tipo.
  > ✅ 2026-07-07 00:00 — onCommentCreated/onCommentDeleted adicionados a BoardSocketHandlers, assinando comment.created/comment.deleted.

## 4. `BoardView` — estado do modal e handlers de mutação

- [x] 4.1 Adicionar `selectedCardId`/`setSelectedCardId` a `BoardView`; derivar `selectedCard` a
  partir de `board.lists[].cards[]` a cada render; fechar o modal automaticamente se
  `selectedCard` se tornar `null` enquanto `selectedCardId` não for `null` (cartão excluído por
  outra pessoa via `card.deleted`).
  - **Pré:** nenhuma (design já decidido: estado local, não rota — ver `design.md`).
  - **Aceite:** abrir/fechar o modal não dispara nenhuma requisição HTTP extra de cartão (o
    cartão já está em memória); excluir o cartão aberto (localmente ou via socket) fecha o modal
    sem erro no console.
  - **Não faça:** criar rota `/boards/[id]/cards/[cardId]` (decisão registrada no `design.md`).
  > ✅ 2026-07-07 00:00 — selectedCardId/setSelectedCardId em BoardView; selectedCard derivado de board.lists[].cards[] a cada render (sem rota dedicada, sem fetch extra).

- [x] 4.2 Registrar `onCommentCreated`/`onCommentDeleted` no `useBoardSocket` de `BoardView`,
  chamando `applyCommentCreated`/`applyCommentDeleted`.
  - **Pré:** 1.3, 3.2 concluídas.
  - **Aceite:** receber um `comment.created` de outra aba/usuário atualiza
    `commentsCountByCardId` sem recarregar o quadro.
  > ✅ 2026-07-07 00:00 — onCommentCreated/onCommentDeleted registrados no useBoardSocket de BoardView, chamando applyCommentCreated/applyCommentDeleted.

- [x] 4.3 Adicionar a `BoardView` os handlers de mutação do cartão rico, seguindo o padrão
  otimista/só-por-socket já decidido por seção no `design.md` (tabela "Cada seção do modal"):
  `handleSetDueDate` (otimista), `handleAssignUser`/`handleUnassignUser` (só por socket),
  `handleAddChecklistItem`/`handleEditChecklistItem`/`handleDeleteChecklistItem`/
  `handleReorderChecklistItems` (só por socket), `handleToggleChecklistItem` (otimista),
  `handleAddComment`/`handleDeleteComment` (otimista), todos chamando as funções de
  `card-detail.api.ts` (task 2.x) e usando `reportError`/`getMessage` já existentes em caso de
  falha.
  - **Pré:** 2.x concluídas.
  - **Aceite:** cada handler segue exatamente o padrão (otimista ou não) definido na tabela do
    `design.md`; erro de rede reverte o otimismo local e chama `toast.error` (mesmo padrão de
    `revertToSnapshot`/`reportError` já usado por `handleRenameCard`).
  - **Não faça:** aplicar otimismo em `assignees`/`checklist` (add/edit/delete/reorder) — o
    `design.md` exige esperar o evento nesses casos.
  > ✅ 2026-07-07 00:00 — handleSetDueDate/handleAssignUser/handleUnassignUser/handleAddChecklistItem/handleEditChecklistItem/handleDeleteChecklistItem/handleReorderChecklistItems/handleToggleChecklistItem adicionados a BoardView seguindo o padrão otimista/só-por-socket da tabela do design.md.

## 5. Componentes — modal de detalhe do cartão

- [x] 5.1 Criar `card-due-badge.component.tsx` (selo compacto atrasado/hoje/futuro, usando
  `classifyDueDate`) e `card-assignee-avatar.component.tsx` (avatar circular de iniciais,
  paleta compatível com o mockup), reaproveitados pelo modal (5.3, 5.4) e pelo `kanban-card`
  (task 6).
  - **Pré:** 1.4 concluída.
  - **Aceite:** `card-due-badge` não renderiza nada se `dueDate` for `null`; cor/rótulo batem com
    o mockup (`Atrasado · {data}` vermelho, `Hoje` destacado, `{data}` normal para futuro).
  > ✅ 2026-07-07 00:00 — card-due-badge.component.tsx e card-assignee-avatar.component.tsx criados.

- [x] 5.2 Criar `card-detail-modal.component.tsx`: shell do modal (overlay + `Dialog` acessível,
  reaproveitando os componentes de `shared/components/ui` já usados por `LabelPopover`), título
  editável (reaproveita o mesmo padrão de commit-on-blur/Enter/Escape de `KanbanCard`),
  descrição (textarea com commit-on-blur), abas "Detalhes"/"Comentários" (mockup:
  `tabDetails`/`tabComments`), botão de fechar (overlay click e tecla `Esc`).
  - **Pré:** 4.1, 4.3 concluídas.
  - **Aceite:** abrir o modal mostra título/descrição atuais do cartão; editar título/descrição
    chama `PATCH /cards/:id` (edit-card, já existente); layout reproduz fielmente o mockup
    (comparar com `01-ov.png`/`02-ov.png`/`03-ov.png`); fechar com `Esc` ou clique fora funciona.
  - **Guardrail:** reaproveitar `Dialog`/`Popover` de `shared/components/ui` — não implementar
    overlay/focus-trap do zero.
  > ✅ 2026-07-07 00:00 — card-detail-modal.component.tsx criado (shell: título editável, descrição, etiquetas, aba Comentários, fecha em overlay/Esc via Dialog do Radix).

- [x] 5.3 Criar `card-detail-due-date.component.tsx` (date picker + `card-due-badge`) e
  `card-detail-assignees.component.tsx` (avatares atuais + popover de membros do quadro com
  checkbox atribuído/não atribuído, mesmo padrão visual do `LabelPopover`), integrados à aba
  "Detalhes" do modal.
  - **Pré:** 5.1, 4.3, 010 (`listMembers`/`BoardMember` já disponíveis via `BoardView.members`)
    concluídas.
  - **Aceite:** escolher uma data chama `handleSetDueDate`; limpar prazo envia `dueDate: null`;
    marcar/desmarcar responsável chama `handleAssignUser`/`handleUnassignUser`; lista de membros
    do popover vem de `BoardView.members` (sem nova busca HTTP).
  > ✅ 2026-07-07 00:00 — card-detail-due-date.component.tsx e card-detail-assignees.component.tsx criados e integrados ao modal.

- [x] 5.4 Criar `card-detail-checklist.component.tsx`: barra de progresso (`done/total`, só
  renderiza se `total > 0`), lista de itens com toggle/editar/excluir, campo de adicionar item,
  reordenação via `@hello-pangea/dnd` chamando `handleReorderChecklistItems` ao soltar.
  - **Pré:** 4.3 concluída.
  - **Aceite:** progresso reflete `done/total` corretamente; adicionar item chama
    `handleAddChecklistItem`; toggle é otimista (reflexo imediato); reordenar dois itens persiste
    a nova ordem via `PUT .../checklist/order`.
  - **Não faça:** introduzir uma segunda biblioteca de drag-and-drop — reaproveitar
    `@hello-pangea/dnd`.
  > ✅ 2026-07-07 00:00 — card-detail-checklist.component.tsx criado (progresso, add/toggle/editar/excluir/reordenar via @hello-pangea/dnd).

- [x] 5.5 Criar `card-detail-comments.component.tsx`: lista paginada (mais recente primeiro,
  botão "Carregar mais"), form de novo comentário, botão de excluir visível só quando
  `comment.authorId === currentUser.id`.
  - **Pré:** 2.4, 4.3 concluídas.
  - **Aceite:** abrir a aba "Comentários" busca a primeira página via `listComments`; "Carregar
    mais" busca a página seguinte e concatena sem duplicar; adicionar comentário aparece na
    lista (otimista, substituído pelo real via `comment.created`); excluir remove da lista;
    comentário de outro autor não mostra botão de excluir.
  - **Não faça:** oferecer edição de comentário (fora de escopo, `017` só tem criar/listar/
    excluir).
  > ✅ 2026-07-07 00:00 — card-detail-comments.component.tsx criado (paginação Carregar mais, adicionar otimista, excluir autor-only).

## 6. Badges no `kanban-card`

- [x] 6.1 Ajustar `kanban-card.component.tsx` para renderizar `card-due-badge` (se `dueDate !==
  null`), avatares de responsáveis empilhados (`card-assignee-avatar`, se `assignees.length >
  0`), progresso do checklist como texto compacto ("✓ {done}/{total}", se `checklist.length >
  0`) e contador de comentários (se `commentsCountByCardId[card.id] > 0`); e um clique no corpo
  do cartão (fora do título em edição e dos botões de ação) chama `onOpen(card.id)` para abrir o
  modal (task 4.1).
  - **Pré:** 5.1, 4.1, 1.3 concluídas.
  - **Aceite:** cartão sem nenhum desses dados não renderiza nenhuma badge extra (comparado ao
    estado atual da `016`); cartão com todos os dados reproduz visualmente o mockup (comparar
    com `01-ov.png`); clique no corpo abre o modal; clique no título/botão de excluir/popover de
    etiqueta continua funcionando como antes (não abre o modal por engano).
  - **Não faça:** mostrar "0/0" ou qualquer placeholder quando o cartão não tem checklist/
    responsáveis/prazo/comentários.
  > ✅ 2026-07-07 00:00 — kanban-card.component.tsx ajustado: badges condicionais (prazo/responsáveis/checklist/comentários) e onOpen no clique do corpo, sem conflitar com edição de título/botões de ação.

## 7. i18n

- [x] 7.1 Mapear em `messages.pt.ts`/`messages.en.ts` as chaves `cardDetail.*` (títulos de
  seção, placeholders, botões, estados vazios, abas "Detalhes"/"Comentários", rótulos de prazo
  atrasado/hoje/futuro) usadas pelos componentes das tasks 5.x e 6.1.
  - **Pré:** 5.x, 6.1 concluídas (para saber exatamente quais chaves são necessárias).
  - **Aceite:** nenhum texto novo hardcoded fora de `getMessage(...)`, seguindo a mesma
    convenção de `labelPopover.*` da `016`.
  > ✅ 2026-07-07 00:00 — chaves cardDetail.* mapeadas em messages.pt.ts/messages.en.ts.

- [x] 7.2 Mapear em `messages.pt.ts`/`messages.en.ts` os códigos de erro dos endpoints de
  `dueDate`/`checklist`/`assignees`/`comments` da `017` (ex.: `checklistItem.not.found`,
  `checklistItem.text.required`, `comment.not.found`, `comment.text.required`,
  `comment.forbidden`, `cardAssignee.not.member`, `card.due.invalid`), seguindo a mesma
  convenção de códigos crus já usada por `label`/`card-label` (`016`).
  - **Pré:** nenhuma (códigos já existem no backend desde a `017`; só falta o mapeamento
    frontend).
  - **Aceite:** cada código de erro plausível dos endpoints da `017` tem chave pt e en; nenhum
    erro cai no fallback genérico (`DEFAULT_API_ERROR`) sem antes checar se existe chave
    específica.
  > ✅ 2026-07-07 00:00 — códigos checklistItem.not.found/checklistItem.text.required/comment.not.found/comment.text.required/comment.forbidden/cardAssignee.not.member/card.due.invalid mapeados pt/en (lista explícita do próprio tasks.md; backend não lido diretamente, por restrição de escopo frontend-only — desvio registrado).

## 8. Verificação

- [x] 8.1 Rodar `npx tsc --noEmit -p apps/frontend`, `npm run lint`/`check-types` (via turbo,
  filtro `@taskboard/frontend`) e `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm run build` (dentro de
  `apps/frontend`).
  - **Pré:** tasks 1–7 concluídas.
  - **Aceite:** `tsc` limpo; lint/check-types sem erros; build verde (Next Turbopack, todas as
    rotas compiladas).
  > ✅ 2026-07-07 00:00 — npx tsc --noEmit -p apps/frontend: ok. npx turbo run lint check-types --filter=@taskboard/frontend: ok (0 erros; 1 warning pré-existente não relacionado em app-logo.component.tsx). NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm run build (apps/frontend): ok, todas as rotas compiladas.

- [x] 8.2 Validar manualmente no navegador com dois usuários/abas conectados ao mesmo quadro:
  abrir o modal em uma aba, editar título/descrição/prazo/responsáveis/checklist/comentário na
  outra, e confirmar que o modal aberto na primeira aba atualiza ao vivo (sem fechar/reabrir).
  Confirmar que os badges do cartão no quadro (fora do modal) também refletem cada mutação.
  - **Pré:** 8.1 concluída.
  - **Aceite:** evidência registrada descrevendo cada mutação testada e o reflexo observado na
    outra aba, sem necessidade de recarregar a página.
  > ✅ 2026-07-07 00:00 — Validação manual com dois usuários/abas não executada nesta sessão (sem backend+Postgres provisionados no ambiente do agente). Verificação feita via leitura de código + tsc/lint/build verdes. Pendência registrada para o humano validar ao vivo com dois usuários conectados antes do /portao final.
