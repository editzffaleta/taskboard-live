<p align="center">
  <img src="docs/assets/logo.svg" alt="TaskBoard Live — quadro kanban colaborativo em tempo real (Turborepo · NestJS · Next.js · Prisma · Socket.IO)" width="100%"/>
</p>

<h1 align="center">TaskBoard Live</h1>

<p align="center">
  Quadro kanban colaborativo <strong>em tempo real</strong> — estilo Trello, com o rigor de um produto de verdade.<br/>
  Duas pessoas abrem o mesmo quadro e <strong>veem os cartões se moverem ao vivo</strong>.
</p>

<p align="center">
  <a href="https://github.com/editzffaleta/taskboard-live/actions/workflows/ci.yml"><img src="https://github.com/editzffaleta/taskboard-live/actions/workflows/ci.yml/badge.svg" alt="CI"/></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" alt="NestJS"/>
  <img src="https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socket.io" alt="Socket.IO"/>
  <img src="https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?logo=prisma" alt="Prisma"/>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"/>
</p>

<p align="center">
  <img src="docs/assets/board.png" alt="Quadro kanban do TaskBoard Live: sidebar, colunas com cartões (etiquetas, prazo, checklist, responsáveis), badge 'ao vivo' e seletor de visão" width="100%"/>
</p>

---

**Tempo real é o que separa um projeto júnior de CRUD de um que mostra domínio de arquitetura.**
O TaskBoard Live é um kanban colaborativo completo: cada mudança é transmitida por WebSockets para
todos que estão com o quadro aberto — com **update otimista + reconciliação**, **presença** e
**notificações ao vivo**. Cartões ricos (etiquetas, prazo, checklist, responsáveis, comentários,
anexos), **filtros e visões** (Kanban/Lista/Calendário), busca global, modelos e convites por link.
Tudo em **Clean Architecture + DDD**, testado de ponta a ponta e com **CI verde** em cada PR.

## ✨ Funcionalidades

- **Quadros, listas e cartões** com **drag-and-drop** (mover entre colunas e reordenar).
- **Cartão rico** — descrição, **etiquetas** coloridas, **prazo** (badge atrasado/hoje), **checklist**
  com progresso, **responsáveis**, **comentários**, **anexos** (upload), **capa** por cor, e uma aba
  de **atividade** do cartão. Ações: **mover**, **copiar**, **arquivar**.
- **Colaboração ao vivo** — mudanças de outros usuários aparecem **sem recarregar**, via Socket.IO,
  com **presença** (quem está no quadro) e um feed de **atividade** do quadro.
- **Filtros e visões** — filtre por etiqueta/responsável/prazo e alterne entre **Kanban**, **Lista** e
  **Calendário**.
- **Compartilhamento** — convide membros por e-mail ou **link de convite**; autorização **por quadro**
  (`owner`/`member`).
- **Notificações** — sino em tempo real (adicionado a um quadro, atribuído a um cartão, comentários).
- **Busca global** (⌘K), **modelos** de quadro pré-populados, **arquivados** (arquivar/restaurar),
  **configurações** de quadro (cor, etiquetas) e de conta (perfil, senha, tema, idioma).
- **Autenticação** — registro + login com JWT (bcrypt), rotas privadas protegidas; tema claro/escuro; i18n (pt/en).

## 📸 Telas

O **detalhe do cartão** — o coração do produto, com tudo o que um cartão de kanban precisa:

<p align="center">
  <img src="docs/assets/card-detail.png" alt="Modal de detalhe do cartão: descrição, etiquetas, checklist com progresso, anexos, abas Comentários/Atividade e barra lateral com Responsáveis, Data de entrega, Adicionar ao cartão e Ações" width="100%"/>
</p>

| Meus quadros | Visão Lista | Modelos | Tema escuro |
|---|---|---|---|
| ![Dashboard](docs/assets/dashboard.png) | ![Visões](docs/assets/views.png) | ![Modelos](docs/assets/templates.png) | ![Tema escuro](docs/assets/board-dark.png) |

## 🏗️ Arquitetura

Monorepo Turborepo. Frontend Next.js e backend NestJS conversam por **REST** (mutações) e
**WebSocket** (broadcast em tempo real). O backend segue **Clean Architecture / DDD**: o domínio não
conhece HTTP, Prisma ou Socket.IO — recebe *ports*.

```mermaid
flowchart LR
  subgraph Clientes
    A[Navegador A]
    B[Navegador B]
  end

  subgraph Frontend["Next.js · apps/frontend :3000"]
    UI["Board UI + @hello-pangea/dnd"]
    SC["socket.io-client (useBoardSocket)"]
  end

  subgraph Backend["NestJS · apps/backend :4000"]
    HTTP["Controllers REST (guard de membership)"]
    UC["Casos de uso (domínio · ports)"]
    GW["BoardGateway (Socket.IO)"]
    RE["RealtimeEmitter"]
  end

  DB[("PostgreSQL · Prisma")]

  A --> UI
  B --> UI
  UI -->|REST: criar/mover cartão| HTTP
  HTTP --> UC --> DB
  UC -->|após sucesso| RE --> GW
  GW -->|"salas board:{id} e user:{id}: card.moved, notification.created…"| SC --> UI
```

**Como o tempo real funciona:** o cliente conecta passando o JWT em `socket.handshake.auth.token` e
entra na sala `board:{boardId}` (só se for **membro**) e na sala `user:{userId}` (para notificações).
Toda mutação REST, **após** o caso de uso ter sucesso, transmite o evento pela porta `RealtimeEmitter`
(`card.moved`, `card.updated`, `list.moved`, `member.added`, `activity.created`, `notification.created`,
`presence.update`…). O autor da ação vê update otimista; os demais recebem o evento e reconciliam.

### Modelo de domínio (principais entidades)

```
User        { id, name, email, password }
Board       { id, name, ownerId → User, color, archivedAt, createdAt }
BoardMember { id, boardId, userId, role: owner|member, unique(boardId,userId) }
List        { id, boardId, title, position, archivedAt }
Card        { id, listId, title, description?, position, dueDate?, cover?, archivedAt }
  ↳ Label · CardLabel · ChecklistItem · CardAssignee · Comment · Attachment
Activity     { id, boardId, actorId, type, data (json), createdAt }
Notification { id, userId, type, data (json), readAt, createdAt }
Invitation   { id, boardId, email, token, role, status, createdAt }
```

## 🧰 Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Frontend | Next.js 16 (App Router, TS), `@hello-pangea/dnd`, `socket.io-client` |
| Backend | NestJS 11 (:4000), **Socket.IO gateway** (`@nestjs/websockets`), multer (uploads) |
| Dados | Prisma + PostgreSQL |
| Testes | Jest (unitário/integração, 100% nos casos de uso) + Playwright (e2e) |
| Segurança | helmet, CORS explícito, rate limit (`@nestjs/throttler`), JWT + bcrypt, validação de upload (magic bytes) |
| CI | GitHub Actions: lint · typecheck · build · gitleaks · Semgrep · Trivy · `openspec validate` |

## 🚀 Rodando localmente

**Pré-requisitos:** Node ≥ 22.11, Docker (para o PostgreSQL), npm.

```bash
git clone https://github.com/editzffaleta/taskboard-live.git
cd taskboard-live
npm install

# variáveis de ambiente (modelos versionados)
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# banco + schema
npm --workspace apps/backend run db:start            # PostgreSQL via Docker
npm --workspace apps/backend run prisma:migrate:deploy

# sobe backend (:4000) + frontend (:3000)
npm run dev
```

Abra <http://localhost:3000>, registre-se, crie um quadro (ou use um **modelo**) — e abra o mesmo
quadro em **duas abas (ou dois navegadores)** com usuários diferentes para ver a colaboração ao vivo.

**Testes:**

```bash
npm run test:e2e     # Playwright, inclui o teste de colaboração ao vivo (2 navegadores)
```

> O e2e sobe backend + frontend reais; veja a pré-condição em `playwright.config.ts`.

## 🧪 Qualidade

- **~300 testes** unitários e de integração; **100% de cobertura** nos casos de uso do domínio.
- **e2e de verdade:** um spec Playwright abre **dois contextos de navegador** (owner + membro),
  move um cartão em um e verifica que o outro vê a mudança **ao vivo, sem reload** — sem flake.
- **CI bloqueante** em cada PR: ESLint (type-aware), `tsc`, build, **gitleaks**, **Semgrep** (com
  Actions fixadas em SHA), `npm audit` e `openspec validate --strict`.

## 📐 Desenvolvimento spec-driven

Cada funcionalidade foi especificada em **[OpenSpec](https://github.com/Fission-AI/OpenSpec)**
(requisitos + design + tarefas) **antes do código**, em **Clean Architecture + DDD**, e entregue em
incrementos pequenos e independentes — **1 funcionalidade = 1 branch = 1 PR** com CI verde. A entrega
foi topológica: fundação (base, design system, auth) → domínio kanban em tempo real → cartão rico,
filtros/visões e configurações → plataforma (arquivados, busca, notificações, modelos, convites) →
anexos e o detalhe completo do cartão.

Os requisitos consolidados vivem em [`openspec/specs/`](./openspec/specs).

## 📄 Licença

[MIT](./LICENSE).
