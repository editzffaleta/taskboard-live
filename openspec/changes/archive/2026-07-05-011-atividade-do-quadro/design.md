## Context

O módulo `board` já tem `Board`/`BoardMember` (`005`), `RealtimeEmitter` (`006`), `list` (`007`),
`card` (`008`) e `member` (`010`). Falta a trilha de auditoria: um registro persistente e
consultável de quem fez o quê em cada quadro, exibido em tempo real. Esta change entrega o
agregado `activity` (persistência + porta de gravação + consulta) e integra-o aos controllers já
existentes das `007`/`008`/`010` via um gancho pequeno e documentado — **sem** reescrever a
lógica de negócio dessas changes.

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Persistir cada mutação relevante do quadro como uma `Activity` (quem, o quê, quando).
- Emitir `activity.created` em tempo real assim que a atividade é gravada, via `RealtimeEmitter`
  já existente (`006`) — sem reimplementar transporte.
- Consulta paginada, mais recente primeiro, restrita a membros do quadro.
- Painel lateral no frontend que combina carga inicial (REST) + atualização ao vivo (evento),
  com rótulos i18n legíveis por humano.

**Non-Goals:**
- Reescrever ou alterar o comportamento funcional dos controllers de `007`/`008`/`010` — apenas
  adicionar uma chamada a `ActivityRecorder.record` no ponto onde já emitem o evento de domínio.
- Edição/exclusão de entradas de atividade (log é append-only).
- Filtros avançados (por tipo, por autor, por período) — apenas paginação simples nesta change.
- Retenção/expurgo de atividade antiga — decisão operacional futura, se necessária.

## Decisions

- **Localização**: `apps/backend/src/modules/board/domain/activity.entity.ts` e
  `application/use-cases/list-activity.use-case.ts`, seguindo a mesma Clean Architecture do
  restante do módulo `board`: `domain` (entidade `Activity`, sem imports de infraestrutura) →
  `application` (caso de uso `list-activity` e a porta `ActivityRecorder`, recebem
  `ActivityRepository` e checagem de membership como *ports*) → `infrastructure` (repositório
  Prisma, implementação concreta de `ActivityRecorder`) → `interface` (controller HTTP).

```
apps/backend/src/modules/board/
  domain/
    activity.entity.ts
  application/
    use-cases/
      list-activity.use-case.ts
    ports/
      activity-repository.port.ts
      activity-recorder.port.ts
  infrastructure/
    prisma/
      activity.repository.ts
    activity-recorder.provider.ts
  interface/
    http/
      activity.controller.ts
```

- **Entidade `Activity`**: campos `id`, `boardId` (FK `Board`), `actorId` (FK `User`), `type`
  (string — catálogo abaixo), `data` (JSON — payload específico do tipo, ex.:
  `{ cardId, title }`), `createdAt`. Sem invariantes de negócio complexas: é um registro
  append-only, não editável, não excluível pela aplicação.

- **Catálogo de `type`** (SHALL cobrir, no mínimo): `card.created`, `card.moved`,
  `card.deleted`, `list.created`, `member.added`. As changes `007`/`008`/`010` podem gerar mais
  tipos análogos (ex.: `list.deleted`, `card.updated`) seguindo o mesmo padrão
  `<agregado>.<ação>` — o catálogo completo deve estar documentado nos comentários da entidade
  `Activity`/porta `ActivityRecorder` e no i18n (rótulos).

- **Porta `ActivityRecorder`** (`activity-recorder.port.ts`): interface com um único método,
  `record(boardId: string, actorId: string, type: string, data: Record<string, unknown>):
  Promise<void>`. Implementação concreta (`activity-recorder.provider.ts`, skill
  [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation)):
  1) persiste a `Activity` via `ActivityRepository.create`; 2) injeta `RealtimeEmitter` (`006`,
  já exportado pelo `BoardModule`) e chama `emitToBoard(boardId, 'activity.created', activityDTO)`
  com a atividade recém-criada (incluindo `actorId`/nome do ator, já resolvido, para o frontend
  não precisar de uma segunda consulta). Registrada como provider no `BoardModule` e
  **exportada**, para que os controllers de `007`/`008`/`010` a injetem.

- **Caso de uso `list-activity`**: recebe `boardId`, `requesterId`, `cursor`/`page`, `limit`.
  Confere que `requesterId` é membro do quadro (reutilizar o mecanismo já existente desde a
  `005` — não duplicar). Retorna a página de atividades ordenadas por `createdAt` decrescente
  (mais recente primeiro), via `ActivityRepository.findAllByBoardId` (paginado). Lança erro de
  domínio mapeado para HTTP 403 quando `requesterId` não é membro, e 404 quando `boardId` não
  existe.

- **Persistência Prisma**: adicionar ao `schema.prisma` (schema modular do módulo `board`):

```prisma
model Activity {
  id        String   @id @default(uuid())
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  actorId   String
  actor     User     @relation(fields: [actorId], references: [id])
  type      String
  data      Json
  createdAt DateTime @default(now())

  @@index([boardId, createdAt])
}
```

  Rodar migration (`npx prisma migrate dev --name add-activity`) dentro de `apps/backend`.
  `ActivityRepository` (porta em `application/ports`) expõe: `create` e `findAllByBoardId`
  (paginado, ordenado por `createdAt` decrescente). A implementação Prisma vive em
  `infrastructure/prisma/activity.repository.ts` e não vaza tipos do Prisma para os casos de uso.

- **Endpoint HTTP**: `GET /boards/:boardId/activity` (guard JWT global da `004` + checagem de
  membership do quadro, reaproveitando o padrão da `005`/`007`), aceitando `?cursor=` (ou
  `?page=`) e `?limit=` (default razoável, ex. 20, máximo ex. 100), retornando a página mais
  recente primeiro e um indicador de próxima página.

- **Gancho nos controllers de `007`/`008`/`010`** (ajuste pequeno, documentado aqui — **não**
  implementado por esta change dentro daqueles arquivos, mas o gancho em si, quando executado,
  é aplicado nesses controllers): logo após a chamada existente a
  `RealtimeEmitter.emitToBoard(...)`, cada controller passa a chamar também
  `ActivityRecorder.record(boardId, requesterId, type, data)`, com o seguinte mapeamento mínimo
  de ações que registram atividade:
  - `list.controller.ts` (`007`): `create-list` → `type: 'list.created'`,
    `data: { listId, title }`.
  - `card.controller.ts` (`008`): `create-card` → `type: 'card.created'`,
    `data: { cardId, listId, title }`; `move-card` → `type: 'card.moved'`,
    `data: { cardId, fromListId, toListId, position }`; `delete-card` →
    `type: 'card.deleted'`, `data: { cardId, listId }`.
  - `member.controller.ts` (`010`): ação de adicionar membro ao quadro → `type: 'member.added'`,
    `data: { memberId, name }`.
  Cada chamada a `ActivityRecorder.record` acontece **no controller**, no mesmo ponto onde o
  `emitToBoard` do próprio recurso já acontece — nunca dentro do caso de uso do recurso (que
  permanece livre de dependências de `activity`/tempo real). Falha ao gravar atividade não deve
  quebrar a resposta HTTP da mutação original (registrar/logar o erro, mas responder sucesso ao
  cliente) — a trilha de atividade é auxiliar, não crítica ao fluxo principal.

- **Frontend — painel lateral de atividade** (dentro da página do quadro entregue pela `009`):
  componente que, ao montar, busca `GET /boards/:boardId/activity` (primeira página) e assina o
  evento `activity.created` do socket já conectado à sala `board:{boardId}` (infraestrutura de
  `006`/`009`), inserindo cada nova entrada no topo da lista em tempo real. Skill
  [frontend-next-config](../../../.claude/skills/frontend-next-config) para o ajuste de rotas/
  configuração necessário à nova chamada REST. Rótulos i18n (pt/en) mapeiam `type` + `data` para
  frases legíveis (ex.: `"{actor} moveu o cartão \"{title}\""`), com uma entrada por `type` do
  catálogo e um rótulo genérico de fallback para `type` desconhecido (evita quebra na UI se um
  novo `type` for introduzido sem tradução).

## Risks / Trade-offs

- [Gravação de atividade falhar e quebrar a mutação original] → `ActivityRecorder.record` nunca
  propaga exceção para o controller de forma a reverter a resposta HTTP; erros de gravação são
  logados e a resposta da mutação segue normalmente.
- [Volume de atividade crescer sem limite] → Paginação obrigatória na consulta; retenção/expurgo
  fica como decisão operacional futura, fora do escopo desta change.
- [`data` (JSON) virar um "catch-all" desorganizado] → Cada `type` tem um formato de `data`
  documentado nesta change (ver catálogo); novos `type`s introduzidos por changes futuras devem
  seguir o mesmo princípio de payload mínimo e específico.
- [Frontend receber `activity.created` antes de terminar a carga inicial via REST] → O painel
  deve tratar a corrida de forma simples: anexar eventos recebidos antes da resposta REST estar
  pronta a uma fila local, mesclando por `id` ao renderizar (evita duplicata e perda de evento).
