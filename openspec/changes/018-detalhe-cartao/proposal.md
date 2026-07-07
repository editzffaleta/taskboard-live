> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/detalhe-cartao/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/detalhe-cartao/spec.md`) ·
> `openspec/changes/018-detalhe-cartao/mockups/` (`Quadro ao Vivo.dc.html`, PNGs
> `01-check.png`/`01-ov.png`/`02-check.png`/`02-ov.png`/`03-ov.png`) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`. **NÃO ler:** o repositório inteiro, outras changes,
> `openspec/changes/archive/`. Faltou contexto? O defeito é do `design.md` — pare e corrija o
> trilho; não abra o contexto. **Ao concluir:** `/portao` verde → commit →
> `/openspec:archive` → atualizar `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da
> próxima change.

## Why

O cartão do TaskBoard Live já tem, no backend, tudo o que o mockup do "Quadro ao Vivo" promete:
etiquetas (`016`), prazo, checklist, responsáveis e comentários (`017`). O frontend, porém, só
exibe título editável, chips de etiqueta e o popover de atribuição — o cartão continua "pobre"
na tela, mesmo rico no banco. O mockup (`Quadro ao Vivo.dc.html`) mostra dois lugares onde essa
riqueza deveria aparecer: (a) **badges compactos no próprio cartão do quadro** (selo de prazo,
avatares de responsáveis, progresso do checklist, contador de comentários) e (b) um **modal de
detalhe do cartão**, aberto ao clicar nele, com título editável, descrição, seletor de
etiquetas, prazo, responsáveis, checklist interativo com barra de progresso e uma thread de
comentários — tudo refletindo ao vivo quando outra pessoa mexe no mesmo cartão. Esta change
entrega exatamente essas duas peças, **sem tocar em backend**: é consumo puro do que `016`/`017`
já expõem.

## What Changes

- Adicionar o **modal de detalhe do cartão** (`card-detail-modal.component.tsx`), aberto ao
  clicar num cartão do quadro (fora da área de drag/edição inline de título), reproduzindo
  fielmente o layout do mockup: cabeçalho com título editável, corpo com descrição, seção de
  etiquetas (reaproveitando `LabelPopover`/`label-chip`), seção de prazo (date picker + badge
  atrasado/hoje/futuro), seção de responsáveis (adicionar/remover membros do quadro via
  `GET /boards/:boardId/members`), seção de checklist (barra de progresso, add/toggle/editar/
  excluir/reordenar item) e aba de comentários (lista paginada + adicionar + excluir do próprio
  autor).
- Estender `CardState`/`BoardState` (`board-state.type.ts`) e o reducer
  (`board-state.reducer.ts`) com os campos que `017` já retorna no payload de cartão:
  `dueDate: string | null`, `assignees: { id, name }[]`, `checklist: { id, text, done,
  position }[]` — reconciliados a cada `card.created`/`card.updated`.
- Estender `useBoardSocket` (`use-board-socket.ts`) para tipar `CardEventPayload` com os campos
  novos e assinar `comment.created`/`comment.deleted` (eventos dedicados de comentário,
  conforme decisão da `017`), repassando ao modal aberto (se o cartão do evento for o cartão em
  exibição).
- Adicionar ao `boards.api.ts`/novo `card-detail.api.ts` as chamadas HTTP dos endpoints da `017`:
  `PATCH /cards/:id/due`, `POST/PATCH/PATCH(text)/DELETE/PUT(order)
  /cards/:cardId/checklist(...)`, `PUT/DELETE /cards/:cardId/assignees/:userId`,
  `POST/GET/DELETE /cards/:cardId/comments(...)`.
- Atualizar `kanban-card.component.tsx` para exibir, a partir dos dados reais já presentes em
  `CardState` (sem inventar nada que o cartão não tenha): selo de prazo (atrasado/hoje/futuro),
  avatares de responsáveis (iniciais, mesma paleta do mockup), progresso do checklist (ex.:
  "✓ 2/5") e contador de comentários — condicionados à existência do dado (`dueDate !== null`,
  `assignees.length > 0`, `checklist.length > 0`, contador de comentários só quando > 0, exigindo
  um `commentsCount` hidratado — ver `design.md` sobre a fonte desse contador).
- i18n pt/en dos textos do modal (títulos de seção, placeholders, botões, estados vazios) e das
  chaves de erro dos endpoints de `dueDate`/`checklist`/`assignees`/`comments` da `017`.

## Limite explícito desta change

Nenhuma alteração de backend (o contrato de `016`/`017` já está fechado). Sem filtros/visões
(Kanban/Lista/Calendário — `019`). Sem tela de "Configurações do Quadro" (`020`). Sem edição/
reação de comentário (autor só cria e exclui, conforme `017`). Sem notificações de prazo.

## Capabilities

### New Capabilities
- `detalhe-cartao`: modal de detalhe do cartão no frontend do TaskBoard Live (título/descrição
  editáveis, etiquetas, prazo, responsáveis, checklist com progresso, comentários paginados),
  consumindo os endpoints de `016`/`017` e refletindo em tempo real via `card.updated`/
  `comment.created`/`comment.deleted`; badges do cartão no quadro (prazo, responsáveis,
  checklist, comentários) a partir de dados reais.

### Modified Capabilities
<!-- Nenhuma: `etiquetas` (016) e `cartao-rico` (017) já fecharam seus contratos de API/eventos;
esta change só consome — não altera contrato algum dessas capabilities. -->

## Impact

- **Frontend**: `card-detail-modal.component.tsx` (e subcomponentes de seção: descrição, prazo,
  responsáveis, checklist, comentários), `card-detail.api.ts` (chamadas HTTP da `017`),
  extensão de `CardState`/`BoardState`/reducer/`useBoardSocket`, badges em
  `kanban-card.component.tsx`, i18n pt/en.
- **Backend**: nenhum.
- **Domínio**: nenhum (consumo puro do payload já definido por `016`/`017`).
- **Dependências**: `016` (etiquetas, `LabelPopover`/`label-chip`), `017` (prazo/checklist/
  responsáveis/comentários — endpoints e payload de cartão), `010` (membros do quadro,
  `members.api.ts`), `015` (frontend do quadro ao vivo reestilizado).
- **Habilita**: `019` (filtros/visões, que vai ler os mesmos campos de `CardState` para
  filtrar), `020` (tela de "Configurações do Quadro", que reaproveita padrões de popover/modal
  aqui estabelecidos).
