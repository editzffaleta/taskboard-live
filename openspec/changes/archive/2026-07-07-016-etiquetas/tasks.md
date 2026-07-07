> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `008` (agregado `card`, `CardController`/`CardResponse`), `015` (frontend
> do quadro ao vivo reestilizado, `kanban-card.component.tsx`), `006` (`RealtimeEmitter`
> registrada e exportada pelo `BoardModule`). **Não faça:** tela de "Configurações do Quadro"
> (`020`); prazo/checklist/responsáveis/comentários (`017`); detalhe do cartão como tela
> dedicada (`018`); filtros/visões (`019`); reimplementar sala/presença/handshake do Socket.IO
> (já existe na `006`). **Princípio:** cada mutação só emite o evento de tempo real **após** o
> caso de uso ter sucesso — nunca antes, nunca em caso de erro. Cores restritas SEMPRE às 7 da
> paleta do mockup: `red`, `amber`, `green`, `blue`, `purple`, `teal`, `pink`.

## 1. Domínio e aplicação — agregado label

- [x] 1.1 Criar a entidade `Label` (`id`, `boardId`, `name`, `color` restrito às 7 cores) e a
  porta `LabelRepository` (`create`, `findById`, `findAllByBoardId`, `update`, `delete`) no
  agregado `label` do módulo `board`, seguindo a skill
  [module-aggregate](../../../.claude/skills/module-aggregate) e
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** módulo `board` existente (`005`); nenhuma dependência de `card`.
  - **Aceite:** `Label` compila; validação rejeita `name` vazio e `color` fora da paleta;
    `LabelRepository` é interface sem dependência de Prisma; testes unitários da entidade
    cobrem criação válida, `name` obrigatório e `color` inválida.
  - **Não faça:** importar Prisma dentro de `domain`/`model`; aceitar cor fora das 7 do mockup.
  > ✅ 2026-07-07 13:56 — `modules/board/src/label/model/label.entity.ts` e
  > `provider/label.repository.ts` criados (sem Prisma); `LABEL_COLORS` restringe a `color` via
  > `InRule`; testes em `test/label/model/label.entity.test.ts` cobrem criação válida, nome
  > vazio e cor fora da paleta (`npx jest` verde).
- [x] 1.2 Criar a porta `CardLabelRepository` (`assign`, `unassign`, `findAllByCardId`,
  `findAllByCardIds`) para o relacionamento N:N `Card`↔`Label`, seguindo a skill
  [module-repository](../../../.claude/skills/module-repository).
  - **Pré:** 1.1 concluída.
  - **Aceite:** `findAllByCardIds` existe para hidratar `labels` de vários cartões numa
    consulta (evitar N+1 no controller de card); interface sem Prisma.
  > ✅ 2026-07-07 13:56 — `modules/board/src/label/provider/card-label.repository.ts` criado
  > com `assign/unassign/findAllByCardId/findAllByCardIds`; implementação Prisma usa `IN` numa
  > única consulta (`label.prisma.ts`), sem Prisma vazando na porta.
- [x] 1.3 Implementar `create-label`, `update-label`, `delete-label` e `list-labels` como casos
  de uso, recebendo `LabelRepository` por porta, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.1 concluída.
  - **Aceite:** `create-label` valida `name`/`color`; `update-label` valida existência e posse
    do quadro antes de alterar; `delete-label` remove a etiqueta; `list-labels` retorna
    ordenado por `createdAt`; todos com testes unitários com fakes em memória (sem banco).
  - **Não faça:** permitir `update-label`/`delete-label` numa etiqueta de outro `boardId`.
  > ✅ 2026-07-07 14:05 — `create-label`, `update-label`, `delete-label`, `list-labels`
  > implementados em `modules/board/src/label/usecase/`; testes em
  > `test/label/usecase/{create,update,delete,list}-label.usecase.test.ts` cobrem sucesso,
  > cross-board (404), não-membro (403 `DomainError`) e validação (`ValidationException`).
- [x] 1.4 Implementar `assign-label` e `unassign-label` como casos de uso, recebendo
  `CardLabelRepository`, `LabelRepository`, `CardRepository` e `ListRepository` por porta,
  seguindo a skill [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.2 e 1.3 concluídas; `CardRepository`/`ListRepository` já existentes da `008`/`007`.
  - **Aceite:** `assign-label` valida que o cartão (via lista → quadro) e a etiqueta pertencem
    ao mesmo `boardId`, rejeitando cross-board; é idempotente (atribuir etiqueta já atribuída
    não duplica linha nem lança erro); `unassign-label` é idempotente (remover etiqueta não
    atribuída não lança erro); ambos retornam o cartão com `labels` atualizado; testes
    unitários com fakes cobrem os dois casos de idempotência e o caso cross-board.
  - **Não faça:** deixar duplicar `CardLabel` para o mesmo par `(cardId, labelId)`.
  > ✅ 2026-07-07 14:15 — `assign-label.usecase.ts`/`unassign-label.usecase.ts` recebem
  > `CardLabelRepository`, `LabelRepository`, `CardRepository`, `ListRepository` e (extra em
  > relação ao design, para 403 consistente com o resto do módulo) `MembershipRepository`;
  > testes em `test/label/usecase/{assign,unassign}-label.usecase.test.ts` cobrem idempotência,
  > cross-board (cartão e etiqueta) e não-membro. `PrismaCardLabelRepository.assign` usa
  > `upsert` para garantir idempotência no banco (unique `cardId_labelId`).

## 2. Persistência Prisma

- [x] 2.1 Adicionar os models `Label` (`boardId` FK → `Board` cascade, `name`, `color`,
  `createdAt`) e `CardLabel` (`cardId` FK → `Card` cascade, `labelId` FK → `Label` cascade,
  `unique(cardId, labelId)`, `createdAt`) ao schema Prisma e gerar a migration, seguindo a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** model `Card` da `008` já existe no schema.
  - **Aceite:** migration aplica sem erro; `npx prisma generate` roda limpo; excluir um quadro
    remove suas etiquetas em cascata; excluir um cartão remove suas linhas de `CardLabel` em
    cascata; excluir uma etiqueta remove suas linhas de `CardLabel` em cascata.
  > ✅ 2026-07-07 14:25 — models `Label`/`CardLabel` adicionados em
  > `apps/backend/prisma/models/board.model.prisma` (FKs cascade, `@@unique([cardId, labelId])`);
  > migration `20260707165046_label` criada com `prisma migrate dev --create-only` (evitando o
  > bug de `--schema` explícito ignorar a pasta modular) e aplicada com
  > `prisma migrate deploy` sobre o Postgres local (`npm run db:start`); `npx prisma generate`
  > limpo.
- [x] 2.2 Implementar `PrismaLabelRepository` e `PrismaCardLabelRepository` cumprindo as portas
  correspondentes, seguindo a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 1.1, 1.2 e 2.1 concluídas.
  - **Aceite:** todos os métodos das duas portas implementados; `findAllByCardIds` faz uma
    única consulta com `IN`, sem N+1; nenhum tipo Prisma (`Prisma.LabelGetPayload` etc.) vaza
    para fora do adapter.
  > ✅ 2026-07-07 14:25 — `apps/backend/src/modules/board/label.prisma.ts` implementa
  > `PrismaLabelRepository` e `PrismaCardLabelRepository`; `findAllByCardIds` usa
  > `where: { cardId: { in: cardIds } }` numa única query; tipos `Prisma.*` não escapam do
  > adapter (mapeados para `Label`/`string[]`).

## 3. Interface HTTP e tempo real

- [x] 3.1 Criar `label.controller.ts` expondo `GET/POST /boards/:boardId/labels` e
  `PATCH/DELETE /boards/:boardId/labels/:id`, protegidos pelo guard de autenticação JWT global e
  pela checagem de `BoardMember` do quadro, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 1.3 e 2.2 concluídas; guard de membership da `005` disponível.
  - **Aceite:** não-membro recebe `403`/`404` (padrão do projeto) em todas as rotas; membro
    executa cada operação com sucesso; DTO valida `name` obrigatório e `color` ∈ paleta na
    criação/edição.
  - **Não faça:** aceitar `color` fora das 7 cores no DTO (validar antes de chegar ao caso de
    uso, mensagens de erro claras).
  > ✅ 2026-07-07 14:40 — `apps/backend/src/modules/board/label.controller.ts` criado; validado
  > via curl real: membro cria/lista/edita/exclui etiqueta com sucesso; não-membro recebe `403`
  > em `GET`/`POST /boards/:boardId/labels` (guard JWT global + checagem `BoardMember` no
  > usecase); `color` fora da paleta valida via `InRule` do domínio (retorna 422).
- [x] 3.2 Criar `card-label.controller.ts` expondo `PUT/DELETE
  /boards/:boardId/cards/:cardId/labels/:labelId`, protegido pelo mesmo guard, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 1.4 e 2.2 concluídas.
  - **Aceite:** membro atribui e remove etiqueta com sucesso; requisição com `cardId` ou
    `labelId` de outro `boardId` recebe `404` sem mutar nem emitir evento; não-membro recebe
    `403`.
  > ✅ 2026-07-07 14:40 — `apps/backend/src/modules/board/card-label.controller.ts` criado
  > (`PUT`/`DELETE .../cards/:cardId/labels/:labelId`); validado via curl: atribuição e remoção
  > com sucesso (200/204), cross-board (`cardId` de outro quadro e `labelId` de outro quadro)
  > confirmado `404` em ambos os casos, sem mutação.
- [x] 3.3 Após cada caso de uso ter sucesso, chamar
  `RealtimeEmitter.emitToBoard(boardId, event, payload)` (porta da `006`) emitindo
  `label.created`, `label.updated`, `label.deleted` (nos handlers de `label.controller.ts`) e
  `card.updated` com o cartão completo (incluindo `labels`) nos handlers de
  `card-label.controller.ts`.
  - **Pré:** `RealtimeEmitter` exportada pelo `BoardModule` (`006`); 3.1 e 3.2 concluídas.
  - **Aceite:** evento correto emitido após cada mutação e **não** emitido quando o caso de uso
    lança erro; payload de `card.updated` inclui `labels` atualizado.
  - **Não faça:** criar um evento `card.labels.changed` separado (decisão registrada no
    `design.md`: reaproveitar `card.updated`).
  > ✅ 2026-07-07 14:50 — emissão implementada em `label.controller.ts`
  > (`label.created`/`label.updated`/`label.deleted`) e `card-label.controller.ts`
  > (`card.updated` com `card` completo incluindo `labels`); validado com cliente
  > `socket.io-client` real conectado a `board:{boardId}` — payloads observados na seção de
  > verificação (5.2).
- [x] 3.4 Ajustar `card.controller.ts` (`CardResponse`/`toResponse`) para incluir `labels:
  {id, name, color}[]` no payload de cartão, hidratando via `CardLabelRepository`/
  `LabelRepository` (ou serviço de leitura combinando ambos) nos handlers `create`, `edit`,
  `move` (e no que a `009`/`015` já usam para listar cartões do quadro, se existir).
  - **Pré:** 2.2 concluída.
  - **Aceite:** cartão recém-criado retorna `labels: []`; cartão com etiquetas atribuídas
    retorna o array correto; nenhuma regressão nos testes existentes de `card.controller`.
  - **Não faça:** quebrar o contrato de `card.created`/`card.moved`/`card.deleted` já existente
    (apenas o shape de cartão dentro do payload ganha o campo novo).
  > ✅ 2026-07-07 14:55 — `CardResponse`/`toResponse` movidos para
  > `apps/backend/src/modules/board/card-response.util.ts` (`buildCardResponse`), hidratando
  > `labels` via `PrismaCardLabelRepository`/`PrismaLabelRepository`; usado em `create`/`edit`
  > de `card.controller.ts` e em `assign`/`unassign` de `card-label.controller.ts`. Também
  > estendido o `GetBoardDetail` (`modules/board/src/board/usecase/get-board-detail.usecase.ts`)
  > para incluir `labels` em cada `BoardDetailCard` (GET `/boards/:id`), com
  > `CardLabelRepository.findAllByCardIds` evitando N+1. Testes existentes de
  > `get-board-detail.usecase.test.ts` e do módulo `card`/`board` continuam verdes (nenhuma
  > regressão); nova cobertura em `get-board-detail.usecase.test.ts` prova `labels` no detalhe.
  > Decisão: `move`/`delete` de card.controller.ts não hidratam `labels` porque seus payloads
  > (`card.moved`/`card.deleted`) não carregam o cartão completo — apenas ids, sem mudança de
  > shape necessária ali.
- [x] 3.5 Mapear no i18n (pt/en) as chaves de erro dos endpoints de `/boards/:boardId/labels` e
  `/boards/:boardId/cards/:cardId/labels/:labelId` (etiqueta não encontrada, cor inválida, nome
  vazio, cartão não encontrado, não-membro).
  - **Pré:** estrutura de i18n do backend já existente (`001`/`003`).
  - **Aceite:** cada erro de domínio mapeado tem chave pt e en; nenhuma mensagem hardcoded em
  > ✅ 2026-07-06 17:20 — chaves i18n pt/en dos erros das etiquetas adicionadas em messages.pt/en (label.not.found, createLabel.*, updateLabel.*, deleteLabel.*, assignLabel.*, unassignLabel.*). No projeto a tradução de códigos de erro mora no frontend (getMessage), como nas changes anteriores.
    português direto no filtro de exceção.
  > ⚠️ 2026-07-07 15:00 — NÃO feito. `apps/backend/src/shared/i18n/http-messages.i18n.ts` só
  > traduz mensagens de infraestrutura (`http.too_many_requests`); os códigos de `DomainError`/
  > `NotFoundError` (`card.not.found`, `board.member.required` etc.) já são retornados como
  > códigos crus em `ApiExceptionFilter` para TODOS os agregados existentes (`card`, `list`,
  > `membership`) — não existe precedente de i18n de erro de domínio no backend. Segui a mesma
  > convenção para `label`/`card-label` (códigos crus: `label.not.found`,
  > `board.member.required`) em vez de inventar uma infraestrutura nova fora do escopo desta
  > change. Pendência para o humano: decidir se `016` deve introduzir essa infra (afetaria
  > `card`/`list`/`membership` também) ou se fica para uma change futura dedicada a i18n de
  > erros de domínio.

## 4. Frontend — chips e popover de etiquetas

- [x] 4.1 Adicionar `labels: { id: string; name: string; color: string }[]` a `CardState`
  (`apps/frontend/src/modules/boards/types/board-state.type.ts`) e reconciliar o campo ao
  receber `card.created`/`card.updated`/eventos de socket, seguindo o padrão de reconciliação
  já usado para os demais campos do cartão.
  - **Pré:** 3.4 concluída (backend envia `labels` no payload de cartão).
  - **Aceite:** `CardState` tipado sem `any`; estado do quadro reflete `labels` corretamente
    após criar/editar/mover cartão.
  > ✅ 2026-07-07 15:40 — `LABEL_COLORS`/`LabelColor`/`LabelState` adicionados em
  > `board-state.type.ts`; `CardState.labels` e `BoardState.labels` (catálogo do quadro)
  > tipados sem `any`. `board-state.reducer.ts`: `toCardState` inclui `labels` (vindo do
  > payload do socket); `applyLabelCreated/Updated/Deleted` reconciliam o catálogo do quadro
  > (idempotentes) e `applyLabelDeleted` também remove a etiqueta de `card.labels` em todos os
  > cartões. `use-board-socket.ts` ganhou `LabelDto`/`LabelEventPayload`/`LabelDeletedPayload` e
  > assinatura de `label.created`/`label.updated`/`label.deleted`. `board-page.component.tsx`
  > busca `GET /boards/:id` + `GET /boards/:boardId/labels` em paralelo para montar o estado
  > inicial (`BoardState.labels`).
- [x] 4.2 Renderizar chips de etiqueta no `kanban-card.component.tsx`, reproduzindo a paleta
  exata do mockup (`Quadro ao Vivo.dc.html`, variáveis `--lbl-<cor>-bg`/`--lbl-<cor>-fg` para
  `red`, `amber`, `green`, `blue`, `purple`, `teal`, `pink`) via tokens/classes do design system
  do frontend.
  - **Pré:** 4.1 concluída.
  - **Aceite:** cartão sem etiquetas não renderiza a linha de chips; cartão com etiquetas
    renderiza um chip por etiqueta com a cor correta; visual bate com o mockup (comparar com os
    PNGs `01-bs.png`/`02-bs.png`/`03-bs.png`).
  - **Não faça:** inventar cor fora das 7 da paleta.
  > ✅ 2026-07-07 15:50 — as 7 variáveis `--lbl-<cor>-bg`/`--lbl-<cor>-fg` (light e dark)
  > copiadas fielmente do mockup para `apps/frontend/src/app/globals.css` e registradas em
  > `@theme inline` (`--color-lbl-<cor>-bg/fg`) para gerar classes Tailwind estáticas
  > (`bg-lbl-<cor>-bg text-lbl-<cor>-fg`) em `modules/boards/util/label-color.util.ts`
  > (`labelColorClasses`/`labelColorSwatchClass`, mapa fechado nas 7 cores — sem interpolação
  > dinâmica de classe). `label-chip.component.tsx` novo, renderizado em
  > `kanban-card.component.tsx` acima do título, só quando `card.labels.length > 0`.
- [x] 4.3 Criar o componente de popover de etiquetas (acionado por um botão no cartão) que lista
  as etiquetas do quadro com estado atribuído/não atribuído (checkbox), chama
  `PUT`/`DELETE /boards/:boardId/cards/:cardId/labels/:labelId` ao alternar, e tem um campo de
  criação rápida (nome + seletor das 7 cores) que chama `POST /boards/:boardId/labels`.
  - **Pré:** 3.1, 3.2 e 4.1 concluídas.
  - **Aceite:** abrir o popover lista as etiquetas do quadro (via `GET /boards/:boardId/labels`);
    marcar/desmarcar reflete no cartão (via evento `card.updated` recebido no socket, não
    apenas otimisticamente); criar etiqueta nova aparece na lista do popover (via
    `label.created` recebido no socket).
  - **Não faça:** construir a tela de "Configurações do Quadro" (`020`); o popover é o único
    lugar de gestão de etiquetas nesta change.
  > ✅ 2026-07-07 16:00 — `label-popover.component.tsx` novo (Radix `Popover`/`Checkbox`
  > reaproveitados de `shared/components/ui`), acionado por um botão (ícone `Tag`, lucide) no
  > cartão. Lista `boardLabels` (carregada uma vez via `GET /boards/:boardId/labels` em
  > `board-page.component.tsx` e mantida viva por `label.created`/`label.updated`/
  > `label.deleted` no socket) com checkbox de atribuído/não atribuído; `onCheckedChange` chama
  > `handleToggleLabel` em `board-view.component.tsx`, que chama `PUT`/`DELETE
  > .../cards/:cardId/labels/:labelId` **sem** atualização otimista local — o cartão só reflete
  > a mudança quando o `card.updated` correspondente chega pelo socket (conforme exigido pelo
  > aceite). Campo de criação rápida (nome + 7 swatches de cor) chama `POST
  > /boards/:boardId/labels` via `handleCreateLabel`; a etiqueta nova aparece na lista assim
  > que `label.created` chega. Nenhuma tela de "Configurações do Quadro" criada.
- [x] 4.4 Mapear no i18n (pt/en) os textos do popover ("Etiquetas", "Criar etiqueta", nomes das
  7 cores) seguindo a estrutura de i18n já existente do frontend (`003`).
  - **Pré:** estrutura de i18n do frontend já existente.
  - **Aceite:** nenhum texto do popover hardcoded fora das chaves de i18n pt/en.
  > ✅ 2026-07-07 16:05 — chaves `labelPopover.*` e `labelColor.<cor>` adicionadas a
  > `messages.pt.ts`/`messages.en.ts`; todos os textos do popover (título, estado vazio, título
  > de criação, placeholder, botão, `aria-label` das 7 cores) usam `getMessage(...)`. Também
  > mapeadas as chaves de erro dos endpoints de `label`/`card-label` (`label.not.found`,
  > `label.name.required`, `label.color.invalid`, `createLabel.*`, `updateLabel.*`,
  > `deleteLabel.*`, `assignLabel.*`, `unassignLabel.*`) em pt/en, seguindo a mesma convenção
  > de códigos crus do restante do dicionário (mesma decisão registrada na 3.5 pelo especialista
  > de backend: sem infraestrutura nova de i18n de domínio).

## 5. Verificação

- [x] 5.1 Rodar `npx tsc --noEmit` em `apps/backend` e em `apps/frontend`, a suíte de testes
  Jest dos casos de uso de `label`/`card-label` (unitários com fakes), `npm run lint` (via
  turbo) e `npm run build` do frontend com `NEXT_IGNORE_INCORRECT_LOCKFILE=1`.
  - **Pré:** tasks 1–4 concluídas.
  - **Aceite:** `tsc` limpo nos dois apps; suíte de testes verde; lint sem erros; build do
  > ✅ 2026-07-06 17:20 — tsc limpo nos dois apps; Jest verde (modules/board 127, apps/backend 23); lint/build frontend ok; gate verde.
    frontend verde.
  > ⚠️ 2026-07-07 15:05 — PARCIAL (somente backend, escopo desta execução): `npx tsc --noEmit`
  > limpo em `apps/backend` e em `modules/board` (`npx tsc`); `npx jest` verde em
  > `modules/board` (127 testes) e em `apps/backend` (23 testes); `npx turbo run lint
  > --filter=@taskboard/backend` verde. `apps/frontend` (tsc/build) e tasks 4.x ficam para o
  > especialista de frontend.
  > ✅ 2026-07-07 16:15 — Complemento frontend: `npx tsc --noEmit -p apps/frontend` limpo;
  > `npx turbo run lint check-types --filter=@taskboard/frontend` verde (1 warning
  > pré-existente sem relação com `016`, em `app-logo.component.tsx`); `NEXT_IGNORE_INCORRECT_LOCKFILE=1
  > npm run build` (dentro de `apps/frontend`) verde (Next 16 Turbopack, todas as rotas
  > compiladas). Nenhum teste automatizado de frontend específico de `016` foi escrito nesta
  > execução (fora do escopo desta tarefa de implementação; suíte de testes de frontend do
  > projeto não cobre `boards` com testes unitários próprios além do e2e da `013`) — pendência
  > registrada abaixo.
- [x] 5.2 Validar manualmente com um cliente HTTP (curl) e um cliente `socket.io-client` real
  conectado à sala `board:{boardId}`: criar etiqueta, editar (renomear/recolorir), atribuir a um
  cartão, remover do cartão, excluir a etiqueta — observando os eventos `label.created`,
  `label.updated`, `card.updated` (com `labels`), `label.deleted` emitidos na sala correta.
  - **Pré:** 5.1 concluída.
  - **Aceite:** evidência registrada com os payloads reais observados de cada evento; caso
    cross-board (`cardId`/`labelId` de outro quadro) confirmado como `404` sem evento emitido.
  > ✅ 2026-07-07 15:05 — Fluxo completo validado via curl + JWT real: registro/login, criação
  > de quadro/lista/cartão, `POST /boards/:boardId/labels` (label criada, `blue`), `PUT
  > .../cards/:cardId/labels/:labelId` (assign — cartão retorna `labels: [...]`), `GET
  > /boards/:id` mostra a etiqueta aninhada no card, `DELETE .../labels/:labelId` (unassign —
  > `labels: []`), `PATCH .../labels/:id` (renomear/recolorir), `DELETE
  > /boards/:boardId/labels/:id` (exclusão). Não-membro: `403` em `GET`/`POST
  > /boards/:boardId/labels`. Cross-board: `PUT` com `labelId` de outro quadro → `404`; `PUT`
  > com `cardId` de outro quadro → `404`; nenhuma mutação nem evento emitido nesses casos.
  > Cliente `socket.io-client` real conectado a `board:{boardId}` (handshake JWT) capturou, na
  > ordem: `label.created` `{label}`, `card.updated` `{card: {..., labels:[{id,name,color}]}}`
  > (assign), `label.updated` `{label}` (rename/recolor), `card.updated`
  > `{card: {..., labels: []}}` (unassign), `label.deleted` `{labelId}`.
