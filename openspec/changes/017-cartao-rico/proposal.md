> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/etiquetas/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/cartao-rico/spec.md`) ·
> `openspec/changes/017-cartao-rico/mockups/` (`Quadro ao Vivo.dc.html`, PNGs `01-check.png`,
> `02-check.png`) · e, **somente se o `design.md` citar nominalmente**: arquivos de código
> listados, `openspec/templates/`, `openspec/memory/`. **NÃO ler:** o repositório inteiro,
> outras changes, `openspec/changes/archive/`. Faltou contexto? O defeito é do `design.md` —
> pare e corrija o trilho; não abra o contexto. **Ao concluir:** `/portao` verde → commit →
> `/openspec:archive` → atualizar `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da
> próxima change.

## Why

O TaskBoard Live já move cartões entre listas em tempo real e, desde a `016`, cartões ganharam
**etiquetas** (`labels`). O mockup do detalhe do cartão (`Quadro ao Vivo.dc.html`) mostra, além
das etiquetas: um **prazo** (data com indicação visual de atraso), um **checklist** com barra de
progresso, um conjunto de **responsáveis** com avatares, e uma seção de **comentários**. Esta
change é **só backend**: entrega os quatro sub-recursos do "cartão rico" — prazo, checklist,
responsáveis, comentários — como agregados/campos consumíveis por API e por evento de tempo
real. A `018` (detalhe do cartão) constrói a tela que exibe tudo isso; a `019` (filtros/visões)
consome `dueDate`/`assignees`/`checklist` para filtrar e agrupar cartões. Sem esta change, `018`
e `019` não têm o que consumir.

## Contrato do cartão rico (referência para 016–019)

- **`016`:** `labels: Label[]`.
- **`017` (esta change):** `dueDate` (prazo, nullable), `checklist: ChecklistItem[]` (itens com
  progresso), `assignees: { id, name }[]` (responsáveis, restritos a membros do quadro),
  `comments` (não incluído no payload do cartão — carregado sob demanda via
  `GET /cards/:id/comments`).
- **`018`:** consome tudo isso na tela de detalhe do cartão.
- **`019`:** consome `dueDate`/`assignees`/`checklist`/`labels` para filtros e visões
  (ex.: "meus cartões", "atrasados", "sem responsável").

Nomes canônicos usados por `018`/`019` (não renomear):

```
ChecklistItem  { id, cardId, text, done, position }
CardAssignee   { id, cardId, userId }               // join N:N card ↔ user (membro do quadro)
Comment        { id, cardId, authorId, text, createdAt }
```

## Shape final do cartão após esta change

```ts
CardResponse {
  id, listId, title, description, position, createdAt,
  labels:    { id, name, color }[],           // 016
  dueDate:   string | null,                   // 017 — ISO 8601
  assignees: { id, name }[],                  // 017
  checklist: { id, text, done, position }[],  // 017
}
```

`comments` **não** entra nesse payload (evitaria payload gigante em cartões com muitos
comentários e em toda mutação de `card.*`); são obtidos via `GET /cards/:id/comments`, paginado,
quando a `018` abre o detalhe do cartão.

## What Changes

- Estender a entidade `Card` com `dueDate: Date | null` (Prisma + migration); endpoint para
  definir/limpar o prazo. Emite `card.updated` com o cartão completo.
- Novo agregado `checklist-item`: `ChecklistItem { id, cardId, text, done, position }`. Casos de
  uso `add-checklist-item`, `toggle-checklist-item`, `edit-checklist-item`,
  `delete-checklist-item`, `reorder-checklist-items`. Endpoints sob
  `/boards/:boardId/cards/:cardId/checklist`. Emite `card.updated` com o cartão completo
  (incluindo `checklist`) — decisão registrada e justificada no `design.md`.
- Novo relacionamento N:N `CardAssignee` (card ↔ usuário), restrito a membros do quadro. Casos
  de uso `assign-user`/`unassign-user`. Endpoints sob
  `/boards/:boardId/cards/:cardId/assignees`. Emite `card.updated` com `assignees` atualizado.
- Novo agregado `comment`: `Comment { id, cardId, authorId, text, createdAt }`. Casos de uso
  `add-comment`, `list-comments` (paginado), `delete-comment` (somente autor). Endpoints sob
  `/boards/:boardId/cards/:cardId/comments`. Emite `comment.created` (evento dedicado, não
  `card.updated` — comentário não faz parte do payload do cartão).
- `card-response.util.ts` e `get-board-detail.usecase.ts` passam a hidratar `dueDate`,
  `assignees` e `checklist` em todo payload de cartão, sem remover nem renomear nenhum campo
  existente (`labels` continua igual).
- Guard de membership do quadro em todos os endpoints novos; exclusão de comentário restrita ao
  autor.

## Fora de escopo (limite explícito)

- **UI do detalhe do cartão** (prazo formatado, checklist interativo, avatares, thread de
  comentários) — é a `018`.
- **Filtros e visões** por prazo/responsável/checklist — é a `019`.
- Notificações (ex.: aviso de prazo vencendo) — não faz parte desta change.
- Menções em comentários, edição de comentário, reações — fora de escopo; apenas
  criar/listar/excluir.

## Capabilities

### New Capabilities
- `cartao-rico`: extensão do agregado `card` do módulo `board` do TaskBoard Live com prazo
  (`dueDate`), checklist (`ChecklistItem`, CRUD + toggle + reordenação), responsáveis
  (`CardAssignee`, restrito a membros do quadro) e comentários (`Comment`, criação/listagem
  paginada/exclusão pelo autor), persistência Prisma, guard de membership em todos os
  endpoints, e emissão de eventos de tempo real (`card.updated` com o cartão completo para
  prazo/checklist/responsáveis; `comment.created` dedicado para comentários) via
  `RealtimeEmitter` após cada caso de uso ter sucesso.

### Modified Capabilities
<!-- Nenhuma: o módulo `board` é estendido com os agregados `checklist-item`/`comment` e os
relacionamentos `Card`↔`ChecklistItem`/`Card`↔`User` (assignees), sem alterar o comportamento de
`board`/`membership`/`list`/`etiquetas` existentes (apenas o payload de `card.*` passa a incluir
`dueDate`, `assignees` e `checklist`). -->

## Impact

- **Backend**: campo `dueDate` em `Card` (migration); agregados `checklist-item` e `comment` no
  módulo `board` (entidades, casos de uso, testes unitários); relacionamento `CardAssignee`;
  repositórios Prisma; controllers `checklist.controller.ts`, `card-assignee.controller.ts`,
  `comment.controller.ts`; ajuste de `card.controller.ts` (endpoint de prazo),
  `card-response.util.ts` e `get-board-detail.usecase.ts`; chamadas a `RealtimeEmitter` após
  cada mutação.
- **Domínio**: `Card` ganha `dueDate`; novos agregados `checklist-item`/`comment`; novo
  relacionamento N:N `CardAssignee`; `Board`/`BoardMember`/`List`/`Label` intocados na
  estrutura.
- **Dependências**: `008` (agregado `card`), `005` (membership), `006` (`RealtimeEmitter`),
  `016` (`labels`, `card-response.util.ts`, `get-board-detail.usecase.ts` já hidratando
  `labels` — este arquivo é estendido, não recriado).
- **Habilita**: `018` (detalhe do cartão consumindo `dueDate`/`checklist`/`assignees` e
  `GET /cards/:id/comments`), `019` (filtros/visões por prazo/responsável/checklist).
