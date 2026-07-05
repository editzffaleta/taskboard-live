> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/listas/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Com o módulo `board` (`005`) e a infraestrutura de tempo real (`006`) prontos, o TaskBoard Live
ainda não tem colunas dentro do quadro. Esta mudança introduz o agregado `list` (coluna do
kanban): criação, renomeação, exclusão (com seus cartões) e reordenação, restritas a membros do
quadro, com cada mutação transmitida em tempo real via `RealtimeEmitter` para que todos os
membros conectados vejam o quadro atualizado instantaneamente. A UI ao vivo que consome esses
eventos é escopo da `009`.

## What Changes

- Criar o agregado `list` dentro do módulo de negócio `board` já existente.
- Implementar a entidade `list` (`boardId`, `title`, `position`).
- Casos de uso: `create-list` (cria a lista com `position` no fim das listas do quadro),
  `rename-list`, `delete-list` (exclui a lista e seus cartões) e `move-list` (reordena as colunas
  do quadro — recalcula/renormaliza a `position` das listas afetadas). Cobrir todos com testes
  unitários usando fakes.
- Sincronizar o model `List` no Prisma (migration), com FK `boardId` para `Board`, e implementar
  o repositório Prisma correspondente.
- Expor os endpoints autenticados sob `/boards/:boardId/lists`: `POST /boards/:boardId/lists`,
  `PATCH /lists/:id`, `DELETE /lists/:id`, `PATCH /lists/:id/move` (`{ position }`). Guard: apenas
  membros do quadro (via `BoardMember`) acessam.
- Após cada mutação ter sucesso, o controller chama `RealtimeEmitter.emitToBoard(boardId, event,
  payload)` com os eventos `list.created`, `list.updated`, `list.moved` e `list.deleted` para a
  sala `board:{boardId}`.
- Mapear no i18n (pt/en) os erros dos endpoints de `/boards/:boardId/lists` e `/lists`.

## Capabilities

### New Capabilities
- `listas`: Agregado `list` (coluna do kanban) do módulo `board` do TaskBoard Live — criação,
  renomeação, exclusão (com seus cartões) e reordenação de listas restritas a membros do quadro,
  persistência Prisma e emissão de eventos em tempo real (`list.created`, `list.updated`,
  `list.moved`, `list.deleted`) via `RealtimeEmitter`.

### Modified Capabilities
<!-- Nenhuma. -->

## Impact

- **Backend**: novo agregado `list` dentro do módulo `board` (entidade `list`, casos de uso
  `create-list`, `rename-list`, `delete-list`, `move-list` com testes unitários), repositório
  Prisma em `apps/backend/src/modules/board`, `list.controller.ts` expondo
  `/boards/:boardId/lists` e `/lists/:id`, model `List` no Prisma + migration com FK `boardId`.
- **Frontend**: nenhum código — a UI ao vivo que consome os eventos `list.*` é escopo da `009`.
- **Contratos**: a interface do repositório do módulo `list` (`ListRepository`) não pode ser
  alterada pela implementação Prisma; a porta `RealtimeEmitter` (`006`) é apenas consumida, não
  alterada.
- **Fora de escopo**: cartões (`008`), UI ao vivo (`009`), registro de atividade (`011`).
- **Dependências**: `005` (módulo `board`, `BoardMember`), `006` (`RealtimeEmitter`).
- **Habilita**: `008` (cartões dependem de listas existentes), `009` (UI ao vivo consome os
  eventos `list.*`), `011` (atividade do quadro registra as mutações de lista).
