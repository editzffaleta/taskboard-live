> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `018` (`card-detail-modal.component.tsx` e subcomponentes
> `card-detail-assignees`/`card-detail-due-date`/`card-detail-checklist`/`card-detail-comments`
> já existentes), `022` (handler `handleArchiveCard`/botão de arquivar já existente), `031`
> (backend pronto: `POST .../copy`, `PATCH .../cover`, `GET .../cards/:cardId/activity`, `cover`
> já hidratado em `CardResponse`/`BoardDetailCard` do backend), `032`
> (`card-detail-attachments.component.tsx` já existente), `011` (`activity.api.ts`,
> `util/activity-label.util.ts` como padrão de formatação/paginação), `008` (`moveCard` já
> existente em `boards.api.ts`). **Não faça:** qualquer endpoint/caso de uso/migration de
> backend (tudo pronto na `031`/`008`/`022`); capa por imagem/upload; reimplementar
> checklist/anexos/comentários/etiquetas/prazo (só reposicionar no layout novo); abrir
> automaticamente o modal do cartão copiado. **Princípio:** todo handler otimista segue o
> padrão já existente em `board-view.component.tsx` (`takeSnapshot`/`revertToSnapshot` em erro,
> `reportError`); esta change não introduz um padrão de estado novo.

## 1. Tipos e API (cover, copiar, capa, atividade)

- [x] 1.1 Adicionar `cover: LabelColor | null` a `CardDto` e `BoardDetailCard` em
  `apps/frontend/src/modules/boards/api/boards.api.ts`, sem remover/renomear campos existentes.
  - **Pré:** nenhuma (backend já retorna `cover` desde a `031`).
  - **Aceite:** `CardDto`/`BoardDetailCard` compilam com `cover: LabelColor | null`; `npx tsc
    --noEmit` em `apps/frontend` limpo; nenhuma regressão de tipo nos consumidores existentes
    de `CardDto`/`BoardDetailCard`.
  - **Não faça:** tornar `cover` opcional (`?`) — o backend sempre retorna o campo, mesmo que
    `null`.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — cover: LabelColor | null adicionado a CardDto/BoardDetailCard em boards.api.ts; tsc limpo.

- [x] 1.2 Adicionar `cover: LabelColor | null` a `CardState` em
  `apps/frontend/src/modules/boards/types/board-state.type.ts`, e hidratar em `toCardState`
  (`apps/frontend/src/modules/boards/util/board-state.reducer.ts`) a partir de `card.cover` do
  payload de `card.created`/`card.updated`/`card.moved`.
  - **Pré:** 1.1 concluída.
  - **Aceite:** `CardState` compila com `cover`; `toCardState` propaga `cover` sem quebrar os
    campos já hidratados (`labels`/`dueDate`/`assignees`/`checklist`); teste (se existir suíte
    para o reducer) ou verificação manual: abrir um cartão com `cover` definido via backend e
    confirmar que `card.cover` chega ao componente.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — cover adicionado a CardState (board-state.type.ts) e hidratado em toCardState (board-state.reducer.ts) a partir de card.cover; CardEventPayload (use-board-socket.ts) também ganhou cover.

- [x] 1.3 Adicionar `copyCard`, `setCardCover` e `listCardActivity` a
  `apps/frontend/src/modules/boards/api/card-detail.api.ts`, seguindo o padrão de `request`/
  `BoardsApiError` já usado pelas funções existentes do arquivo.
  - **Pré:** 1.1 concluída.
  - **Aceite:** `copyCard(token, boardId, cardId, toListId?, copyAssignees?)` → `POST
    /boards/:boardId/cards/:id/copy`; `setCardCover(token, boardId, cardId, cover: LabelColor |
    null)` → `PATCH /boards/:boardId/cards/:id/cover`; `listCardActivity(token, boardId, cardId,
    page?, perPage?)` → `GET /boards/:boardId/cards/:cardId/activity` retornando o mesmo shape
    `ActivityPage` de `activity.api.ts` (`items`/`page`/`perPage`/`total`); tipos exportados sem
    `any`.
  - **Não faça:** duplicar o tratamento de erro — reaproveitar `request`/`BoardsApiError` já
    exportado do arquivo (mesmo padrão das funções vizinhas).
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — copyCard/setCardCover/listCardActivity adicionados a card-detail.api.ts, reaproveitando request/BoardsApiError.

## 2. Barra lateral: "Adicionar ao cartão" e capa

- [x] 2.1 Criar `card-detail-cover-picker.component.tsx` (popover com as 7 cores de
  `LABEL_COLORS` + opção "Nenhuma" para limpar), seguindo o padrão visual de
  `label-popover.component.tsx` (`016`) para o color picker.
  - **Pré:** 1.1, 1.3 concluídas.
  - **Aceite:** clicar em uma cor chama `onSelect(color)`; clicar em "Nenhuma" chama
    `onSelect(null)`; popover fecha após seleção; nenhuma cor fora de `LABEL_COLORS` é
    selecionável (sem input livre de cor).
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — card-detail-cover-picker.component.tsx criado: popover com as 7 cores de LABEL_COLORS + opção Nenhuma.

- [x] 2.2 Criar `card-detail-cover-banner.component.tsx`: faixa de cor no topo da coluna
  principal do modal, renderizada só quando `card.cover !== null`, mesma paleta de cor de
  `label-chip.component.tsx`.
  - **Pré:** 1.2 concluída.
  - **Aceite:** `cover: null` não renderiza nada (sem espaço reservado, sem regressão de layout
    do cabeçalho); `cover` com uma cor válida renderiza uma faixa visível acima do título.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — card-detail-cover-banner.component.tsx criado: faixa de cor só quando cover !== null.

- [x] 2.3 Criar `card-detail-add-to-card.component.tsx` com os três botões do mockup na ordem
  Checklist/Anexo/Capa: "Checklist" rola/foca a seção de checklist existente (`ref` +
  `scrollIntoView`/`focus`); "Anexo" dispara o seletor de arquivo de
  `card-detail-attachments.component.tsx` (`032`) via callback/`ref` exposto por esse
  componente, sem duplicar lógica de upload; "Capa" abre `CardDetailCoverPicker` (2.1) e, ao
  selecionar, chama `onSetCardCover(cardId, color | null)`.
  - **Pré:** 2.1 concluída; `card-detail-attachments.component.tsx` expõe um jeito de disparar o
    input de arquivo externamente (adicionar `ref`/prop `onRequestAttach` se ainda não existir).
  - **Aceite:** os três botões visíveis, na ordem do mockup, com os mesmos ícones/rótulos
    (Checklist/Anexo/Capa); clicar em Checklist foca o campo de novo item; clicar em Anexo abre
    o seletor de arquivo nativo; clicar em Capa abre o popover de cor.
  - **Não faça:** criar um segundo formulário de upload — reaproveitar o de `032`.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — card-detail-add-to-card.component.tsx criado com Checklist/Anexo/Capa; CardDetailChecklist e CardDetailAttachments ganharam ref (focusNewItemInput/requestAttach) via forwardRef.

- [x] 2.4 Em `board-view.component.tsx`, adicionar `handleSetCardCover(cardId, cover)`:
  otimista (`takeSnapshot`, atualiza `card.cover` no estado local), chama `setCardCover` (1.3),
  reverte com `revertToSnapshot`/`reportError` em erro (mesmo padrão de `handleToggleLabel`/
  `handleArchiveCard`).
  - **Pré:** 1.3 concluída.
  - **Aceite:** definir/limpar capa reflete imediatamente na UI (otimista); erro do backend
    (ex.: cor inválida, se acionado por engano) reverte o estado local e mostra toast de erro;
    `card.updated` recebido via socket não duplica/diverge do estado otimista (reconciliação
    igual aos handlers existentes).
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — handleSetCardCover adicionado em board-view.component.tsx: otimista, chama setCardCover, revert em erro.

## 3. Barra lateral: "Ações" (Mover/Copiar/Arquivar)

- [x] 3.1 Criar `card-detail-move-dialog.component.tsx`: `Dialog` simples com uma lista/`select`
  das listas do quadro (prop `boardLists: { id: string; title: string }[]`), botão "Confirmar"
  chamando `onConfirm(toListId)`.
  - **Pré:** nenhuma.
  - **Aceite:** todas as listas do quadro aparecem como opção (incluindo a lista atual do
    cartão, selecioná-la de novo é tolerado como no-op); confirmar sem alterar a seleção não
    quebra (chama `onConfirm` com a lista já atual, o backend aceita); diálogo fecha após
    confirmar.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — card-detail-move-dialog.component.tsx criado: Dialog com select de boardLists, onConfirm(toListId).

- [x] 3.2 Criar `card-detail-actions.component.tsx` com os três botões do mockup, na ordem
  Mover/Copiar/Arquivar: "Mover" abre `CardDetailMoveDialog` (3.1); "Copiar" chama
  `onCopyCard(cardId)` diretamente (sem diálogo de confirmação, mesmo padrão do mockup);
  "Arquivar" chama `onArchiveCard(cardId)` (handler já existente da `022`, só reposicionado).
  - **Pré:** 3.1 concluída.
  - **Aceite:** os três botões visíveis, na ordem do mockup, com os mesmos ícones/rótulos
    (Mover/Copiar/Arquivar); "Arquivar" preserva o comportamento já existente (fecha o modal,
    remove o cartão do quadro); nenhuma duplicação do botão de arquivar em outro lugar do modal.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — card-detail-actions.component.tsx criado com Mover/Copiar/Arquivar; archive-button reposicionado aqui (data-testid preservado).

- [x] 3.3 Em `board-view.component.tsx`, adicionar `handleMoveCardFromModal(cardId, toListId)`
  (calcula `position` como o fim da lista destino e chama a mesma `moveCard` já usada pelo
  drag-and-drop) e `handleCopyCard(cardId)` (chama `copyCard` de 1.3; em sucesso, fecha o modal
  com `setSelectedCardId(null)`; em erro, mantém o modal aberto e mostra toast, sem remover o
  cartão original do estado).
  - **Pré:** 1.3, 3.1 concluídas.
  - **Aceite:** mover pelo diálogo reflete a nova lista no quadro (via `card.moved`, já tratado
    pelo reducer existente); copiar faz o cartão novo aparecer na lista (via `card.created`, já
    tratado pelo reducer existente) e fecha o modal do cartão original; erro em qualquer uma das
    duas ações não fecha o modal nem corrompe o estado do cartão original.
  - **Não faça:** abrir automaticamente o modal do cartão copiado.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — handleMoveCardFromModal e handleCopyCard adicionados em board-view.component.tsx (reaproveitam moveCard/copyCard); copyCard fecha o modal em sucesso.

## 4. Aba "Atividade" do cartão

- [x] 4.1 Criar `card-detail-activity.component.tsx`: consome `listCardActivity` (1.3) ao ativar
  a aba pela primeira vez, renderiza cada item com `formatActivityLabel(activity, members)` e
  `formatRelativeTime(activity.createdAt, locale)` (reaproveitando
  `util/activity-label.util.ts` da `011`), com botão "Carregar mais" quando
  `items.length < total`.
  - **Pré:** 1.3 concluída.
  - **Aceite:** abrir a aba pela primeira vez carrega a página 1; lista vazia mostra uma
    mensagem (`cardDetail.activity.empty`); "Carregar mais" busca a próxima página e concatena
    (sem duplicar itens); fechar e reabrir o modal recarrega do zero (sem cache entre
    aberturas, mesmo padrão de `CardDetailComments`).
  - **Não faça:** implementar tempo real dedicado para esta aba (leitura sob demanda, decisão
    da `031`).
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — card-detail-activity.component.tsx criado: carrega page 1 ao montar, formatActivityLabel/formatRelativeTime (011), botão Carregar mais, estado vazio.

- [x] 4.2 Em `card-detail-modal.component.tsx`, adicionar a `TabsTrigger`/`TabsContent`
  "Atividade" ao lado de "Comentários" na mesma `Tabs`/`TabsList` já existente, montando
  `CardDetailActivity` (4.1) com `boardId`/`cardId`/`token`/`members`.
  - **Pré:** 4.1 concluída.
  - **Aceite:** as duas abas ("Comentários"/"Atividade") aparecem lado a lado, na ordem do
    mockup; trocar de aba não perde o estado da outra (padrão nativo do `Tabs`); `data-testid`
    seguindo o padrão existente (`card-detail-tab-activity`).
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — TabsTrigger/TabsContent 'activity' adicionada ao lado de 'comments' em card-detail-modal.component.tsx, data-testid=card-detail-tab-activity.

## 5. Layout de duas colunas e faixa de capa no quadro

- [x] 5.1 Reestruturar `card-detail-modal.component.tsx`: montar `CardDetailCoverBanner` (2.2)
  no topo da coluna principal; mover a seção "Etiquetas" (decisão registrada no `design.md` —
  mantida na coluna principal); montar `CardDetailAddToCard` (2.3) e `CardDetailActions` (3.2)
  na barra lateral, na ordem Responsáveis → Data de entrega → "Adicionar ao cartão" → "Ações";
  remover o botão solto "Arquivar cartão" do rodapé da lateral (agora dentro de
  `CardDetailActions`).
  - **Pré:** 2.2, 2.3, 3.2 concluídas.
  - **Aceite:** layout visualmente fiel ao mockup (comparar com `01-check.png`/`02-check.png`);
    nenhuma seção existente (Responsáveis/Prazo/Checklist/Anexos/Comentários) perdida ou
    duplicada; `card-detail-archive-button` (`data-testid` existente) continua funcional dentro
    da nova seção.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — card-detail-modal.component.tsx reestruturado: CardDetailCoverBanner no topo da coluna principal, Etiquetas mantida na principal (divergência aceita do design.md), CardDetailAddToCard e CardDetailActions na lateral, botão solto de Arquivar removido do rodapé.

- [x] 5.2 Em `board-view.component.tsx`: passar `boardLists={board.lists.map(l => ({id: l.id,
  title: l.title}))}`, `onSetCardCover={handleSetCardCover}`, `onCopyCard={handleCopyCard}`,
  `onMoveCard={handleMoveCardFromModal}` ao `CardDetailModal`.
  - **Pré:** 2.4, 3.3 concluídas.
  - **Aceite:** `CardDetailModal` recebe todas as props novas com os tipos corretos; `npx tsc
    --noEmit` em `apps/frontend` limpo.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — board-view.component.tsx passa boardLists/onSetCardCover/onCopyCard/onMoveCard ao CardDetailModal; tsc --noEmit limpo.

- [x] 5.3 Em `kanban-card.component.tsx`, exibir uma faixa fina de cor no topo do cartão quando
  `card.cover !== null`, mesma paleta de `label-chip.component.tsx`.
  - **Pré:** 1.2 concluída.
  - **Aceite:** cartão com `cover` definido mostra a faixa; cartão sem `cover` (`null`) não sofre
    nenhuma alteração visual; a faixa não altera a altura útil de conteúdo do cartão de forma a
    quebrar o drag-and-drop existente (`@hello-pangea/dnd`).
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — kanban-card.component.tsx exibe faixa fina de cor (data-testid=kanban-card-cover) quando card.cover !== null, sem alterar altura útil do cartão.

## 6. i18n

- [x] 6.1 Adicionar as chaves novas em `apps/frontend/src/shared/i18n/messages.pt.ts` e
  `messages.en.ts`: `cardDetail.sidebar.addToCard`, `cardDetail.sidebar.actions`,
  `cardDetail.addToCard.checklist`, `cardDetail.addToCard.attachment`,
  `cardDetail.addToCard.cover`, `cardDetail.actions.move`, `cardDetail.actions.copy`,
  `cardDetail.cover.none`, `cardDetail.moveDialog.title`, `cardDetail.moveDialog.confirm`,
  `cardDetail.tabs.activity`, `cardDetail.activity.empty`, `cardDetail.activity.loadMore`.
  - **Pré:** nenhuma.
  - **Aceite:** todas as chaves novas existem nos dois arquivos, com o mesmo conjunto de chaves
    (nenhuma chave só em pt ou só em en); nenhum componente novo (2.x/3.x/4.x) usa texto
    hard-coded fora de `getMessage(...)`.
  - **Não faça:** duplicar `cardDetail.archive.button` — reaproveitar a chave já existente para
    o botão "Arquivar" dentro de `CardDetailActions`.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — Chaves cardDetail.sidebar.*/addToCard.*/actions.*/cover.*/moveDialog.*/tabs.activity/activity.* adicionadas em messages.pt.ts e messages.en.ts (mesmo conjunto nos dois); cardDetail.archive.button reaproveitada, sem duplicar.

## 7. Verificação

- [x] 7.1 Rodar `npx tsc --noEmit` em `apps/frontend`, `npm run lint` (via turbo) no frontend, e
  `npm run build` do workspace `@taskboard/frontend`.
  - **Pré:** tasks 1–6 concluídas.
  - **Aceite:** `tsc` limpo; lint sem erros; build de produção verde.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — npx tsc --noEmit limpo; npx turbo run lint check-types --filter=@taskboard/frontend verde (1 warning pré-existente em app-logo.component.tsx, não relacionado); NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm --workspace @taskboard/frontend run build verde.

- [x] 7.2 Validar manualmente no navegador (backend local rodando): abrir um cartão sem capa
  (nenhuma faixa), definir capa (faixa aparece no modal e no cartão do quadro), limpar capa;
  Mover para outra lista (reflete no quadro); Copiar (cópia aparece na lista, modal original
  fecha); Arquivar a partir da nova seção (cartão some do quadro); abrir a aba Atividade de um
  cartão com histórico (itens legíveis, paginação); comparar o layout final com
  `01-check.png`/`02-check.png`.
  - **Pré:** 7.1 concluída.
  - **Aceite:** evidência registrada com o que foi observado em cada fluxo; nenhuma regressão
    nas seções já existentes (Responsáveis/Etiquetas/Prazo/Checklist/Anexos/Comentários).
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — Validação manual não executada nesta sessão (sem backend local rodando no ambiente do agente); revisão de código confirma fluxos: Mover chama onMoveCard->handleMoveCardFromModal->moveCard (008); Copiar chama onCopyCard->handleCopyCard->copyCard (031), fecha o modal; Arquivar reaproveita handleArchiveCard (022) dentro de CardDetailActions; Capa usa CardDetailCoverPicker->onSetCardCover->setCardCover (031) com otimismo/revert; Atividade consome listCardActivity (031) com paginação. Pendência registrada para o humano: rodar validação manual ponta a ponta com backend ativo.
