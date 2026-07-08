> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/cartao-rico/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/cartao-acoes/spec.md`) ·
> `openspec/changes/031-cartao-copiar-capa-atividade/mockups/` (`Quadro ao Vivo.dc.html`, PNGs
> `01-check.png`, `02-check.png`) · e, **somente se o `design.md` citar nominalmente**: arquivos
> de código listados, `openspec/templates/`, `openspec/memory/`. **NÃO ler:** o repositório
> inteiro, outras changes, `openspec/changes/archive/`. Faltou contexto? O defeito é do
> `design.md` — pare e corrija o trilho; não abra o contexto. **Ao concluir:** `/portao` verde →
> commit → `/openspec:archive` → atualizar `openspec/EXECUTION-LOG.md` → **zerar o chat** antes
> da próxima change.

## Why

O mockup do detalhe do cartão (`Quadro ao Vivo.dc.html`) mostra, na barra lateral de "Ações", os
itens **Mover**, **Copiar**, **Arquivar**, além de uma seção **"Adicionar ao cartão"** com opção
de definir uma **capa** e uma aba/seção de **Atividade** listando o histórico daquele cartão
específico. Mover (`008`) e Arquivar (`022`) já existem no backend. **Copiar**, **Capa** e
**Atividade do cartão** ficaram de fora porque dependiam de decisões de backend que ainda não
tinham sido tomadas — esta change fecha essa lacuna. É **só backend**: entrega os três
sub-recursos como casos de uso/campos/endpoints consumíveis por API e por evento de tempo real.
A `033` (montagem final da UI do detalhe do cartão) consome tudo isso; **anexos** (upload de
arquivo, capa por imagem) ficam para a `032` — aqui a capa é **só cor**, reaproveitando a
paleta de cores já usada por etiquetas (`016`).

## What Changes

- **Copiar cartão (`duplicate-card`)**: novo caso de uso que cria um cartão novo como cópia de
  um existente, na mesma lista ou em uma lista destino informada — copiando `title` (sufixo
  "(cópia)"), `description`, `labels`, `dueDate`, `checklist` (itens) e, opcionalmente,
  `assignees`; **não copia comentários**. Novo cartão entra na última posição da lista destino.
  Endpoint `POST /boards/:boardId/cards/:id/copy` `{toListId?}`. Emite `card.created` com o
  cartão completo (enriquecido, igual a `create`/`restore`).
- **Capa do cartão (`cover`)**: campo `cover: LabelColor | null` no `Card` — reaproveita a
  paleta `LABEL_COLORS` (`red`/`amber`/`green`/`blue`/`purple`/`teal`/`pink`) já usada pela
  `016`. **Não é imagem** — decisão registrada no `design.md`: capa por imagem dependeria de
  upload/anexos (`032`), fora de escopo aqui. Migration; endpoint `PATCH /boards/:boardId/cards/:id/cover`
  `{cover: string | null}`; `cover` passa a constar em `card-response.util.ts` e em
  `get-board-detail.usecase.ts` (o cartão no quadro pode exibir a faixa de capa). Emite
  `card.updated` com o cartão completo.
- **Atividade do cartão**: novo endpoint `GET /boards/:boardId/cards/:cardId/activity`
  (paginado, restrito a membros do quadro) que retorna as atividades do quadro **filtradas**
  pelo `cardId` daquele cartão específico — o agregado `Activity` (`011`) já grava `data` (JSON)
  contendo `cardId` em todo evento de cartão (`card.created`/`card.updated`/`card.moved`/
  `card.deleted`), conforme os ganchos existentes em `card.controller.ts`. O filtro é resolvido
  no repositório Prisma (decisão de implementação registrada no `design.md`).

## Fora de escopo (limite explícito)

- **Anexos** (upload de arquivo ao cartão, capa por imagem) — é a `032`.
- **Montagem final da UI do detalhe do cartão** (menu de Ações, seletor de capa, aba Atividade
  na tela) — é a `033`.
- **Mover** (`move-card`, já existe desde a `008`) e **Arquivar** (`archive-card`, já existe
  desde a `022`) — não são tocados por esta change.
- Anexar arquivo/imagem como capa; notificações; edição de atividade (atividade é somente
  leitura, gerada pelos casos de uso existentes).

## Capabilities

### New Capabilities
- `cartao-acoes`: extensão do agregado `card` do módulo `board` do TaskBoard Live com duplicação
  de cartão (`duplicate-card`, copiando `title`/`description`/`labels`/`dueDate`/`checklist`/
  `assignees` opcionalmente, sem comentários), capa por cor (`cover: LabelColor | null`,
  persistida via migration, hidratada em `card-response.util.ts`/`get-board-detail.usecase.ts`)
  e listagem de atividade filtrada por cartão (`GET .../cards/:cardId/activity`, reaproveitando
  o agregado `Activity` da `011`), guard de membership em todos os endpoints novos, e emissão de
  eventos de tempo real (`card.created` para cópia, `card.updated` para capa) via
  `RealtimeEmitter` após cada caso de uso ter sucesso.

### Modified Capabilities
<!-- Nenhuma: extensão do módulo `board` (agregados `card`/`activity` já existentes), sem
alterar o comportamento de `board`/`membership`/`list`/`etiquetas`/`cartao-rico` existentes
(apenas o payload de `card.*` ganha `cover`, e um novo endpoint de leitura de atividade por
cartão é adicionado). -->

## Impact

- **Backend**: caso de uso `duplicate-card` (módulo `card`); campo `cover` em `Card` (migration);
  caso de uso `list-card-activity` (módulo `activity`, reaproveitando `ActivityRepository`
  estendido com filtro por `cardId`); ajuste em `card.controller.ts` (endpoints `copy`/`cover`);
  novo `card-activity.controller.ts` (ou extensão de `activity.controller.ts`); ajuste de
  `card-response.util.ts` e `get-board-detail.usecase.ts` para incluir `cover`; chamadas a
  `RealtimeEmitter` após cada mutação.
- **Domínio**: `Card` ganha `cover: LabelColor | null`; `ActivityRepository` ganha um método (ou
  parâmetro de filtro) para listar por `cardId`; `Board`/`BoardMember`/`List`/`Label`/`Comment`/
  `ChecklistItem`/`CardAssignee` intocados na estrutura.
- **Dependências**: `008` (agregado `card`, `move-card` já existente), `022` (`archive-card` já
  existente), `016` (`LABEL_COLORS`, `card-response.util.ts`, `get-board-detail.usecase.ts`
  já hidratando `labels` — arquivos estendidos, não recriados), `017` (`checklist`/`assignees`/
  `dueDate` já hidratados nos mesmos arquivos), `011` (agregado `Activity`, `ListActivity`
  use-case, `activity.controller.ts`), `006` (`RealtimeEmitter`), `005` (membership).
- **Habilita**: `033` (montagem da UI do detalhe do cartão consumindo `copy`/`cover`/
  `GET .../activity`); `032` (anexos, capa por imagem — fora de escopo aqui).
