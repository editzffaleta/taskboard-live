<p align="center">
  <img src="docs/assets/capa.svg" alt="TaskBoard Live — quadro kanban colaborativo em tempo real (Turborepo · NestJS · Next.js · Prisma · Socket.IO)" width="100%"/>
</p>

# TaskBoard Live — quadro kanban colaborativo em tempo real

Um quadro kanban colaborativo estilo Trello simplificado: **duas pessoas abrem o mesmo quadro e
veem os cartões se moverem ao vivo.** React/Next.js no front, **WebSockets (Socket.IO)** no back —
tempo real de verdade, não só CRUD.

Construído **spec-driven**, uma mudança OpenSpec por vez, em **Clean Architecture + DDD**, com dois
portões de qualidade por change e um time de agentes que executa em trilhos.

> Visão geral aqui. Passo a passo operacional em **[`WORKFLOW.md`](./WORKFLOW.md)**; a fonte única
> de instruções para agentes é **[`AGENTS.md`](./AGENTS.md)**.

## O que faz

- **Quadros** — crie quadros, veja "meus quadros", abra um quadro.
- **Listas e cartões** — colunas e cartões com **drag-and-drop** (mover entre colunas, reordenar).
- **Tempo real** — cada movimento é transmitido por Socket.IO à sala do quadro; quem está com o
  quadro aberto vê a mudança **sem recarregar**, com update otimista + reconciliação.
- **Presença** — avatares de quem está vendo o quadro naquele momento.
- **Compartilhamento** — convide membros por e-mail; autorização por quadro (`owner`/`member`).
- **Atividade** — feed do quadro ("Fulano moveu o cartão X"), ao vivo.

## Stack

- **Monorepo:** Turborepo + npm workspaces
- **Backend:** NestJS — `apps/backend` (:4000) · **tempo real:** Socket.IO gateway
- **Frontend:** Next.js (App Router, TS) — `apps/frontend` (:3000) · **DnD:** `@hello-pangea/dnd`
- **ORM/DB:** Prisma + PostgreSQL
- **Testes:** Jest (unitário/integração) + Playwright (e2e, incl. o teste de colaboração ao vivo)
- **Processo:** OpenSpec (spec-driven) + git + CI + gate com scanners
- **Arquitetura:** Clean Architecture + DDD (domain não importa infra; casos de uso recebem *ports*)

## Como o tempo real funciona

- Sala por quadro: **`board:{boardId}`**. O cliente conecta passando o JWT em
  `socket.handshake.auth.token` (mesmo segredo do HTTP) e entra emitindo `board:join {boardId}`;
  o gateway confere que o usuário é **membro** (`BoardMember`) antes de admitir na sala.
- Toda mutação REST (criar/mover cartão, etc.), **após** o caso de uso ter sucesso, transmite o
  evento pela porta **`RealtimeEmitter`**: `card.moved`, `card.created`, `list.moved`,
  `member.added`, `activity.created`, `presence.update`…
- O front aplica o evento no estado local e reconcilia — o autor da ação usa update otimista; os
  demais recebem ao vivo.

## Modelo de dados

```
User        { id, name, email, password }
Board       { id, name, ownerId → User, createdAt }
BoardMember { id, boardId → Board, userId → User, role: owner|member, unique(boardId,userId) }
List        { id, boardId → Board, title, position, createdAt }        // coluna do kanban
Card        { id, listId → List, title, description?, position, createdAt }
Activity    { id, boardId → Board, actorId → User, type, data (json), createdAt }
```

## Estrutura

```
.
├── README.md                  ← este arquivo (visão geral)
├── WORKFLOW.md                ← guia operacional passo a passo
├── AGENTS.md                  ← fonte ÚNICA de instruções para qualquer agente
├── CLAUDE.md / GEMINI.md / .cursor/ / .windsurf/ / .github/  ← adaptadores finos (só apontam)
├── docs/                      ← auditoria, portabilidade, deploy, segurança
├── changes-templates/         ← as changes OpenSpec do TaskBoard Live (000–013)
│   ├── 000-orquestracao-execucao/   ← o "maestro": como o projeto é construído (ledger)
│   ├── 001…004-*/                   ← base + design system + registro + login
│   ├── 005…011-*/                   ← domínio kanban em tempo real
│   └── 012…013-*/                   ← hardening HTTP + fundação e2e
├── .agents/skills → .claude/skills  ← symlink cross-tool
└── .claude/
    ├── agents/                ← time de agentes (orquestrador + especialistas)
    ├── commands/              ← /inicializar, /orquestrar, /analisar, /portao
    └── skills/                ← catálogo de skills (implementação das tasks)
```

## As changes (`changes-templates/`, 000–013)

O sistema inteiro está especificado em **14 changes OpenSpec**, na ordem topológica das
dependências. Cada `proposal.md` abre com um **contrato de leitura** (a lista fechada do que abrir),
e cada task tem `Aceite:`/`Pré:`/guardrails — os trilhos que mantêm a execução sob ≤ ~250k tokens
por change. Mapa completo e contrato de tempo real em [`changes-templates/README.md`](./changes-templates/README.md).

| # | Change | Entrega |
|---|---|---|
| 000 | orquestração/execução | maestro + ledger (processo) |
| 001–002 | base · design system | monorepo, Prisma, shell, tokens |
| 003–004 | registro · login | `auth`, bcrypt, JWT, `AuthContext`/`AuthGuard` |
| 005 | quadros | módulo `board`, CRUD, membership |
| 006 | tempo real | **Socket.IO gateway**, salas, presença, `RealtimeEmitter` |
| 007–008 | listas · cartões | colunas e cartões, mover, eventos ao vivo |
| 009 | quadro ao vivo | **vitrine**: página kanban com DnD + updates ao vivo |
| 010–011 | membros · atividade | compartilhamento por e-mail, feed do quadro |
| 012–013 | hardening · e2e | helmet/CORS/rate limit, Playwright (colaboração ao vivo) |

## O time de agentes (`.claude/agents/`)

Um **orquestrador** dirige; **especialistas** executam por disciplina (backend, frontend, database,
e2e, arquitetura, segurança, deploy, openspec). Coordenação **hub-and-spoke**: os especialistas
reportam ao orquestrador e não conversam entre si por padrão.

## Comandos (`.claude/commands/`)

- **`/inicializar`** — bootstrap do projeto novo (pré-`000`): monorepo + git + OpenSpec + CI/gate e
  cópia das changes para `openspec/changes/`. Ponto de entrada.
- **`/orquestrar [id]`** — dispara o orquestrador a partir da `000`; constrói tudo sequencialmente.
- **`/analisar <id>`** — portão **pré-build**: coerência dos artefatos + constituição. Somente-leitura.
- **`/portao <id>`** — portão **pós-build** (Definition of Done): typecheck, testes,
  `openspec validate --strict` e gate com scanners (gitleaks, npm audit, Semgrep, Trivy).

## Fluxo (resumo)

1. **Bootstrap:** rode **`/inicializar`**.
2. **Construção:** rode **`/orquestrar`**. Por mudança: **`/analisar`** (pré-build) → sub-passos por
   especialista (sequencial) → **`/portao`** (pós-build) → archive → commit → ledger →
   `EXECUTION-LOG.md` → **zerar contexto**.
3. **Entrega:** merge de `main` → `producao` publica via Dokploy (`docs/deploy-dokploy.md`).

## Regras de ouro

- Nunca mergeia no `main` com gate/CI vermelho; **scan pulado local nunca é verde definitivo**.
- Nunca commita segredo (`.env`); só `.env.example` é versionado. Env de produção = painel Dokploy.
- 1 change OpenSpec = 1 branch = 1 PR. Execução **sequencial**, nunca paralela.
- **Dois portões por change**: `/analisar` (pré-build) → build → `/portao` (pós-build).
