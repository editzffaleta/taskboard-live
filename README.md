# Template — Fábrica Fullstack ({{produto}})

Template de desenvolvimento "fábrica fullstack": **NestJS + Next.js + Prisma + Turborepo**
(npm, Jest), **Clean Architecture + DDD**, já com **OpenSpec + git/CI** no fluxo. Você duplica
esta pasta, dispara a orquestração e o sistema é construído mudança a mudança, com portão de
qualidade entre cada uma.

> Este README é a visão geral. O passo a passo operacional está em **[`WORKFLOW.md`](./WORKFLOW.md)**.

## Stack

- **Monorepo:** Turborepo + npm workspaces
- **Backend:** NestJS — `apps/backend` (:4000)
- **Frontend:** Next.js 15 (App Router, TS) — `apps/frontend` (:3000)
- **ORM/DB:** Prisma + PostgreSQL
- **Testes:** Jest (unitário/integração) + Playwright (e2e)
- **Processo:** OpenSpec (spec-driven) + git + CI + gate de qualidade

## Estrutura

```
.
├── README.md                  ← este arquivo (visão geral)
├── WORKFLOW.md                ← guia operacional passo a passo
├── changes-templates/         ← changes OpenSpec reaproveitáveis (000–010)
│   ├── 000-orquestracao-execucao/   ← o "maestro": como o projeto é construído
│   └── 001…010-*/                   ← núcleo universal multi-tenant
└── .claude/
    ├── settings.json          ← guardrail (nega leitura de .env/secrets) — opcional
    ├── agents/                ← time de agentes (orquestrador + especialistas)
    ├── commands/              ← /inicializar, /orquestrar, /analisar, /portao
    └── skills/                ← catálogo de skills (config-*, module-*, backend-*, frontend-*, spec-*, security-*, deploy-*, e2e-*)
```

## O time de agentes (`.claude/agents/`)

Um **orquestrador** dirige; **especialistas** executam por disciplina. Coordenação
**hub-and-spoke**: os especialistas reportam ao orquestrador (eles não conversam entre si por
padrão — peer-to-peer só com Agent Teams, ver abaixo).

| Agente | Lane | Modelo |
|---|---|---|
| `orchestrator-fullstack` | maestro | opus |
| `architecture-specialist` | bookend (DDD + auditoria de dependência) | opus |
| `security-specialist` | bookend (STRIDE + auditoria OWASP) | opus |
| `backend-specialist` | builder | sonnet |
| `database-specialist` | builder | sonnet |
| `frontend-specialist` | builder | sonnet |
| `e2e-specialist` | builder/gate | sonnet |
| `deploy-specialist` | entrega | sonnet |
| `openspec-specialist` | processo | sonnet |

Detalhes e mapeamento de skills em `.claude/agents/README.md`.

## Comandos (`.claude/commands/`)

- **`/inicializar`** — bootstrap de projeto novo (pré-`000`): config do monorepo + `spec-init`
  (git + OpenSpec + CI) + `spec-conventions` (shared/templates/memory, incl. a **constituição**) e
  cópia das changes para `openspec/changes/`. É o ponto de entrada.
- **`/orquestrar [id]`** — dispara o orquestrador a partir da change `000`; constrói tudo
  sequencialmente. Opcionalmente retoma de uma mudança.
- **`/analisar <id>`** — portão **pré-build** (skill `spec-analyze`): confere a coerência dos
  artefatos da change (proposal/design/tasks/specs) e a conformidade com a **constituição**
  **antes** de implementar. Somente-leitura.
- **`/portao <id>`** — portão **pós-build** (Definition of Done): typecheck nos dois apps, testes,
  gate, `openspec validate --strict` — **depois** de implementar, antes de arquivar/mergear.

## Skills (`.claude/skills/`)

Cada skill é uma pasta com `SKILL.md` + `references/`/`assets/` (e `agents/openai.yaml`). Elas são
a **implementação principal** das tasks das changes. Grupos: Projeto (`config-project-fullstack`,
`spec-init`), DDD/Design (`ddd-strategic-design`, `security-threat-model`), Base
(`config-package-shared`, `config-prisma`, `backend-nest-config`, `frontend-next-config`), Domínio
(`module-*`), Backend (`backend-*`), Frontend (`frontend-next-config`, `spec-frontend-auth`),
Segurança (`backend-authorization`, `security-review`, `security-threat-model`), E2E
(`e2e-playwright`), Deploy (`deploy-node-ubuntu-vps`), Fluxo (`spec-flow`, `spec-analyze`, `spec-conventions`).
A referência rápida com a ordem de uso está no `WORKFLOW.md`.

## Fluxo (resumo)

1. **Bootstrap:** duplique esta pasta e rode **`/inicializar`** — prepara monorepo + OpenSpec +
   git + CI (via `config-project-fullstack` + `spec-init`) e copia as changes do
   `changes-templates/` para `openspec/changes/`. É o passo **pré-`000`** (a `spec-init` instala o
   OpenSpec que a `000` exige).
2. **Placeholders:** troque `{{produto}}`, `{{namespace}}`, papéis e códigos de tela nas changes
   copiadas (decisão de projeto).
3. **Construção:** rode **`/orquestrar`**. O orquestrador lê o ledger da change `000` e, por
   mudança, roda **`/analisar`** (portão pré-build: artefatos + constituição) antes de implementar
   em sub-passos (arquitetura → backend/banco → frontend → e2e → segurança), **sequencialmente**,
   fechando com o **`/portao`** (pós-build) entre cada uma. Você não dispara os especialistas a mão.

## Regras de ouro

- Os **princípios inegociáveis** do projeto vivem em `openspec/memory/constitution.md`; toda change os respeita (exceção só via `## Constitution Exception` no `design.md`).
- Nunca mergeia no `main` com gate/CI vermelho.
- Nunca commita segredo (`.env`); só `.env.example` é versionado.
- 1 change OpenSpec = 1 branch = 1 PR.
- Execução sequencial, nunca paralela (mudanças tocam arquivos compartilhados).
- **Dois portões por change**: `/analisar` (pré-build, artefatos + constituição) → build → `/portao` (pós-build, código/testes).

## Agent Teams (opcional)

Comunicação peer-to-peer real entre agentes é experimental e desligada por padrão. Habilite com a
env `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` no `settings.json`/ambiente — os mesmos arquivos de
`.claude/agents/` passam a ser teammates. Reserve para mudanças densas; tem limitações conhecidas.
