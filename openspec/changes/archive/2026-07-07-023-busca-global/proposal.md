> **Contrato de leitura (obrigatório, nesta ordem):**
> 1. Orientação mínima do OpenSpec (`openspec/project.md`, `openspec/shared/como-executar.md`,
>    `openspec/shared/regras-de-nomenclatura.md`).
> 2. Este `proposal.md` inteiro.
> 3. `design.md` desta change.
> 4. `specs/busca-global/spec.md` desta change.
> 5. `mockups/Busca Global.dc.html` (define os grupos de resultado, os filtros e o atalho).
> 6. Só então os arquivos que o `design.md` citar explicitamente (repositórios/casos de uso do
>    módulo `board`, `archived.controller.ts` como modelo de endpoint agregado,
>    `archived-view.component.tsx`/`boards.api.ts` como modelo de tela+API do frontend).
> **Não abrir mais nada além disso** — se faltar contexto, o defeito é deste `proposal.md`/
> `design.md`, não motivo para varrer o repositório.

## Why

O TaskBoard Live já tem vários quadros por usuário (`003`/`005`) e cartões com título/descrição/
labels/prazo/responsáveis (`007`/`008`/`010`/`011`/`012`), mas não há **nenhuma forma de buscar**
nada disso — encontrar um cartão específico exige abrir quadro por quadro e vasculhar colunas
manualmente. Toda ferramenta de produtividade equivalente (Trello, Linear, Notion) resolve isso
com uma busca global e um atalho de teclado (`⌘K`/`Ctrl+K`) acessível de qualquer tela. Esta
change fecha essa lacuna: um endpoint de busca agregado, escopado ao que o usuário pode acessar,
consumido por uma tela dedicada e por um command palette global.

## What Changes

- **Backend**: novo endpoint `GET /search?q=...` (autenticado), que busca, **somente dentro dos
  quadros de que o usuário é membro**: quadros cujo `name` casa com `q` e cartões (não
  arquivados) cujo `title`/`description` casa com `q`, com um novo caso de uso `Search`
  reaproveitando `MembershipRepository`/`BoardRepository`/`ListRepository`/`CardRepository` já
  existentes. Resposta agregada `{ boards: [...], cards: [...] }`, limitada por grupo.
- **Frontend**: nova tela `/search` reproduzindo o mockup (campo, resultados agrupados por
  Quadros/Cartões, filtro de tipo client-side, navegação para o quadro/cartão); e um **command
  palette global** (`⌘K`/`Ctrl+K`, acessível de qualquer rota privada) que chama o mesmo
  endpoint com debounce e navega diretamente ao resultado escolhido.
- **Capabilities**: `New: busca-global`.

## Impact

- Módulo `board` (`modules/board/src`): novo caso de uso `Search`
  (`modules/board/src/board/usecase/search.usecase.ts`); nenhum repositório novo, apenas métodos
  de busca adicionados às interfaces `BoardRepository`/`CardRepository` já existentes.
- Backend Nest (`apps/backend/src/modules/board`): novo `SearchController`
  (`search.controller.ts`), registrado no `BoardModule` já existente. Sem migration (nenhum
  campo novo de schema).
- Frontend (`apps/frontend/src/modules/boards`): nova função de API (`boards.api.ts`), nova rota
  `/search`, novo componente de command palette montado no layout privado
  (`apps/frontend/src/app/(private)/layout.tsx`).
- Sem alteração em contratos de tempo real (`RealtimeEmitter`) — busca é síncrona, sem socket.

## Fora de escopo

- Indexação externa (Elasticsearch/Algolia/similar) — `contains`/`ILIKE` via Prisma basta para o
  volume atual.
- Busca fuzzy avançada, ranking por relevância, highlighting server-side, busca por
  responsáveis/pessoas ("Pessoas", presente no mockup como referência visual) — fora de escopo
  nesta change; a interface expõe apenas o filtro Quadros/Cartões que o backend suporta.
  Comentado explicitamente na `tasks.md`.
- Busca em `Activity`, `Comment`, `ChecklistItem` — não fazem parte do escopo desta change.
- Paginação de resultados — cada grupo é limitado a um teto fixo (ver `design.md`), sem "carregar
  mais".
