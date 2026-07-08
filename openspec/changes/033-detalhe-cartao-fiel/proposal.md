> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/detalhe-cartao/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/detalhe-cartao-acoes/spec.md`) ·
> `openspec/changes/033-detalhe-cartao-fiel/mockups/` (`Quadro ao Vivo.dc.html`, PNGs
> `01-check.png`, `02-check.png`) · e, **somente se o `design.md` citar nominalmente**: arquivos
> de código listados, `openspec/templates/`, `openspec/memory/`. **NÃO ler:** o repositório
> inteiro, outras changes, `openspec/changes/archive/`. Faltou contexto? O defeito é do
> `design.md` — pare e corrija o trilho; não abra o contexto. **Ao concluir:** `/portao` verde →
> commit → `/openspec:archive` → atualizar `openspec/EXECUTION-LOG.md` → **zerar o chat** antes
> da próxima change.

## Why

O detalhe do cartão (`018`) já tem título, descrição, etiquetas, prazo, responsáveis, checklist,
comentários e anexos (`032`). O backend das três últimas peças do mockup
(`Quadro ao Vivo.dc.html`) — copiar cartão, capa por cor e atividade filtrada por cartão — foi
entregue pela `031`; mover (`008`) e arquivar (`022`) já existem. O que falta é **só a
montagem da UI**: o mockup mostra, na barra lateral direita do modal, uma seção
**"Adicionar ao cartão"** (Checklist/Anexo/Capa) e uma seção **"Ações"** (Mover/Copiar/Arquivar),
mais uma aba **"Atividade"** ao lado de "Comentários" na coluna principal, e a faixa de **capa**
no topo do modal. Hoje o modal (`card-detail-modal.component.tsx`) tem uma barra lateral parcial
(Responsáveis/Prazo/Arquivar solto) sem essas seções, e não existe UI de Mover/Copiar/Capa/
Atividade. Esta change fecha a lacuna consumindo os endpoints já prontos, sem tocar em backend.

## What Changes

- **Layout de duas colunas fiel ao mockup**: reestruturar `card-detail-modal.component.tsx` —
  coluna principal (título, descrição, etiquetas, checklist, anexos, abas
  Comentários/Atividade) à esquerda; barra lateral (Responsáveis, Etiquetas ou Data de entrega,
  "Adicionar ao cartão", "Ações") à direita, com as seções na ordem do mockup.
- **Seção "Adicionar ao cartão"**: botões Checklist (foca/rola até a seção de checklist já
  existente, abrindo o campo de novo item), Anexo (abre o seletor de arquivo já existente da
  `032`), Capa (abre um popover de seleção de cor da paleta `LABEL_COLORS`, com opção "Nenhuma"
  para limpar — `PATCH /boards/:boardId/cards/:id/cover`).
- **Seção "Ações"**: Mover (diálogo com a lista de listas do quadro para escolher a lista
  destino — `PATCH /boards/:boardId/cards/:id/move`), Copiar (`POST .../copy`, fecha o modal
  após sucesso; o cartão novo chega ao vivo via `card.created`, já tratado pelo reducer
  existente), Arquivar (reaproveita o handler já existente da `022`, apenas reposicionado nesta
  seção).
- **Aba "Atividade"**: nova aba ao lado de "Comentários", consumindo
  `GET /boards/:boardId/cards/:cardId/activity` (paginado), renderizando cada item com texto
  legível (reaproveitando `formatActivityLabel`/`formatRelativeTime` de
  `util/activity-label.util.ts` da `011`) e paginação "carregar mais".
- **Exibição da capa**: faixa de cor no topo do modal quando `card.cover` não for `null`; tipo
  `CardState`/`CardDto`/`BoardDetailCard` no frontend ganham `cover: LabelColor | null` (o
  backend já retorna desde a `031`); o cartão do quadro (`kanban-card.component.tsx`) também
  exibe a faixa de capa, se fizer sentido visualmente no mockup do quadro.
- **i18n pt/en** dos textos novos: "Ações", "Adicionar ao cartão", "Mover", "Copiar", "Capa",
  "Atividade", "Nenhuma" (limpar capa), mensagens do diálogo de Mover.

## Fora de escopo (limite explícito)

- Qualquer endpoint novo de backend — copiar (`031`), capa (`031`), atividade por cartão (`031`),
  mover (`008`), arquivar (`022`) já existem; esta change só consome.
- Capa por imagem/upload — decisão da `031`, capa é só cor.
- Reimplementar checklist, anexos, comentários, responsáveis, etiquetas, prazo — já existem
  (`017`/`018`/`032`), apenas reposicionados no novo layout.

## Capabilities

### New Capabilities
- `detalhe-cartao-acoes`: montagem de UI (só frontend) do detalhe do cartão fiel ao mockup —
  barra lateral direita com seções "Adicionar ao cartão" (Checklist/Anexo/Capa) e "Ações"
  (Mover/Copiar/Arquivar), aba "Atividade" do cartão, e exibição da faixa de capa, consumindo os
  endpoints já entregues por `008`/`022`/`031`/`032`.

### Modified Capabilities
<!-- Nenhuma: capability nova (`detalhe-cartao-acoes`) para evitar exigir MODIFIED de
requirements existentes de `detalhe-cartao` (018) no archive; nenhum comportamento de backend é
alterado. -->

## Impact

- **Frontend**: `card-detail-modal.component.tsx` (reestruturado em duas colunas); novos
  subcomponentes `card-detail-actions.component.tsx` (Ações: Mover/Copiar/Arquivar),
  `card-detail-add-to-card.component.tsx` (Adicionar ao cartão: Checklist/Anexo/Capa),
  `card-detail-cover-picker.component.tsx` (popover de cor), `card-detail-move-dialog.component.tsx`
  (diálogo de lista destino), `card-detail-activity.component.tsx` (aba Atividade);
  `card-detail.api.ts` ganha `copyCard`/`setCardCover`/`listCardActivity`; `boards.api.ts` e
  `board-state.type.ts` (`CardDto`/`BoardDetailCard`/`CardState`) ganham `cover: LabelColor |
  null`; `board-state.reducer.ts` hidrata `cover` em `toCardState`; `board-view.component.tsx`
  ganha handlers `handleCopyCard`/`handleSetCardCover`/`handleMoveCardFromModal` e passa
  `board.lists` ao modal para o diálogo Mover; `kanban-card.component.tsx` exibe a faixa de capa;
  `i18n` (pt/en) ganha as chaves novas.
- **Dependências**: `018` (`card-detail-modal.component.tsx` e subcomponentes existentes), `022`
  (handler de Arquivar existente, reposicionado), `031` (endpoints `copy`/`cover`/`activity` já
  prontos, `CardResponse`/`BoardDetailCard` do backend já incluem `cover`), `032` (seção Anexos
  já existente, reaproveitada pelo botão "Anexo"), `011` (`activity-label.util.ts`,
  `activity.api.ts` como padrão de paginação/formatação), `008` (`moveCard` já existente em
  `boards.api.ts`).
- **Habilita**: nenhuma change subsequente depende desta; fecha o roteiro do detalhe do cartão
  fiel ao mockup.
