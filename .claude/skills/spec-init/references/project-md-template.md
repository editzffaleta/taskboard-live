# Template — openspec/project.md

Conteúdo para preencher/ajustar o `openspec/project.md` após `openspec init`,
para que os comandos `/opsx:*` nasçam com contexto da stack e dos padrões.
A baseline abaixo reflete a "fábrica fullstack" (config-project-fullstack + as
skills `config-*`/`module-*`/`backend-*`/`frontend-*`). Ajuste o que não se
aplicar ao projeto específico.

---

## Project Context

Preencha com o propósito do projeto em 1–2 frases.

**Origem:** template fabrica-fullstack v{{versao-do-template}} — preencha com o conteúdo do
arquivo `VERSION` (ou a versão mais recente do `CHANGELOG.md`) da cópia do template usada.

### Tech Stack
- **Linguagem:** TypeScript
- **Runtime:** Node.js ≥ 20.19
- **Package manager:** npm (workspaces); monorepo com Turborepo
- **Frontend:** Next.js (App Router) — `apps/frontend` (porta 3000)
- **Backend:** NestJS — `apps/backend` (porta 4000), `ConfigModule.forRoot({ isGlobal: true })` + `app.enableCors()`
- **ORM/DB:** Prisma + PostgreSQL (schema modular por domínio em `apps/backend/prisma/models/*.model.prisma`)
- **Testes:** Jest (`jest --coverage`)
- **Pacote compartilhado:** `packages/*` — contratos, classes base, erros de domínio, casos de uso e regras de validação reutilizáveis
- **Conforme o projeto:** Redis + BullMQ, TipTap, MinIO, Resend, etc.

### Arquitetura (clean architecture)
- **Domínio** em `modules/<modulo>/src`: `entity` (herda de `Entity`, validação por regras), interface de `repository`, `use-case`, `provider`, `aggregate`.
- **Backend** em `apps/backend/src/modules/<modulo>`: controllers expõem os use-cases; implementação Prisma do repositório (`*.prisma.ts`); implementação concreta dos providers; registro no módulo Nest.
- **Frontend** em `apps/frontend/src/modules/<modulo>` + rotas em `app/(private|public)`.
- O backend expõe erros no padrão `ApiErrorResponse`, consumido pelo frontend.

### Comandos (na raiz do monorepo)
- `npm run dev` — desenvolvimento (turbo)
- `npm run lint` — lint
- `npm run check-types` (ou `npm run typecheck`) — checagem de tipos
- `npm run test` — testes (Jest via `turbo run test`)
- `npm run build` — build
- Gate completo: `bash scripts/ci/gate.sh`

### Convenções
- **Commits:** Conventional Commits; corpo explica o quê/porquê; trailer
  `OpenSpec-Change: <change-id>`.
- **Branch:** uma por change, `change/<change-id>`.
- **Fluxo:** trabalho em branch → gate verde → PR → CI verde → merge squash →
  `openspec archive`. Nunca commitar/forçar no `main`. Nunca commitar segredos.
- **Specs:** `openspec/specs/` é a fonte da verdade; `openspec/changes/` são
  propostas até serem arquivadas.
- **Constituição:** os princípios inegociáveis do projeto vivem em
  `openspec/memory/constitution.md` (P1–P9). Toda change os respeita; a `/analisar`
  (pré-build) e o `/portao` (pós-build) checam contra eles. Violar um princípio exige
  uma seção `## Constitution Exception` no `design.md` da change.

### Padrões de código
- Tipagem estrita; evitar `any`.
- Validação de entrada com as regras reutilizáveis do pacote compartilhado;
  tratamento de erro explícito (`ApiErrorResponse`).
- Testes unitários acompanham entidades, use-cases e validações (Jest).
- Segredos só via variáveis de ambiente (`.env`, documentadas em `.env.example`).
