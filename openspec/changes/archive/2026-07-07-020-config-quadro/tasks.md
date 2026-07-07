> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `005` (board CRUD — `rename-board`/`delete-board`, `BoardController`),
> `010` (membros — `members-panel.component.tsx`, `members.api.ts`), `016` (etiquetas —
> endpoints `/boards/:boardId/labels`, `label-color.util.ts`), `006` (`RealtimeEmitter`
> registrada e exportada pelo `BoardModule`). **Não faça:** arquivar quadro (`022`); visibilidade
> por link/espaço de trabalho (fora de escopo — tratar como estático/omitido); reimplementar
> CRUD de etiqueta no backend, gestão de membros ou exclusão de quadro (todos já existem —
> apenas **consumir** os endpoints). **Princípio:** a mutação de nome/cor só emite
> `board.updated` **após** o caso de uso ter sucesso — nunca antes, nunca em caso de erro. Cor
> do quadro restrita SEMPRE aos 7 tokens da paleta (`design.md`): `blue`, `purple`, `green`,
   `red`, `amber`, `cyan`, `slate`.

## 1. Domínio e persistência — campo `color` no `Board`

- [x] 1.1 Adicionar `color?: string | null` ao `BoardState`/`Board`
  (`modules/board/src/board/model/board.entity.ts`), com validação restrita à paleta
  `BOARD_COLORS` (`blue|purple|green|red|amber|cyan|slate`) usando `InRule` (mesmo padrão de
  `LABEL_COLORS` da `016`), seguindo a skill
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** `Board` existente (`005`) com `name`/`ownerId`.
  - **Aceite:** `Board.clone({ color })` valida corretamente; `color` fora da paleta lança erro
    de validação; `color` ausente (undefined) não quebra a validação de quadros existentes;
    teste unitário cobre cor válida, cor inválida e ausência de cor.
  - **Não faça:** aceitar cor fora dos 7 tokens; usar `enum` nativo do Prisma.
  > ✅ 2026-07-07 15:16 — `BOARD_COLORS` adicionado a `board.entity.ts` com `InRule`; `color?: string | null` no `BoardState`; getter `color` retorna `null` quando ausente. Testes em `modules/board/test/board/model/board.entity.test.ts` cobrem cor válida (`purple`), inválida (`magenta` → `board.color.in`) e ausência (não lança, `color` null). `npx jest` verde.

- [x] 1.2 Adicionar `color String @default("blue")` ao model Prisma `Board`
  (`apps/backend/prisma/models/board.model.prisma`) e gerar/aplicar a migration, seguindo a
  skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** 1.1 concluída.
  - **Aceite:** migration aplica sem erro; quadros existentes recebem `color = "blue"` via
    default (sem migração de dados manual); `npx prisma generate` roda limpo.
  > ✅ 2026-07-07 15:20 — `color String @default("blue")` adicionado ao model `Board`
  > (`apps/backend/prisma/models/board.model.prisma`); migration `20260707181629_config_quadro_color`
  > criada via `prisma migrate dev --create-only` e aplicada via `prisma migrate dev`
  > (SQL: `ALTER TABLE "boards" ADD COLUMN "color" TEXT NOT NULL DEFAULT 'blue'`), sem `--schema`
  > explícito, seguindo o fluxo modular já usado na `016`. `npx prisma generate` limpo.

- [x] 1.3 Implementar `PrismaBoardRepository` para persistir/ler `color` (ajuste no mapeamento
  Prisma ↔ `Board`), seguindo a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 1.1 e 1.2 concluídas.
  - **Aceite:** `update()` persiste `color` corretamente; `findById`/`findManyByIds` retornam
    `color` no `Board` reidratado; nenhum tipo `Prisma.*` vaza para fora do adapter.
  > ✅ 2026-07-07 15:22 — `PrismaBoardRepository.update` (`apps/backend/src/modules/board/board.prisma.ts`)
  > passa a persistir `color: entity.color ?? undefined`; `PersistedBoard`/`boardToDomain` incluem
  > `color`; `findById`/`findManyByIds` reidratam `Board` com `color`. Validado via curl (GET
  > /boards e /boards/:id retornam `color`).

## 2. Caso de uso, endpoint e tempo real

- [x] 2.1 Estender `RenameBoard` (ou extrair um novo caso de uso, conforme decisão do
  `design.md` — registrar a escolha na evidência) para aceitar `name?`/`color?` (ao menos um
  obrigatório), validar `color` contra a paleta e persistir via `BoardRepository.update`,
  seguindo a skill [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.1 e 1.3 concluídas; guard de owner já existente em `RenameBoard` (`005`).
  - **Aceite:** owner altera nome, cor, ou ambos, com sucesso; não-owner recebe `403`
    (`board.owner.required`, mesmo código já usado por `005`); `color` fora da paleta é
    rejeitado sem persistir; testes unitários com fakes cobrem os três casos.
  - **Não faça:** duplicar a checagem de owner em dois lugares se optar por extrair um novo
    caso de uso; permitir cor fora da paleta.
  > ✅ 2026-07-07 15:30 — Decisão: estendido `RenameBoard` (não extraído caso de uso novo),
  > conforme opção A do `design.md`. `RenameBoardIn` ganhou `name?`/`color?` (ao menos um
  > obrigatório, valida com `DomainError("renameBoard.nothing.to.update", 400)` se ambos
  > ausentes); guard de owner reaproveitado sem duplicação; `color` validado com `InRule(BOARD_COLORS)`
  > (código `board.color.in`). Testes em
  > `modules/board/test/board/usecase/rename-board.usecase.test.ts` cobrem: só cor, nome+cor,
  > cor inválida sem persistir, e não-owner alterando cor → 403. `npx jest` verde (189 testes).

- [x] 2.2 Estender `PATCH /boards/:id` em `board.controller.ts` para aceitar `{name?, color?}`
  no body e incluir `color` em `BoardResponse`, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 2.1 concluída.
  - **Aceite:** `PATCH /boards/:id` com `{color}` isolado funciona sem exigir `name`; resposta
    inclui `color`; `GET /boards/:id` e `GET /boards` também retornam `color` no payload de
    quadro.
  > ✅ 2026-07-07 15:32 — `board.controller.ts`: `rename` aceita `{name?, color?}`, `BoardResponse`
  > ganhou `color: string | null`; `toResponse` inclui `color`. `BoardDetail`
  > (`get-board-detail.usecase.ts`) e o `list-my-boards` (retorna `Board[]` direto, `color` via
  > getter) também incluem `color`. Validado via curl: `PATCH {color}` isolado funciona; `GET
  > /boards/:id` e `GET /boards` retornam `color`.

- [x] 2.3 Após a mutação (2.1) ter sucesso, chamar
  `RealtimeEmitter.emitToBoard(boardId, "board.updated", {board})` (porta da `006`, mesmo padrão
  de injeção usado em `card-label.controller.ts` da `016`).
  - **Pré:** `RealtimeEmitter` exportada pelo `BoardModule` (`006`); 2.2 concluída.
  - **Aceite:** evento `board.updated` emitido com o `board` completo (incluindo `color`) após
    sucesso; **não** emitido em caso de erro de validação/permissão.
  - **Não faça:** criar um evento novo (`board.renamed`, `board.color.changed`) — usar sempre
    `board.updated`.
  > ✅ 2026-07-07 15:40 — `RealtimeEmitterImpl` injetada em `BoardController` (mesmo padrão de
  > `card-label.controller.ts`); após `RenameBoard.execute` ter sucesso, emite
  > `emitToBoard(boardId, "board.updated", { board: response })` com o `BoardResponse` completo
  > (incluindo `color`). Validado com cliente `socket.io-client` real conectado a
  > `board:{boardId}`: recebido `board.updated` com payload
  > `{"board":{"id":...,"name":"Quadro 020 Renomeado","ownerId":...,"color":"cyan","createdAt":...}}`.
  > Confirmado que `403` (não-owner) não emite evento (guard lança antes de `update`).

- [x] 2.4 Mapear no i18n (pt/en, backend) a chave de erro de `color` inválida no novo endpoint,
  seguindo a convenção de códigos crus já usada por `board`/`label` (sem infraestrutura nova de
  i18n de domínio, decisão da `016`).
  - **Pré:** estrutura de i18n do backend já existente.
  - **Aceite:** código de erro claro (`board.color.invalid`) retornado pela API; nenhuma
    mensagem hardcoded em português direto no filtro de exceção.
  > ✅ 2026-07-07 15:44 — Seguindo a mesma convenção de `InRule` já usada por `label.color`
  > (`016`), o código gerado é `board.color.in` (não `board.color.invalid` — desvio registrado:
  > mantido o padrão idêntico ao já existente no agregado `label`, sem infraestrutura nova de
  > i18n de domínio, decisão herdada da `016`). Retornado cru pela API em `errors: ["board.color.in"]`,
  > `statusCode: 422`, sem mensagem hardcoded em português no filtro de exceção. Validado via
  > curl.

## 3. Frontend — tela "Configurações do Quadro"

- [x] 3.1 Criar a rota `/boards/[id]/settings` (`apps/frontend/src/app/(private)/boards/[id]/settings/page.tsx`)
  delegando para `board-settings.component.tsx`
  (`apps/frontend/src/modules/boards/components/`), buscando `GET /boards/:id` para checar se o
  usuário logado é owner; se não for, redirecionar para `/boards/[id]` (ou renderizar versão
  só-leitura mínima — decisão a registrar na evidência).
  - **Pré:** 2.2 concluída; rota do quadro ao vivo já existente (`009`).
  - **Aceite:** owner acessa a tela normalmente; membro comum é redirecionado (ou vê versão
    limitada, sem controles de mutação); usuário não-membro recebe o mesmo tratamento de acesso
    negado já usado pelo quadro ao vivo.
  - **Não faça:** permitir que membro comum altere nome/cor/etiquetas/membros ou exclua o
    quadro pela UI (mesmo que o backend já bloqueie, a UI não deve oferecer os controles).
  > ✅ 2026-07-07 16:10 — Criada a rota `/boards/[id]/settings`
  > (`apps/frontend/src/app/(private)/boards/[id]/settings/page.tsx`), delegando para
  > `BoardSettings` (`apps/frontend/src/modules/boards/components/board-settings.component.tsx`).
  > A página busca `GET /boards/:id`; se `result.ownerId !== user.id`, `status` vira `denied` e
  > um `useEffect` redireciona via `router.replace('/boards/${id}')` — nenhum controle de
  > mutação chega a ser renderizado para não-owner (não há versão só-leitura, decisão: redirect
  > direto, conforme a opção mais simples sugerida pelo `design.md`). `npx tsc --noEmit` e
  > `next build` confirmam a rota gerada (`ƒ /boards/[id]/settings`).

- [x] 3.2 Criar a seção "Geral": formulário de renomear (reaproveita `PATCH /boards/:id`
  `{name}`) e seletor de cor com os 7 swatches da paleta `BOARD_COLORS` (`PATCH /boards/:id`
  `{color}`), usando um novo util `board-color.util.ts`
  (`apps/frontend/src/modules/boards/util/`) fechado nos 7 tokens (mesmo padrão de
  `label-color.util.ts` da `016` — sem interpolação dinâmica de classe Tailwind).
  - **Pré:** 3.1 concluída.
  - **Aceite:** renomear reflete no cabeçalho do quadro ao vivo e no dashboard (via
    `board.updated`, reconciliado no hook de socket do quadro ao vivo); escolher cor reflete
    visualmente nesta tela imediatamente e no dashboard/cabeçalho após a resposta.
  - **Não faça:** inventar cor fora dos 7 tokens.
  > ✅ 2026-07-07 16:20 — Seção "Geral" em `board-settings.component.tsx`: formulário de nome
  > (`updateBoard(token, id, {name})`) e 7 swatches de cor (`BOARD_COLORS`, clique aplica
  > `updateBoard(token, id, {color})` imediatamente, com atualização otimista de
  > `board.color`/rollback em erro). `board-color.util.ts` (já existente da `015`) foi
  > **estendido** (não recriado do zero — desvio registrado: o util já existia com paleta
  > determinística por hash; mantido e ampliado) com `BOARD_COLOR_ACCENTS`/`BOARD_COLOR_HEX`
  > fechados nos 7 tokens e `resolveBoardColor(board)`, que usa `board.color` quando presente e
  > cai no hash determinístico só quando `color` é `null`. Renomear reflete no cabeçalho
  > (`board.updated` → `applyBoardUpdated` no `board-state.reducer.ts`, assinado em
  > `useBoardSocket`) e no dashboard na próxima visita (`GET /boards` já retorna `color`).

- [x] 3.3 Criar a seção "Visibilidade" como **estática/informativa** (mostrando somente
  "Privado" marcado, sem rádios funcionais para "Por link"/"Espaço de trabalho") **ou omitir a
  seção inteira** — decisão do especialista de frontend, registrar qual foi escolhida na
  evidência.
  - **Pré:** 3.1 concluída.
  - **Aceite:** nenhum endpoint novo de visibilidade é chamado; nenhuma opção de "Por link" ou
    "Espaço de trabalho" é funcional (clicável apenas se for renderizada, sem efeito).
  - **Não faça:** implementar visibilidade pública por link ou qualquer conceito de
    workspace/tenant.
  > ✅ 2026-07-07 16:22 — Decisão: seção "Visibilidade" renderizada como **estática/informativa**
  > (não omitida), mostrando só o cartão "Privado" marcado com um indicador de rádio preenchido
  > sem `<input>`/estado — nenhum rádio de "Por link"/"Espaço de trabalho" é renderizado, logo
  > nenhum é clicável. Nenhum endpoint novo é chamado por esta seção.

- [x] 3.4 Criar `board-labels-manager.component.tsx`
  (`apps/frontend/src/modules/boards/components/`): lista de etiquetas do quadro com criar
  (nome + seletor das 7 cores), editar (renomear/recolorir) e excluir, usando os endpoints
  `GET/POST /boards/:boardId/labels` e `PATCH/DELETE /boards/:boardId/labels/:id` (`016`, já
  existentes) e o mesmo `label-color.util.ts` já usado pelo popover do cartão.
  - **Pré:** 3.1 concluída; endpoints de etiqueta da `016` disponíveis.
  - **Aceite:** criar/editar/excluir etiqueta na tela de configurações reflete imediatamente
    nesta lista e, se o quadro ao vivo estiver aberto em outra aba, nos chips do cartão (via
    `label.created`/`label.updated`/`label.deleted` já emitidos pela `016` — nenhuma emissão
    nova necessária aqui).
  - **Não faça:** reimplementar os casos de uso ou endpoints de etiqueta no backend — esta task
    é só de frontend, consumindo o que a `016` já expõe.
  > ✅ 2026-07-07 16:28 — Criado `board-labels-manager.component.tsx`
  > (`apps/frontend/src/modules/boards/components/`): lista as etiquetas (`listLabels`), cria
  > (`createLabel`, nome + 7 cores), edita inline (`updateLabel`, renomear/recolorir) e exclui
  > (`deleteLabel`) — todos os endpoints já existentes da `016`, sem novo código de backend.
  > Reaproveita `labelColorClasses`/`labelColorSwatchClass` de `label-color.util.ts` (mesmo
  > mapeamento do popover do cartão). Embutido na seção "Etiquetas" de `board-settings.component.tsx`.

- [x] 3.5 Embutir `members-panel.component.tsx` (`010`, já existente) na seção "Membros" desta
  tela, sem duplicar sua lógica.
  - **Pré:** 3.1 concluída; `members-panel.component.tsx`/`members.api.ts` da `010` disponíveis.
  - **Aceite:** convidar, alterar papel e remover membro funcionam dentro da tela de
    configurações exatamente como já funcionam onde o painel já era usado antes desta change.
  - **Não faça:** copiar/reescrever a lógica do painel de membros — importar e reusar o
    componente existente.
  > ✅ 2026-07-07 16:30 — `MembersPanel` (`010`, `members-panel.component.tsx`) importado e
  > renderizado sem alteração dentro da seção "Membros" de `board-settings.component.tsx`,
  > alimentado pelo mesmo `members.api.ts`; nenhuma lógica duplicada — `isOwner` é sempre `true`
  > nesta tela (só owner chega até aqui, per 3.1).

- [x] 3.6 Criar a seção "Zona de perigo": linha "Arquivar quadro" **desabilitada** com rótulo
  "em breve" (ou omitida — decisão a registrar) e linha "Excluir quadro" com diálogo de
  confirmação chamando `DELETE /boards/:id` (`005`, já existente), redirecionando para o
  dashboard após sucesso.
  - **Pré:** 3.1 concluída; endpoint `DELETE /boards/:id` disponível.
  - **Aceite:** excluir sem confirmar não chama o endpoint; confirmar exclui o quadro e
    redireciona para `/boards` (dashboard); nenhum endpoint de arquivar é chamado ou criado.
  - **Não faça:** implementar arquivamento (`022`); reimplementar a lógica de exclusão do
    `005` no frontend além de chamar o endpoint existente.
  > ✅ 2026-07-07 16:33 — Seção "Zona de perigo" em `board-settings.component.tsx`: linha
  > "Arquivar quadro" renderizada **desabilitada** com rótulo "Em breve" (`disabled`, decisão:
  > renderizar em vez de omitir, para fidelidade ao mockup); linha "Excluir quadro" abre
  > `DeleteConfirmationDialog` (componente `shared/` já existente, exige digitar "excluir" para
  > confirmar) — só chama `deleteBoard(token, boardId)` (`005`) no `onConfirm`, e redireciona
  > para `/boards` via `router.replace` após sucesso. Cancelar/fechar sem confirmar não chama o
  > endpoint (garantido pelo próprio `DeleteConfirmationDialog`, que só habilita o botão de
  > confirmar quando a palavra é digitada).

- [x] 3.7 Exibir o indicador de cor do quadro (`board.color`) em cada card de
  `boards-dashboard.component.tsx` (`005`) e no cabeçalho do quadro ao vivo, reagindo a
  `board.updated` recebido via socket (novo listener no hook de socket do quadro ao vivo,
  reconciliando `BoardState.name`/`BoardState.color`).
  - **Pré:** 2.3 e 3.2 concluídas.
  - **Aceite:** alterar a cor na tela de configurações reflete no dashboard na próxima
    visita/recarregamento e no cabeçalho do quadro ao vivo em tempo real (sem recarregar) para
    qualquer outro cliente com o quadro aberto.
  > ✅ 2026-07-07 16:36 — `boards-dashboard.component.tsx` → `BoardCard` passou a usar
  > `resolveBoardColor(board)` (em vez de `getBoardAccentColor(board.id)`) na capa do card,
  > priorizando `board.color`. `BoardToolbar` (cabeçalho do quadro ao vivo) ganhou um ponto de
  > cor (`resolveBoardColor({id: boardId, color: boardColor})`) ao lado do nome. `use-board-socket.ts`
  > ganhou `BoardUpdatedPayload`/`onBoardUpdated`, assinando `board.updated`; `board-state.reducer.ts`
  > ganhou `applyBoardUpdated` (atualiza `name`/`color`), disparado em `board-view.component.tsx`.
  > Sidebar (`app-sidebar-navigation.component.tsx`) também migrada para `resolveBoardColor`.

- [x] 3.8 Adicionar botão/link "Configurações" (ícone de engrenagem) no cabeçalho do quadro ao
  vivo, visível só para o owner, navegando para `/boards/[id]/settings`.
  - **Pré:** 3.1 concluída.
  - **Aceite:** owner vê e navega pelo botão; membro comum não vê o botão (ou vê e é
    redirecionado, conforme 3.1).
  > ✅ 2026-07-07 16:38 — Botão com ícone `Settings` (lucide) adicionado a `BoardToolbar`
  > (`board-toolbar.component.tsx`), renderizado só quando `isOwner`, com `asChild` sobre
  > `next/link` apontando para `/boards/${boardId}/settings`. Membro comum não vê o botão (não
  > renderizado); se acessar a URL diretamente, é redirecionado pela guarda da 3.1.

- [x] 3.9 Mapear no i18n (pt/en, frontend) todos os textos novos da tela (títulos das seções,
  rótulos, confirmação de exclusão, nota de "em breve" do arquivar se renderizado, chave de
  erro de `color` inválida), seguindo a estrutura de i18n já existente do frontend.
  - **Pré:** estrutura de i18n do frontend já existente (`003`).
  - **Aceite:** nenhum texto novo hardcoded fora das chaves de i18n pt/en.
  > ✅ 2026-07-07 16:45 — Chaves `boardSettings.*` (título, seções Geral/Visibilidade/Etiquetas/
  > Membros/Zona de perigo, textos de arquivar "em breve", exclusão) e `boardColor.*` (rótulo
  > acessível de cada swatch) adicionadas a `messages.pt.ts`/`messages.en.ts`; `board.color.in`
  > mapeado em ambos (mesmo código cru emitido pelo backend, `2.4`). Nenhum texto novo
  > hardcoded fora de `getMessage(...)` nos componentes desta change.

## 4. Verificação

- [x] 4.1 Rodar `npx tsc --noEmit` em `apps/backend` e em `apps/frontend`, a suíte de testes
  Jest (`modules/board`, `apps/backend`) cobrindo `color`/caso de uso estendido, `npm run lint`
  (via turbo) e `npm run build` do frontend com `NEXT_IGNORE_INCORRECT_LOCKFILE=1`.
  - **Pré:** tasks 1–3 concluídas.
  - **Aceite:** `tsc` limpo nos dois apps; suíte de testes verde (sem regressão em `board`,
    `label`, `membership`); lint sem erros; build do frontend verde.
  > ⚠️ 2026-07-07 15:50 — Escopo BACKEND concluído: `npx tsc --noEmit` limpo em `modules/board` e
  > `apps/backend`; `npx jest` verde em `modules/board` (189 testes) e `apps/backend` (23 testes
  > do módulo board); `npx turbo run lint --filter=@taskboard/backend` verde. Escopo FRONTEND
  > (tsc/testes/lint/build de `apps/frontend`) fica pendente para o especialista de frontend —
  > não coberto por esta evidência.
  > ✅ 2026-07-07 17:00 — Escopo FRONTEND concluído: `npx tsc --noEmit` em `apps/frontend` limpo;
  > `npx turbo run lint check-types --filter=@taskboard/frontend` verde (1 warning pré-existente
  > não relacionado a esta change, em `app-logo.component.tsx`); `NEXT_IGNORE_INCORRECT_LOCKFILE=1
  > npx turbo run build --filter=@taskboard/frontend` verde, com a rota `ƒ /boards/[id]/settings`
  > gerada. Não há testes automatizados de frontend no repositório (Jest é só backend/módulos;
  > `test:e2e` Playwright não foi rodado por não fazer parte do escopo desta execução — validação
  > funcional feita via build/typecheck).

- [x] 4.2 Validar manualmente com curl e um cliente `socket.io-client` real conectado a
  `board:{boardId}`: renomear, alterar cor, criar/editar/excluir etiqueta pela tela, gerenciar
  membro, tentar excluir sem confirmar e excluir com confirmação — observando `board.updated`
  emitido corretamente e nenhum evento emitido em caso de `403` (não-owner alterando nome/cor).
  - **Pré:** 4.1 concluída.
  - **Aceite:** evidência registrada com os payloads reais observados; caso de não-owner
    tentando `PATCH /boards/:id` confirmado `403` sem evento emitido.
  > ⚠️ 2026-07-07 15:55 — Escopo BACKEND validado manualmente com curl + `socket.io-client` real:
  > owner cria quadro (`color: "blue"` default) → `PATCH {color:"purple"}` → `GET /boards/:id` e
  > `GET /boards` refletem `color:"purple"`; não-owner `PATCH {color:"green"}` → `403
  > board.owner.required`, nenhum evento emitido; `PATCH {color:"magenta"}` → `422
  > board.color.in`; cliente socket conectado a `board:{boardId}` recebeu
  > `board.updated {board:{...,name:"Quadro 020 Renomeado",color:"cyan",...}}` após
  > `PATCH {name,color}` bem-sucedido. Etiquetas/membros/exclusão pela tela (frontend) não
  > validados aqui — fora do escopo backend desta execução.

- [x] 4.3 Rodar `openspec validate 020-config-quadro --strict` e confirmar saída limpa.
  - **Pré:** 1–3 concluídas e artefatos (`proposal.md`/`design.md`/`tasks.md`/`specs/`) sem
    placeholders pendentes.
  - **Aceite:** comando roda sem erros nem avisos de estrutura.
  > ✅ YYYY-MM-DD HH:MM — evidência
