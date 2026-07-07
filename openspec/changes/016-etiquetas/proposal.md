> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/etiquetas/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/etiquetas/spec.md`) ·
> `openspec/changes/016-etiquetas/mockups/` (`Quadro ao Vivo.dc.html`,
> `Configuracoes do Quadro.dc.html`, PNGs) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O TaskBoard Live já move cartões entre listas em tempo real (`007`/`008`), mas o cartão ainda é
"pobre": só título e descrição. O mockup do quadro ao vivo mostra cartões com **etiquetas
coloridas** (chips como "Backend", "Design", "Segurança") tanto na visão kanban quanto na visão
de lista e no detalhe do cartão — é o primeiro passo do "cartão rico" que as changes seguintes
(`017` prazo/checklist/responsáveis/comentários, `018` detalhe do cartão, `019` filtros/visões)
vão consumir. Esta change entrega **só etiquetas**: criar, atribuir e remover, com emissão em
tempo real.

## Contrato do cartão rico (referência para 017–019)

O cartão do TaskBoard Live ganhará, ao longo de `016`–`017`, os seguintes campos, todos
consumidos pelo detalhe do cartão (`018`) e pelos filtros/visões (`019`):

- **`016` (esta change):** `labels: Label[]` — etiquetas coloridas atribuídas ao cartão.
- **`017`:** `dueDate` (prazo), `checklist` (itens com progresso), `assignees` (responsáveis),
  `comments` (comentários).

Nomes canônicos usados por todas essas changes:

```
Label     { id, boardId, name, color }   // color ∈ {red, amber, green, blue, purple, teal, pink}
CardLabel { id, cardId, labelId }         // join N:N card ↔ label
```

`018`/`019` devem ler `Label`/`CardLabel` exatamente com esses nomes — não renomear.

## What Changes

- Adicionar o agregado `label` ao módulo `board`: entidade `Label` (`boardId`, `name`, `color`
  restrito às 7 cores do mockup), porta `LabelRepository`, e casos de uso `create-label`,
  `update-label` (renomear/recolorir), `delete-label`, `list-labels` (do quadro).
- Adicionar o relacionamento N:N `CardLabel` entre `Card` e `Label`, com casos de uso
  `assign-label` e `unassign-label` recebendo `cardId`/`labelId`.
- Sincronizar os models Prisma `Label` e `CardLabel` (migration), com FKs `boardId`→`Board`
  (cascade) e `cardId`→`Card`/`labelId`→`Label` (cascade).
- Expor os endpoints autenticados: `GET/POST /boards/:boardId/labels`,
  `PATCH/DELETE /boards/:boardId/labels/:id`, `PUT /boards/:boardId/cards/:cardId/labels/:labelId`
  (atribuir) e `DELETE /boards/:boardId/cards/:cardId/labels/:labelId` (remover). Guard: apenas
  membros do quadro (reaproveita a checagem de `BoardMember` da `005`).
- Emitir via `RealtimeEmitter.emitToBoard(boardId, event, payload)` após cada caso de uso ter
  sucesso: `label.created`, `label.updated`, `label.deleted` para mutações do catálogo de
  etiquetas do quadro; e `card.updated` (com o cartão e suas `labels`) quando uma etiqueta é
  atribuída ou removida de um cartão — ver justificativa no `design.md`.
- Frontend: chips de etiqueta coloridas (paleta exata do mockup) no `kanban-card` do quadro ao
  vivo, e um popover acessível a partir do cartão para criar etiqueta e marcar/desmarcar
  etiquetas existentes no cartão. i18n pt/en para os textos do popover e erros dos endpoints.

## Limite explícito desta change

A tela completa de **gestão de etiquetas em "Configurações do Quadro"** (renomear, recolorir e
excluir etiquetas a partir de uma tela dedicada, como no mockup `Configuracoes do Quadro.dc.html`)
**fica para a change `020`**. Esta change entrega apenas: (a) os casos de uso e endpoints de
CRUD de etiqueta e atribuição no cartão (o backend completo, reaproveitável pela `020`), e (b) no
frontend, o popover mínimo a partir do cartão para criar etiqueta e atribuir/remover — não a
tela de configurações do quadro.

## Capabilities

### New Capabilities
- `etiquetas`: agregado `label` do módulo `board` do TaskBoard Live — criação, edição
  (renomear/recolorir), exclusão e listagem de etiquetas por quadro, atribuição e remoção de
  etiquetas em cartões, persistência Prisma (`Label`, `CardLabel`) e emissão de eventos de
  tempo real (`label.created`, `label.updated`, `label.deleted`, `card.updated`) via
  `RealtimeEmitter` após cada mutação bem-sucedida; chips de etiqueta e popover de
  atribuição no frontend.

### Modified Capabilities
<!-- Nenhuma: o módulo `board` é estendido com o agregado `label` e o relacionamento
`Card`↔`Label`, sem alterar `board`/`membership`/`list`/`card` existentes (apenas o payload de
`card.updated` passa a incluir `labels`). -->

## Impact

- **Backend**: agregado `label` no módulo `board` (entidade, casos de uso `create-label`,
  `update-label`, `delete-label`, `list-labels`, `assign-label`, `unassign-label`, com testes
  unitários), repositório Prisma em `apps/backend/src/modules/board`, controllers expondo
  `/boards/:boardId/labels` e `/boards/:boardId/cards/:cardId/labels/:labelId`, models `Label` e
  `CardLabel` no Prisma + migration, chamadas a `RealtimeEmitter` após cada mutação.
- **Frontend**: chips de etiqueta no `kanban-card.component.tsx`, popover de atribuição de
  etiquetas acessível a partir do cartão, i18n pt/en.
- **Domínio**: novo agregado `label`; relacionamento N:N `CardLabel`; `Card`/`List`/`Board`/
  `BoardMember` intocados na estrutura (o response de cartão passa a incluir `labels`).
- **Dependências**: `008` (agregado `card`), `006` (`RealtimeEmitter`), `015` (frontend do quadro
  ao vivo reestilizado, para inserir os chips e o popover).
- **Habilita**: `017` (prazo/checklist/responsáveis/comentários no cartão rico), `018` (detalhe
  do cartão consumindo `labels`), `019` (filtros/visões por etiqueta), `020` (tela completa de
  gestão de etiquetas em Configurações do Quadro).
