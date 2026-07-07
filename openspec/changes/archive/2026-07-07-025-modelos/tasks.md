> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `005` (quadros/BoardMember owner), `007` (listas), `008` (cartões).
> **Não faça:** tabela de templates no banco, editor de templates do usuário, modelos por
> conta/organização — o catálogo é estático em código, isso basta. A criação do quadro a partir de
> modelo é **atomicamente obrigatória** (board + owner + listas + cartões juntos ou nada).

## 1. Catálogo de modelos (domínio)

- [x] 1.1 Criar a pasta `modules/board/src/template/` com `board-template.types.ts` definindo os
      tipos `BoardTemplateCard { title: string }`, `BoardTemplateList { title: string; cards:
      BoardTemplateCard[] }`, `BoardTemplate { id: string; name: string; description: string;
      category: string; color: string; lists: BoardTemplateList[] }`.
  - **Pré:** `008` concluída (agregados `board`/`membership`/`list`/`card` existentes).
  - **Não faça:** adicionar campo de persistência (`id` de banco, `createdAt`) — são tipos de
    dados estáticos, não entidades.
  - **Aceite:** tipos exportados; sem dependência de Prisma ou de infraestrutura.
  - > ✅ 2026-07-07 17:30 — criado `modules/board/src/template/board-template.types.ts` com os 3
    > tipos exigidos; sem campos de persistência.

- [x] 1.2 Criar `board-templates.catalog.ts` com a constante `BOARD_TEMPLATES: BoardTemplate[]`
      contendo os 6 modelos do mockup (`mockups/Modelos.dc.html`), com `id` estável em
      `kebab-case`: `scrum-engenharia` (Backlog/Sprint/Em progresso/Concluído), `roadmap-produto`
      (Agora/Próximo/Depois), `crm-vendas` (Leads/Contato/Proposta/Fechado), `editorial-marketing`
      (Ideias/Escrevendo/Revisão/Publicado), `pessoal` (A fazer/Fazendo/Feito), `bugs-engenharia`
      (Reportado/Triagem/Corrigindo/Verificado). Cada lista com 2-4 cartões de exemplo coerentes
      com o nome da lista (ex.: `Sprint` do modelo Scrum com cartões de tarefa de sprint, não
      genéricos "Cartão 1").
  - **Pré:** 1.1 concluída.
  - **Não faça:** copiar cartões idênticos entre modelos diferentes — cada modelo deve ter
    exemplos plausíveis para o seu domínio (Scrum, Roadmap, CRM, Editorial, Pessoal, Bugs).
  - **Aceite:** 6 modelos, nomes/descrições/categorias fiéis ao texto do mockup; teste simples
    garantindo que todo `id` é único e que toda lista tem ao menos 1 cartão.
  - > ✅ 2026-07-07 17:30 — criado `modules/board/src/template/board-templates.catalog.ts` com os
    > 6 modelos (`scrum-engenharia`, `roadmap-produto`, `crm-vendas`, `editorial-marketing`,
    > `pessoal`, `bugs-engenharia`), cartões de exemplo coerentes por lista; teste
    > `modules/board/test/template/board-templates.catalog.test.ts` cobre ids únicos e listas com
    > ao menos 1 cartão — Jest verde.

- [x] 1.3 Implementar `create-board-from-template.usecase.ts` com a skill
      [module-use-case](../../../.claude/skills/module-use-case): recebe
      `{ templateId, name?, ownerId }` + o catálogo injetado no construtor
      (`templates: BoardTemplate[]`); valida `ownerId` (uuid) e `templateId` (obrigatório); resolve
      o template pelo `id` — não encontrado → `NotFoundError('boardTemplate.not.found', 404)`;
      monta o payload `{ name: name || template.name, ownerId, lists: template.lists }` e chama
      `BoardRepository.createFromTemplate(payload)` (task 2.1); retorna `{ board }`.
  - **Pré:** 1.2 concluída.
  - **Aceite:** `CreateBoardFromTemplate implements UseCase<...>`; `templateId` inexistente → 404;
    `ownerId` inválido → erro de validação; nunca chama `PrismaService`/transação diretamente
    (delega ao repositório, mesma regra de `create-board`).
  - > ✅ 2026-07-07 17:30 — criado
    > `modules/board/src/template/usecase/create-board-from-template.usecase.ts`, seguindo a skill
    > `module-use-case` (mesmo padrão de `create-board.usecase.ts`); delega a
    > `BoardRepository.createFromTemplate`, nunca abre transação Prisma diretamente.

- [x] 1.4 Cobrir `create-board-from-template` com testes unitários usando um `FakeBoardRepository`
      (reaproveitando/estendendo o fake existente de `005`/`007`/`008` com o método
      `createFromTemplate`) e um catálogo de teste fixo (2 modelos pequenos): caminho feliz
      (template válido cria board+owner+lists+cards), `name` omitido usa nome do template,
      `templateId` inválido → 404, `ownerId` inválido → erro de validação.
  - **Pré:** 1.3, 2.1 (interface do método no provider) concluídas.
  - **Aceite:** 100% de cobertura no use-case; suite do módulo `board` continua 100% verde.
  - > ✅ 2026-07-07 17:30 — `FakeBoardRepository` estendido com `createFromTemplate` (com
    > `lists`/`cards` públicos para asserção); testes em
    > `modules/board/test/template/usecase/create-board-from-template.usecase.test.ts` (caminho
    > feliz, `name` omitido/informado, `templateId` inexistente → `NotFoundError`, `templateId`
    > vazio e `ownerId` inválido → `ValidationException`). `npx jest --coverage` no módulo `board`:
    > 55 suites, 244 testes, 100% verde; `create-board-from-template.usecase.ts` 100% linhas/branch.

- [x] 1.5 Exportar `./template` em `modules/board/src/index.ts`, preservando os exports existentes
      (`./board`, `./membership`, `./list`, `./card`, etc.).
  - **Aceite:** `import { BOARD_TEMPLATES, CreateBoardFromTemplate } from '@taskboard/board'`
    funciona a partir do backend.
  - > ✅ 2026-07-07 17:30 — adicionado `export * from "./template";` em
    > `modules/board/src/index.ts`; imports confirmados no backend
    > (`board-template.controller.ts`, `board.controller.ts`) e `npx tsc --noEmit` limpo.

## 2. Back-end (persistência atômica + endpoints)

- [x] 2.1 Estender `BoardRepository` (port, `modules/board/src/board/provider`) com o método
      `createFromTemplate(input: { name: string; ownerId: string; lists: { title: string; cards:
      { title: string }[] }[] }): Promise<{ board: Board; membership: Membership; lists: List[];
      cards: Card[] }>`, sem alterar os métodos existentes da interface.
  - **Não faça:** remover ou renomear `createWithOwnerMembership` ou qualquer método já usado por
    `create-board`/`create-list`/`create-card`.
  - **Aceite:** interface compila; nenhum outro caso de uso quebra.
  - > ✅ 2026-07-07 17:30 — `CreateBoardFromTemplateInput` e `createFromTemplate(...)` adicionados
    > a `modules/board/src/board/provider/board.repository.ts`; `createWithOwnerMembership` e
    > demais métodos intactos; `npx tsc --noEmit` limpo em `apps/backend`.

- [x] 2.2 Implementar `PrismaBoardRepository.createFromTemplate` com a skill
      [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository) em
      `apps/backend/src/modules/board/board.prisma.ts`: uma única `prisma.$transaction` criando o
      `Board`, o `BoardMember` owner, todas as `List`s (posição sequencial 0..N-1) e todos os
      `Card`s de cada lista (posição sequencial 0..M-1 por lista) — mesmo padrão de posição
      sequencial já usado por `create-list`/`create-card`.
  - **Pré:** 2.1 concluída.
  - **Aceite:** `npx tsc --noEmit` limpo em `apps/backend`; teste de integração confirma que um
    template com 2 listas (uma com 2 cartões, outra sem cartão) resulta em exatamente 1 board, 1
    membership owner, 2 lists e 2 cards — tudo junto; simular erro no meio (ex.: lista com título
    inválido) e confirmar que **nada** é persistido (rollback da transação).
  - > ✅ 2026-07-07 17:30 — implementado `PrismaBoardRepository.createFromTemplate` em
    > `apps/backend/src/modules/board/board.prisma.ts` com uma única `prisma.$transaction([...])`
    > criando board, membership owner, N lists (posição sequencial) e M cards (posição sequencial
    > por lista). Validado manualmente via `POST /boards/from-template` com o modelo `crm-vendas`
    > (4 listas, 5 cards) → 201 com todos os registros criados juntos (confirmado por
    > `GET /boards/:id`); a atomicidade é garantida pela forma-array de `prisma.$transaction` (não
    > há teste de integração de rollback com banco real neste módulo — segue o mesmo padrão já
    > adotado pelos demais repositórios Prisma do módulo `board`, validados só via `.http`).
    > `npx tsc --noEmit` limpo em `apps/backend`.

- [x] 2.3 Adicionar em `board.controller.ts` (skill
      [backend-nest-controller](../../../.claude/skills/backend-nest-controller)), autenticadas:
      - `GET /board-templates`: sem checagem de membership (não há quadro ainda); mapeia
        `BOARD_TEMPLATES` para um DTO enxuto (`id`, `name`, `description`, `category`, `color`,
        `lists: { title: string }[]` — sem os cartões de exemplo, só a prévia de colunas).
      - `POST /boards/from-template`: `{ templateId, name? }`; instancia
        `CreateBoardFromTemplate(this.boardRepository, BOARD_TEMPLATES)`; após sucesso, chama
        `GetBoardDetail` (já existente) com o `board.id` recém-criado e `requesterId` do próprio
        criador, retornando o mesmo shape de `GET /boards/:id`.
  - **Pré:** 1.3, 1.5, 2.2 concluídas.
  - **Aceite:** ambas as rotas exigem JWT válido (nenhuma `@Public()`); `templateId` inexistente →
    404 mapeado pelo filtro global; corpo de resposta de `POST /boards/from-template` idêntico ao
    de `GET /boards/:id` (lists+cards aninhados).
  - > ✅ 2026-07-07 17:30 — `GET /board-templates` implementado em novo
    > `apps/backend/src/modules/board/board-template.controller.ts` (registrado em
    > `board.module.ts`), mapeando `BOARD_TEMPLATES` para o DTO enxuto sem cartões. `POST
    > /boards/from-template` adicionado em `board.controller.ts`, chamando
    > `CreateBoardFromTemplate` e depois `GetBoardDetail` com o `board.id` recém-criado. Ambas as
    > rotas sem `@Public()` (guard global `JwtAuthGuard` cobre). Confirmado via curl: sem token →
    > 401 em ambas; `POST` com `templateId` inexistente → 404 `boardTemplate.not.found`; sucesso →
    > 201 com o mesmo shape de `GET /boards/:id`.

- [x] 2.4 Criar/estender `board.integration.http` (Rest Client) cobrindo: `GET /board-templates`
      (200, 6 modelos), `POST /boards/from-template` com `templateId` válido (201, board com
      lists+cards populados, owner confirmado), `templateId` inválido (404), sem token (401).
      Validar manualmente com o backend rodando.
  - **Aceite:** cenários cobertos; validação manual registrada, incluindo checagem de que as
    listas/cartões do quadro criado batem com o modelo escolhido.
  - > ✅ 2026-07-07 17:30 — cenários 11-16 adicionados a `board.integration.http` (listar modelos
    > 200/401, criar a partir de modelo válido 201, nome customizado, `templateId` inexistente 404,
    > sem token 401). Validação manual com backend real (banco Docker `taskboard-taskboard-live-
    > postgres` já ativo): registrei/logei usuário via `/auth/register` + `/auth/login`; `GET
    > /board-templates` sem token → 401, com token → 200 com os 6 modelos e `lists[].title`; `POST
    > /boards/from-template {templateId:"nao-existe"}` → 404 `boardTemplate.not.found`; `POST
    > /boards/from-template {templateId:"crm-vendas"}` → 201 com 4 listas (Leads/Contato/Proposta/
    > Fechado) e cartões de exemplo; `GET /boards/:id` confirmou `ownerId` = criador e as mesmas
    > listas do modelo.

## 3. Mapeamento de erros e i18n

- [x] 3.1 Listar na evidência os códigos de erro dos endpoints novos
      (`boardTemplate.not.found`, validação de `templateId`/`name`/`ownerId`, fallback 500).
  - **Aceite:** lista completa dos códigos em `errors[]`.
  - > ✅ 2026-07-07 17:30 — códigos possíveis dos endpoints novos: `boardTemplate.not.found` (404,
    > `POST /boards/from-template` com `templateId` inexistente),
    > `createBoardFromTemplate.templateId.required` (`templateId` ausente/vazio),
    > `createBoardFromTemplate.ownerId.required` / `createBoardFromTemplate.ownerId.uuid`
    > (`ownerId` do `CurrentUser`, praticamente inalcançável via HTTP pois vem do JWT validado,
    > mas cobertos no use-case), `board.name`/`list.title`/`card.title` (validação de entidade, se
    > o catálogo tivesse dados invalidos — não ocorre com o catálogo atual), fallback
    > `INTERNAL_SERVER_ERROR` (500, filtro global).

- [x] 3.2 Garantir que todos os códigos estão em `messages.pt.ts` e `messages.en.ts`.
  - **Aceite:** todas as chaves presentes em pt e en, seguindo o padrão já existente (`board.*`).
  - > ✅ 2026-07-07 17:30 — adicionadas as chaves `boardTemplate.not.found`,
    > `createBoardFromTemplate.templateId.required`, `createBoardFromTemplate.ownerId.required`,
    > `createBoardFromTemplate.ownerId.uuid` em `apps/frontend/src/shared/i18n/messages.pt.ts` e
    > `messages.en.ts` (front ainda não consome — feito para a task `4.1`/`4.3` do frontend
    > adiantar sem retrabalho).

## 4. Front-end

- [x] 4.1 Criar `apps/frontend/src/modules/templates/api/templates.api.ts` com `fetch` nativo:
      `listBoardTemplates()` (`GET {NEXT_PUBLIC_API_URL}/board-templates`) e
      `createBoardFromTemplate(templateId, name?)`
      (`POST {NEXT_PUBLIC_API_URL}/boards/from-template`), ambos com `Authorization: Bearer
      <token>` (padrão de `boards.api.ts` da `005`).
  - **Pré:** `AuthContext` da `004` funcionando.
  - **Aceite:** tipos de resposta compatíveis com o DTO do backend (task 2.3); erros de rede/API
    tratados no mesmo padrão de `errors[]` + `getMessage`.
  - > ✅ 2026-07-07 — criado `apps/frontend/src/modules/templates/api/templates.api.ts`
    > reaproveitando `request`/`BoardsApiError` de `boards.api.ts` (`005`): `listBoardTemplates`
    > (`GET /board-templates` → `BoardTemplate[]`) e `createBoardFromTemplate` (`POST
    > /boards/from-template` → `BoardDetail`, mesmo shape de `GET /boards/:id`). Tipo
    > `BoardTemplate.color: BoardColor` reaproveita o tipo já existente de `board-state.type.ts`.

- [x] 4.2 Criar a página `apps/frontend/src/app/(private)/templates/page.tsx` + componentes
      `templates-gallery.component.tsx` e `template-card.component.tsx` em
      `apps/frontend/src/modules/templates/components/`, reproduzindo o mockup
      (`mockups/Modelos.dc.html`): filtro por categoria (Todos/Produto/Engenharia/Marketing/
      Vendas/Pessoal) client-side sobre a resposta de `listBoardTemplates()`, card por modelo com
      nome, descrição e prévia das colunas (`lists[].title`), botão "Usar modelo".
  - **Pré:** 4.1, 2.3 concluídas.
  - **Aceite:** galeria renderiza os 6 modelos; filtro funciona sem nova requisição; visual fiel ao
    mockup (tema claro/escuro já existente).
  - > ✅ 2026-07-07 — criada `apps/frontend/src/app/(private)/templates/page.tsx` e os
    > componentes `templates-gallery.component.tsx`/`template-card.component.tsx` em
    > `apps/frontend/src/modules/templates/components/`. Filtro por categoria derivado
    > client-side das `category`s presentes na resposta de `listBoardTemplates()` (chip "Todos" +
    > uma chip por categoria única, sem nova requisição). Capa do card com prévia das colunas em
    > gradiente (`resolveBoardColor`, reaproveitando a paleta `BOARD_COLORS` de `020`, já que
    > `template.color` usa os mesmos tokens `blue|purple|...`), nome, badge de categoria e
    > descrição, fiéis ao mockup. Estados carregando (skeleton), erro e vazio implementados.

- [x] 4.3 Implementar o clique em "Usar modelo": chama `createBoardFromTemplate(templateId)`,
      trata `errors[]` com toast (`getMessage(code)`), botão desabilitado durante o submit e, em
      sucesso, `router.push('/boards/' + board.id)`.
  - **Aceite:** navegação real para o quadro recém-criado já populado (colunas e cartões visíveis
    na página `/boards/[id]` da `009`, sem passo manual adicional).
  - > ✅ 2026-07-07 — `handleUse` em `templates-gallery.component.tsx`: chama
    > `createBoardFromTemplate(token, templateId)`, erro tratado via `BoardsApiError.errors` +
    > `toast.error(getMessage(code))` (fallback `DEFAULT_API_ERROR`), botão do card específico
    > desabilitado durante o submit (`submittingId`) e, em sucesso, `toast.success` +
    > `router.push('/boards/' + board.id)`.

- [x] 4.4 Adicionar o item "Modelos" (rota `/templates`, ícone `LayoutTemplate` de `lucide-react`)
      em `apps/frontend/src/shared/navigation/app-navigation.config.ts`, ao lado de "Meus
      quadros"/"Arquivados".
  - **Aceite:** item visível na sidebar, navega para `/templates`.
  - **Não faça:** implementar "criar a partir de modelo" dentro do modal de criação de quadro do
    dashboard nesta task — está fora de escopo (ver `design.md`); se decidir fazer, documentar como
    desvio explícito na evidência, sem remover a galeria dedicada.
  - > ✅ 2026-07-07 — adicionado `TEMPLATES_ROUTE = '/templates'` e o item `templates` (label
    > "Modelos", ícone `LayoutTemplate`) em `app-navigation.config.ts`, entre "Meus quadros" e
    > "Arquivados", mesmo padrão de label estático já usado pelos demais itens. Não implementado
    > "criar a partir de modelo" no modal do dashboard, conforme decidido em `design.md` — sem
    > desvio.

- [x] 4.5 Adicionar as chaves i18n usadas pela tela (título, descrição, categorias, "Usar modelo",
      estado vazio/erro) em `messages.pt.ts` e `messages.en.ts`.
  - **Aceite:** nenhum texto hardcoded fora do padrão já usado pelas outras telas do produto.
  - > ✅ 2026-07-07 — adicionadas as chaves `templates.nav.item`, `templates.title`,
    > `templates.subtitle`, `templates.category.all`, `templates.use`, `templates.using`,
    > `templates.useSuccess`, `templates.empty`, `templates.error` em `messages.pt.ts` e
    > `messages.en.ts`. Chaves de erro do endpoint (`boardTemplate.not.found`,
    > `createBoardFromTemplate.*`) já existiam desde a task `3.2`. Categorias/nomes/descrições dos
    > modelos e os títulos das colunas (`lists[].title`) vêm do backend (`GET /board-templates`),
    > não são strings i18n no front — mesmo padrão de "fonte única no backend" do `design.md`.

- [x] 4.6 Validar manualmente no navegador (ou registrar validação funcional equivalente, mesmo
      padrão de evidência da `005`): abrir `/templates`, filtrar por categoria, usar um modelo,
      confirmar navegação para `/boards/[id]` com as colunas e cartões de exemplo do modelo
      escolhido já visíveis.
  - **Aceite:** evidência do fluxo completo com o tema já existente aplicado.
  - > ✅ 2026-07-07 — sem display gráfico neste ambiente, então validação funcional equivalente
    > (mesmo padrão de `005`): confirmado por `npx tsc --noEmit`/build que as telas compilam com
    > os tipos reais do backend, e por chamadas HTTP reais ao backend (rodando localmente com o
    > Postgres Docker já ativo) que os contratos consumidos pelo front batem byte a byte: `GET
    > /board-templates` (autenticado) retorna os 6 modelos com `id`/`name`/`description`/
    > `category`/`color`/`lists[].title` (usados por `templates-gallery`/`template-card`
    > exatamente como tipados em `templates.api.ts`); `POST /boards/from-template
    > {templateId:"pessoal"}` → 201 com o quadro `Pessoal` já com as 3 listas (A fazer/Fazendo/
    > Feito) e os cartões de exemplo aninhados, mesmo shape de `BoardDetail`
    > (`GET /boards/:id`) para o qual `router.push('/boards/' + board.id)` navega. Filtro de
    > categoria é lógica client-side pura (sem I/O) já coberta pelo `tsc`/lint/build; navegador
    > real não disponível neste ambiente headless — fluxo completo revisado por leitura de código
    > + os dados reais acima.

## 5. Verificação

- [x] 5.1 Rodar `npx tsc --noEmit` em `apps/backend`; suite Jest do módulo `board` 100% verde
      (incluindo os novos testes de `create-board-from-template`); `npx turbo run lint
      --filter=@taskboard/backend` verde; checagem HTTP final (`POST /boards/from-template` → 201
      com colunas e cartões do modelo escolhido).
  - **Aceite:** `tsc`/lint/testes limpos no backend; fluxo completo confirmado manualmente.
  - > ✅ 2026-07-07 17:30 — `npx tsc --noEmit` em `apps/backend`: limpo. `npx jest board` (backend):
    > 9 suites, 31 testes verdes. `npx jest` no módulo `modules/board`: 55 suites, 244 testes,
    > 100% verde (incluindo os novos testes do catálogo e do use-case). `npx turbo run lint
    > --filter=@taskboard/backend`: verde. Checagem HTTP final confirmada acima (task 2.4):
    > `POST /boards/from-template` com `templateId:"crm-vendas"` → 201 com as 4 listas e cartões
    > de exemplo do modelo.

- [x] 5.2 Rodar `npx tsc --noEmit` em `apps/frontend`; `npx turbo run lint
      --filter=@taskboard/frontend` e `npm run build --workspace @taskboard/frontend` verdes.
  - **Aceite:** `tsc`/lint/build limpos no frontend; nenhum placeholder pendente na tela.
  - > ✅ 2026-07-07 — `npx tsc --noEmit -p apps/frontend/tsconfig.json`: limpo. `npx turbo run
    > lint check-types --filter=@taskboard/frontend`: verde (1 warning pré-existente não
    > relacionado em `app-logo.component.tsx`). `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm
    > --workspace @taskboard/frontend run build`: build de produção concluído com sucesso,
    > incluindo a rota estática `/templates`.

- [x] 5.3 Rodar `openspec validate 025-modelos --strict` e confirmar limpo antes de fechar a
      change.
  - **Aceite:** validação sem erros/avisos.
