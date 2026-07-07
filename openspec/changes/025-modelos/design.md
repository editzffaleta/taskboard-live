## Context

O módulo `board` (`modules/board`) já tem os agregados `board`, `membership`, `list` e `card`
(`005`/`007`/`008`), cada um com entidade + repositório (port) + casos de uso, implementados no
backend via Prisma (`apps/backend/src/modules/board/*.prisma.ts`) e expostos por
`board.controller.ts` (`@Controller('boards')`). `create-board` já resolve atomicidade
board+owner via um método dedicado no repositório (`BoardRepository.createWithOwnerMembership`,
usando `prisma.$transaction`) — este é o padrão que esta change estende para incluir listas e
cartões.

O mockup `mockups/Modelos.dc.html` define a galeria "Comece com um modelo": filtro por categoria
(Todos/Produto/Engenharia/Marketing/Vendas/Pessoal), card por modelo com nome, descrição, prévia
visual das colunas (barras) e botão "Usar modelo". Os 6 modelos visíveis no mockup:

1. **Engenharia — Scrum**: Backlog, Sprint, Em progresso, Concluído.
2. **Produto — Roadmap**: Agora, Próximo, Depois.
3. **Vendas — CRM**: Leads, Contato, Proposta, Fechado.
4. **Marketing — Editorial**: Ideias, Escrevendo, Revisão, Publicado.
5. **Pessoal**: A fazer, Fazendo, Feito.
6. **Engenharia — Bugs**: Reportado, Triagem, Corrigindo, Verificado.

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Catálogo estático (em código) dos 6 modelos acima, cada um com 3-4 listas e 2-4 cartões de
  exemplo por lista (dados coerentes com o nome de cada lista — ex.: cartões de exemplo de sprint
  no modelo Scrum).
- `create-board-from-template` cria `Board` + `BoardMember` owner + todas as `List`s + todos os
  `Card`s de exemplo do modelo **atomicamente** (uma falha no meio não deixa quadro parcial).
- `GET /board-templates` autenticado retornando o catálogo (fonte única no backend, front não
  duplica os dados).
- `POST /boards/from-template` autenticado criando o quadro e retornando o mesmo shape de
  `GET /boards/:id` (`get-board-detail`, de `009`), para o frontend navegar direto ao quadro pronto.
- Tela `/templates` com a galeria, filtro por categoria e navegação para o quadro criado.

**Non-Goals:**
- Tabela `BoardTemplate` no banco — o catálogo é estático, versionado em código; criar/editar
  modelos é trabalho de outra change futura, se algum dia for necessário.
- Editor de modelos pelo usuário ou modelos por conta/organização — não há conceito de tenant.
- Alterar as entidades/casos de uso `create-board`, `create-list` ou `create-card` existentes —
  eles continuam intactos; o fluxo de modelo é aditivo.
- Emitir eventos de tempo real granulares (`list.created`/`card.created`) durante a criação em
  lote — o quadro é criado e o frontend navega para ele já com os dados completos via
  `get-board-detail`; não há outro cliente "olhando" um quadro que ainda não existe.

## Decisions

- **Catálogo estático em `modules/board/src/template/`**: novo "agregado" leve, sem persistência
  própria — `board-template.types.ts` (tipos `BoardTemplate`, `BoardTemplateList`,
  `BoardTemplateCard`), `board-templates.catalog.ts` (constante `BOARD_TEMPLATES: BoardTemplate[]`
  com os 6 modelos, `id` em `kebab-case` estável, ex.: `scrum-engenharia`, `roadmap-produto`,
  `crm-vendas`, `editorial-marketing`, `pessoal`, `bugs-engenharia`) e
  `usecase/create-board-from-template.usecase.ts`. Exportado em `src/index.ts` (`export * from
  "./template"`), preservando os exports existentes de `board`/`membership`/`list`/`card`.
- **`create-board-from-template` recebe o catálogo por injeção de dependência, não hardcoded no
  use-case**: construtor recebe `templates: BoardTemplate[]` (produção passa `BOARD_TEMPLATES`,
  testes passam um catálogo fixo pequeno) — mantém o use-case testável sem depender do array real.
- **Atomicidade via método de repositório dedicado (mesmo padrão de `005`)**: adicionar
  `BoardRepository.createFromTemplate(input: { name, ownerId, lists: { title, cards: { title }[] }[]
  }): Promise<{ board, membership, lists, cards }>`. A implementação Prisma
  (`PrismaBoardRepository.createFromTemplate`) usa `prisma.$transaction` incluindo `board.create`,
  `boardMember.create`, e os `list.create`/`card.create` de cada lista/cartão do modelo, com
  `position` sequencial (0, 1, 2...) igual ao padrão de `create-list`/`create-card`. O domínio
  (`create-board-from-template.usecase.ts`) monta o payload a partir do template escolhido e chama
  esse único método — nunca abre transação Prisma diretamente.
  - **Por quê método novo em vez de reusar `create-board`+`create-list`+`create-card` em sequência**:
    chamar os três use-cases em sequência exigiria 1+N+M chamadas separadas ao banco sem garantia
    atômica (uma falha no meio deixaria quadro parcial) — inaceitável para uma feature cujo valor
    é "o quadro já nasce pronto".
- **Endpoints em `board.controller.ts`** (mesmo controller, sem controller novo):
  - `GET /board-templates`: autenticado (qualquer usuário logado), sem checagem de membership
    (não há quadro ainda); retorna `BOARD_TEMPLATES` mapeado para um DTO enxuto (`id`, `name`,
    `description`, `category`, `color`, `lists: { title, cardCount }[]` — cartões completos não
    precisam ir para a prévia, só a contagem/títulos das colunas, conforme o mockup mostra só as
    barras). Decisão: incluir `lists[].title` (para a prévia real de colunas do mockup) mas
    **não** os títulos dos cartões de exemplo no DTO de listagem — eles só existem no quadro após
    `POST /boards/from-template`.
  - `POST /boards/from-template`: `{ templateId: string, name?: string }`; `templateId` inválido →
    `NotFoundError('boardTemplate.not.found', 404)`; `name` ausente usa `template.name` como nome
    padrão do quadro (`Validator` mesmo padrão de `createBoard.name`); retorna o board recém-criado
    no formato de `get-board-detail` (reaproveitando `GetBoardDetail` já existente, chamado logo
    após `create-board-from-template` ter sucesso, mesmo padrão de outros endpoints do controller
    que combinam use-cases).
- **Frontend `/templates`**: nova página em `apps/frontend/src/app/(private)/templates/page.tsx` +
  módulo `apps/frontend/src/modules/templates/` (api client `templates.api.ts` com
  `listBoardTemplates()`/`createBoardFromTemplate()`, componentes `template-card.component.tsx`,
  `templates-gallery.component.tsx`, filtro de categoria client-side sobre a resposta de
  `GET /board-templates`). Botão "Usar modelo" chama `createBoardFromTemplate(templateId)` e, em
  sucesso, `router.push('/boards/' + board.id)`. Item "Modelos" adicionado a
  `app-navigation.config.ts` (rota `/templates`, ícone `LayoutTemplate` do `lucide-react`), ao lado
  de "Meus quadros"/"Arquivados". Fluxo opcional de "criar a partir de modelo" dentro do modal de
  criação de quadro do dashboard (`create-board-dialog.component.tsx`) **não** é implementado nesta
  change — a galeria dedicada em `/templates` já cobre o caso de uso; registrar essa decisão como
  desvio documentado caso outra mudança queira integrar os dois fluxos depois.
- **Skills dedicadas como implementação principal**: module-aggregate (mode manual/leve, sem
  entidade persistida), module-use-case, backend-prisma-repository, backend-prisma-sync-module
  (não aplicável — sem model novo, apenas reuso), backend-nest-controller, frontend-next-config.

## Risks / Trade-offs

- [Atomicidade de board+lists+cards] → método de repositório dedicado com `prisma.$transaction`
  cobrindo todos os inserts; teste de integração cria um modelo com 2 listas e cartões e confirma
  que tudo aparece junto ou nada aparece em caso de erro simulado.
- [Catálogo estático divergir do mockup ao longo do tempo] → `id`s estáveis e nomes/descrições
  copiados literalmente do mockup na task de catálogo; qualquer alteração futura do catálogo é
  uma edição de arquivo único (`board-templates.catalog.ts`), sem migration.
- [Duplicar posição/lógica de `create-list`/`create-card`] → aceitável: o método de repositório de
  criação em lote é intencionalmente separado (não uma dependência circular dos use-cases
  individuais), mas segue a mesma regra de `position` sequencial por lista/board já usada por eles.
- [Skill indicada não cobrir o caso inteiro] → aplicar até onde fizer sentido e registrar o desvio
  na evidência.
