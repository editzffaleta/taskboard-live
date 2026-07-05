> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/atividade/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Com listas (`007`), cartões (`008`) e membros (`010`) já mutando o quadro em tempo real via
`RealtimeEmitter` (`006`), o TaskBoard Live ainda não tem uma trilha de auditoria legível do que
aconteceu no quadro. Esta mudança introduz o agregado `activity`: um registro persistente de
cada mutação relevante (quem fez o quê, e quando), consultável em um painel lateral na página do
quadro (`009`) e atualizado ao vivo pelo mesmo canal de tempo real já existente.

## What Changes

- Criar o agregado `activity` dentro do módulo de negócio `board` já existente.
- Implementar a entidade `Activity` (`id`, `boardId`, `actorId`, `type`, `data`, `createdAt`).
- Implementar a porta/provider `ActivityRecorder` com o método `record(boardId, actorId, type,
  data)`: persiste a `Activity` via repositório Prisma e, em seguida, emite `activity.created`
  via `RealtimeEmitter.emitToBoard(boardId, 'activity.created', payload)`.
- Caso de uso `list-activity`: retorna o histórico de atividade de um quadro paginado (mais
  recente primeiro), restrito a membros do quadro (reutilizando a checagem de membership já
  existente desde a `005`).
- Sincronizar o model `Activity` no Prisma (migration), com FK `boardId` para `Board` e FK
  `actorId` para `User`, e implementar o repositório Prisma correspondente.
- Expor o endpoint autenticado `GET /boards/:boardId/activity` (paginado, `?cursor=`/`?page=` e
  `?limit=`), protegido pela mesma checagem de membership dos demais endpoints do módulo `board`.
- **Ajuste pontual nos controllers das changes `007`, `008` e `010`**: após a mutação ter
  sucesso (mesmo ponto onde já chamam `RealtimeEmitter.emitToBoard`), cada controller passa a
  chamar também `ActivityRecorder.record(boardId, actorId, type, data)` para as ações listadas no
  `design.md`. Esta change **não** reescreve esses controllers — apenas documenta o gancho a ser
  adicionado neles.
- Frontend: painel lateral de atividade na página do quadro (`009`) que carrega o histórico via
  `GET /boards/:boardId/activity` e recebe novas entradas ao vivo pelo evento `activity.created`,
  renderizando rótulos i18n legíveis (ex.: "Fulano moveu o cartão X").
- Mapear no i18n (pt/en) os rótulos de cada `type` de atividade e os erros do endpoint.

## Capabilities

### New Capabilities
- `atividade`: agregado `activity` do módulo `board` do TaskBoard Live — registro persistente de
  mutações relevantes do quadro (criação/movimentação/exclusão de listas e cartões, adição de
  membros), consulta paginada restrita a membros e emissão em tempo real (`activity.created`) via
  `RealtimeEmitter`, com painel lateral de atividade no frontend.

### Modified Capabilities
<!-- Nenhuma: os controllers das 007/008/010 recebem apenas uma chamada adicional a
`ActivityRecorder.record`, sem alterar seu comportamento funcional existente. -->

## Impact

- **Backend**: novo agregado `activity` dentro do módulo `board` (entidade `Activity`, provider
  `ActivityRecorder`, caso de uso `list-activity` com teste unitário usando fake), repositório
  Prisma em `apps/backend/src/modules/board`, `activity.controller.ts` expondo
  `GET /boards/:boardId/activity`, model `Activity` no Prisma + migration com FKs `boardId` e
  `actorId`. Ajuste pontual (chamada a `ActivityRecorder.record`) nos controllers de `list`
  (`007`), `card` (`008`) e `member` (`010`).
- **Frontend**: painel lateral de atividade na página do quadro (`009`) — carga inicial via REST
  paginado + atualização ao vivo via `activity.created`, com labels i18n.
- **Contratos**: a interface do repositório do módulo `activity` (`ActivityRepository`) não pode
  ser alterada pela implementação Prisma; a porta `RealtimeEmitter` (`006`) é apenas consumida,
  não alterada.
- **Fora de escopo**: reescrever a lógica de negócio de `007`/`008`/`010` — apenas o gancho de
  `ActivityRecorder.record` é adicionado aos controllers dessas changes.
- **Dependências**: `006` (`RealtimeEmitter`), `007` (listas), `008` (cartões), `010` (membros) —
  ações que geram atividade —, `009` (página do quadro, onde o painel é montado).
- **Habilita**: trilha de auditoria completa do quadro, visível em tempo real na UI.
