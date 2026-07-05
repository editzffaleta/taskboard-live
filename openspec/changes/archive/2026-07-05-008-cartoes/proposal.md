> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/cartoes/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Com as listas prontas (`007`) e o gateway de tempo real disponível (`006`), o TaskBoard Live
ainda não tem o cartão — a unidade de trabalho que de fato se move entre colunas. Esta mudança
cria o agregado `card` dentro do módulo `board`, permitindo criar, editar, excluir e mover
cartões entre listas, com cada mutação refletida em tempo real para todos os membros conectados
ao quadro.

## What Changes

- Implementar a entidade `card` (`listId`, `title`, `description` opcional, `position`) no
  agregado `card` do módulo `board`.
- Casos de uso: `create-card` (recebe `listId` e `title`; posição atribuída no fim da lista),
  `edit-card` (`title`, `description`), `delete-card` e `move-card` (recebe `toListId` e
  `position`; pode trocar de coluna; renormaliza as posições da lista de origem e da lista de
  destino). Cobrir todos com testes unitários usando fakes.
- Sincronizar o model `Card` no Prisma (migration), com FK `listId` → `List`, e implementar o
  repositório Prisma correspondente.
- Expor os endpoints autenticados sob `/boards/:boardId/cards`: `POST /boards/:boardId/cards`,
  `PATCH /boards/:boardId/cards/:id`, `DELETE /boards/:boardId/cards/:id` e
  `PATCH /boards/:boardId/cards/:id/move` (`{toListId, position}`). Guard: apenas membros do
  quadro (reaproveita a checagem de `BoardMember` da `005`).
- Após o sucesso de cada caso de uso, o controller resolve o `boardId` a partir da lista do
  cartão (quando necessário) e chama `RealtimeEmitter.emitToBoard(boardId, event, payload)` da
  `006` para emitir `card.created`, `card.updated`, `card.moved`
  (`{cardId, fromListId, toListId, position}`) ou `card.deleted`.
- Mapear no i18n (pt/en) os erros dos endpoints de `/boards/:boardId/cards`.

## Capabilities

### New Capabilities
- `cartoes`: agregado `card` do módulo `board` do TaskBoard Live — criação, edição, exclusão e
  movimentação de cartões entre listas com renormalização de posições, persistência Prisma e
  emissão de eventos de tempo real (`card.created`, `card.updated`, `card.moved`,
  `card.deleted`) via `RealtimeEmitter` após cada mutação bem-sucedida.

### Modified Capabilities
<!-- Nenhuma: o módulo `board` é estendido com o agregado `card`, sem alterar `board`/`membership`/`list`. -->

## Impact

- **Backend**: agregado `card` no módulo `board` (entidade, casos de uso `create-card`,
  `edit-card`, `delete-card`, `move-card` com testes unitários), repositório Prisma em
  `apps/backend/src/modules/board`, controller expondo `/boards/:boardId/cards`, model `Card`
  no Prisma + migration (FK `listId`), chamadas a `RealtimeEmitter` após cada mutação.
- **Frontend**: nenhum código — a UI de drag-and-drop e a renderização dos cartões são escopo
  da `009`.
- **Domínio**: novo agregado `card`; `List`/`Board`/`BoardMember` intocados.
- **Dependências**: `007` (agregado `list`), `006` (`RealtimeEmitter`).
- **Habilita**: `009` (quadro ao vivo com drag-and-drop), `011` (atividade do quadro registrando
  eventos de cartão).
