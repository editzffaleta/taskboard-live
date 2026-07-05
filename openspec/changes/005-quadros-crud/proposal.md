> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/quadros/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Com login/JWT prontos (`004`), o TaskBoard Live ainda não tem nenhum conceito de quadro. Esta
mudança cria o módulo de negócio `board` — a espinha dorsal do produto — com os agregados `board`
e `membership`, permitindo que um usuário autenticado crie quadros, veja os seus, renomeie e exclua
os que possui, e navegue até o quadro (a experiência ao vivo dentro do quadro é a `009`). Não há
organização/tenant/RBAC global: a autorização é resolvida por `BoardMember` (owner/member) por
quadro.

## What Changes

- Criar o módulo de negócio `board` com os agregados `board` e `membership`.
- Implementar a entidade `board` (`name`, `ownerId`) e a entidade `membership`
  (`boardId`, `userId`, `role` em `owner|member`).
- Casos de uso: `create-board` (cria o `Board` e, na mesma transação, um `BoardMember`
  `role='owner'` para o criador), `rename-board`, `delete-board` (somente owner), `list-my-boards`
  (quadros onde o usuário autenticado é membro) e `get-board` (detalhe; somente membro). Cobrir
  todos com testes unitários usando fakes.
- Sincronizar os models `Board` e `BoardMember` no Prisma (migration), com `unique(boardId, userId)`
  em `BoardMember`, e implementar os repositórios Prisma correspondentes.
- Expor os endpoints autenticados sob `/boards`: `POST /boards`, `GET /boards` (meus quadros),
  `GET /boards/:id`, `PATCH /boards/:id`, `DELETE /boards/:id`. Checagem de acesso via
  `BoardMember`: apenas membros leem o detalhe; apenas owner renomeia/exclui.
- Mapear no i18n (pt/en) os erros dos endpoints de `/boards`.
- No frontend, criar o dashboard em `app/(private)` listando "meus quadros" (cards clicáveis),
  botão de criar quadro (modal/form) e navegação para `/boards/[id]` (rota placeholder — a página
  detalhe/ao-vivo completa é a `009`).

## Capabilities

### New Capabilities
- `quadros`: Módulo `board` do TaskBoard Live com os agregados `board` e `membership` — criação de
  quadro com owner automático via `BoardMember`, renomeação e exclusão restritas ao owner, listagem
  dos quadros do usuário autenticado, detalhe restrito a membros, persistência Prisma e dashboard no
  frontend com criação e navegação para o quadro.

### Modified Capabilities
<!-- Nenhuma. -->

## Impact

- **Backend**: novo módulo `board` (agregados `board` e `membership`, casos de uso `create-board`,
  `rename-board`, `delete-board`, `list-my-boards`, `get-board` com testes unitários), repositórios
  Prisma em `apps/backend/src/modules/board`, `board.controller.ts` expondo `/boards`, models
  `Board`/`BoardMember` no Prisma + migration.
- **Frontend**: dashboard em `app/(private)` listando quadros do usuário, modal/form de criação,
  navegação para `/boards/[id]` (rota placeholder).
- **Contratos**: as interfaces do módulo `board` (`BoardRepository`, `MembershipRepository`) não
  podem ser alteradas pelas implementações Prisma.
- **Fora de escopo**: listas e cartões (`007`/`008`), tempo real (`006`), convites de membros
  além do owner (`010`).
- **Dependências**: `004` (login/JWT).
- **Habilita**: `006` (tempo real), `007` (listas), `008` (cartões), `009` (quadro ao vivo),
  `010` (compartilhamento de membros), `011` (atividade do quadro) — todas dependem do agregado
  `board` e da checagem de membership criados aqui.
