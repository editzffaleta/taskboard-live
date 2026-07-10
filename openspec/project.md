# Project Context

**TaskBoard Live** — um quadro kanban colaborativo em tempo real (estilo Trello simplificado):
duas pessoas abrem o mesmo quadro e veem os cartões se moverem ao vivo. O diferencial do projeto
é o **tempo real** (Socket.IO), não o CRUD. Desenvolvido spec-driven, uma funcionalidade por vez.

### Tech Stack
- **Linguagem:** TypeScript
- **Runtime:** Node.js ≥ 22.11 (LTS)
- **Package manager:** npm (workspaces); monorepo com Turborepo
- **Frontend:** Next.js (App Router) — `apps/frontend` (porta 3000). Drag-and-drop com
  `@hello-pangea/dnd`; cliente `socket.io-client`.
- **Backend:** NestJS — `apps/backend` (porta 4000), `ConfigModule.forRoot({ isGlobal: true })` +
  `app.enableCors()`. **Tempo real:** Socket.IO gateway (`@nestjs/websockets` +
  `@nestjs/platform-socket.io`), salas `board:{id}` com handshake JWT.
- **ORM/DB:** Prisma + PostgreSQL (schema modular por domínio em `apps/backend/prisma/models/*.model.prisma`)
- **Testes:** Jest (`jest --coverage`) + Playwright (e2e)
- **Pacote compartilhado:** `packages/*` — contratos, classes base, erros de domínio, casos de uso
  e regras de validação reutilizáveis

### Arquitetura (clean architecture + DDD)
- **Domínio** em `modules/<modulo>/src`: `entity` (herda de `Entity`, validação por regras),
  interface de `repository`, `use-case`, `provider`, `aggregate`. O domínio **não** importa de
  `application`/`infrastructure`/`interface`; casos de uso recebem *ports*, nunca Prisma concreto.
- **Backend** em `apps/backend/src/modules/<modulo>`: controllers expõem os use-cases; implementação
  Prisma do repositório (`*.prisma.ts`); implementação concreta dos providers; registro no módulo Nest.
- **Frontend** em `apps/frontend/src/modules/<modulo>` + rotas em `app/(private|public)`.
- O backend expõe erros no padrão `ApiErrorResponse`, consumido pelo frontend.
- **Autorização é por quadro** (`owner`/`member` em `BoardMember`) — sem multi-tenancy nem RBAC global.

### Domínio (modelo canônico)
- `User { id, name, email, password }` · `Board { id, name, ownerId, createdAt }`
- `BoardMember { id, boardId, userId, role: owner|member, unique(boardId,userId) }`
- `List { id, boardId, title, position }` (coluna) · `Card { id, listId, title, description?, position }`
- `Activity { id, boardId, actorId, type, data, createdAt }`
- **Contrato de tempo real:** porta `RealtimeEmitter.emitToBoard(boardId, event, payload)` chamada
  **após** o caso de uso ter sucesso; eventos `card.*`, `list.*`, `member.added`, `activity.created`,
  `presence.update`.

### Comandos (na raiz do monorepo)
- `npm run dev` — desenvolvimento (turbo) · `npm run lint` — lint
- `npm run check-types` (ou `npm run typecheck`) — checagem de tipos
- `npm run test` — testes (Jest via `turbo run test`) · `npm run build` — build
- `npm run test:e2e` — Playwright (quando existir) · Gate completo: `bash scripts/ci/gate.sh`

### Convenções
- **Commits:** Conventional Commits em português; corpo explica o quê/porquê; trailer
  `OpenSpec-Change: <change-id>`.
- **Branch:** uma por change, `change/<change-id>`.
- **Fluxo:** trabalho em branch → gate verde → PR → CI verde → merge → `openspec archive`. Nunca
  commitar/forçar no `main`. Nunca commitar segredos.
- **Specs:** `openspec/specs/` é a fonte da verdade dos requisitos.

### Padrões de código
- Tipagem estrita; evitar `any`.
- Validação de entrada com as regras reutilizáveis do pacote compartilhado; tratamento de erro
  explícito (`ApiErrorResponse`).
- Testes unitários acompanham entidades, use-cases e validações (Jest).
- Segredos só via variáveis de ambiente (`.env`, documentadas em `.env.example`).
