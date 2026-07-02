# Guia do template

Template "fábrica fullstack": **NestJS + Next.js + Prisma + Turborepo** (npm, Jest),
clean architecture, já com **OpenSpec + git/CI** no fluxo. Você duplica esta pasta
e segue daqui. A fonte única para agentes é o **`AGENTS.md`**.

> As skills ficam em `.claude/skills/`. Os comandos `/nome-da-skill` abaixo são as
> próprias skills; `/openspec:*` são do OpenSpec.

---

## 0. Setup da máquina (uma vez só)

```bash
gh auth login                              # GitHub CLI
node -v                                    # Node ≥ 20.19
openspec --version || npm i -g @fission-ai/openspec@latest

# opcional (o CI cobre, mas o gate local fica completo):
pipx install semgrep                       # SAST
# gitleaks e trivy: releases oficiais (brew install gitleaks trivy no macOS)
```

Detalhes: `.claude/skills/spec-init/references/setup-github.md`.

---

## 1. Projeto novo

1. **Duplique esta pasta** e abra no Claude Code (ou outro agente — todos leem o `AGENTS.md`).
2. **`/inicializar`** — bootstrap **pré-`000`**: roda antes da `000` porque é quem instala o
   OpenSpec que ela exige. Encadeia os passos abaixo e ainda copia as changes para
   `openspec/changes/`. Por baixo, é:
   - `/config-project-fullstack` — cria o monorepo (Next em `apps/frontend` :3000,
     NestJS em `apps/backend` :4000).
   - `/spec-init` — adiciona OpenSpec + CI + **gate com scanners** + git hooks, faz o commit
     inicial e (perguntando público/privado) cria o repo no GitHub com o `main` protegido.
   - `/spec-conventions` — semeia `openspec/shared/`, `templates/` e `memory/` (produto,
     contexto-técnico, estrutura e a **`constitution.md`** com os princípios P1–P9) + o
     `EXECUTION-LOG.md`. Ajuste a constituição ao seu domínio (não é sobrescrita depois).
3. **Base (uma vez por projeto):** `/config-package-shared`, `/config-prisma`,
   `/backend-nest-config`, `/frontend-next-config`.

---

## 2. Construção orquestrada (o caminho padrão)

Rode **`/orquestrar`**. O orquestrador lê o ledger da `000` e, **por mudança**:

1. **`/analisar <id>`** — portão pré-build (artefatos + constituição). FAIL → corrige a change.
2. **Sub-passos por especialista** (sequencial, um por vez), cada um com o briefing-padrão e o
   **contrato de leitura** da change — o executor abre SÓ o que o contrato lista.
3. **`/portao <id>`** — portão pós-build: typecheck nos dois apps, testes, `openspec validate
   --strict` e `gate.sh` com **gitleaks + npm audit + Semgrep + Trivy bloqueantes**.
4. `/openspec:archive` → commit → checkbox no ledger → **`EXECUTION-LOG.md`** →
   **zerar o contexto** antes da próxima mudança.

## 2b. Cada feature manual (quando não usar o orquestrador)

1. `/openspec-propose "<a feature>"` — cria a change (`proposal.md`, `specs/`,
   `design.md`, `tasks.md`) — inclua o **contrato de leitura** no topo (modelo nas changes 000–010).
2. `/analisar <id>` — **FAIL → corrija a change antes de codar.**
3. `/spec-flow` — cria a branch `change/<id>` e conduz commits, gate e PR.
4. **Gere o código nesta ordem** (a sequência canônica do `spec-backend-auth-basic`):
   1. `/config-new-module` — scaffold do módulo
   2. `/module-aggregate` — agregado
   3. `/module-entity` — entidade
   4. `/module-repository` — contrato de repositório (+ fake p/ testes)
   5. `/module-use-case` — casos de uso
   6. `/shared-validation-rule` — quando faltar uma regra reutilizável
   7. `/backend-provider-implementation` — providers (crypto, JWT, …)
   8. `/backend-prisma-sync-module` — schema Prisma + migration
   9. `/backend-prisma-repository` — implementação Prisma do repositório
   10. `/backend-nest-controller` — controllers (expõem os use-cases)
   - **Frontend** (`apps/frontend`): páginas/componentes do módulo (templates de
     `/frontend-next-config` e `/config-new-module`)

   > `backend-nest-config` roda uma vez — normalmente junto da 1ª feature de autenticação.
   > **Atalho:** para a base de autenticação, `/spec-backend-auth-basic` encadeia
   > toda essa sequência de uma vez (só backend); `/spec-frontend-auth` faz o lado do cliente.
5. **Feche com `/spec-flow`:** `openspec validate --strict` + gate → PR → CI verde →
   merge squash → `openspec archive`.

---

## 3. Entrega (produção)

Quando um marco estiver pronto no `main`: PR de `main` → **`producao`** (a branch que o
**Dokploy** observa). Merge = deploy via webhook. Runbook completo (painel, domínios/SSL,
migrations, backup, rollback): **`docs/deploy-dokploy.md`**. Rulesets das duas branches:
`docs/seguranca-github.md`.

---

## Regras de ouro

- Nunca mergeia no `main` com o gate ou o CI vermelho; scan pulado local não é verde definitivo.
- Nunca commita segredo (`.env`); o `.env.example` é o que fica versionado. Produção = painel Dokploy.
- 1 change do OpenSpec = 1 branch = 1 PR. Deploy só pela `producao`.
- Só arquiva a change quando estiver validada e pronta pro merge.
- Fechou a change: `EXECUTION-LOG.md` atualizado + **contexto zerado** (é a memória entre sessões).

---

## Skills (referência rápida)

| Grupo | Skills |
|---|---|
| Projeto | `config-project-fullstack`, `spec-init` |
| Design / DDD estratégico | `ddd-strategic-design`, `security-threat-model` |
| Base (uma vez) | `config-package-shared`, `config-prisma`, `backend-nest-config`, `frontend-next-config` |
| Domínio (tático) | `module-aggregate`, `module-entity`, `module-value-object`, `module-repository`, `module-use-case` |
| Validação (shared) | `shared-validation-rule` |
| Backend | `backend-nest-controller`, `backend-provider-implementation`, `backend-prisma-repository`, `backend-prisma-sync-module` |
| Segurança | `backend-authorization` (RBAC), `security-review`, `security-threat-model` |
| E2E | `e2e-playwright` |
| Deploy | `deploy-dokploy` (legado VPS manual em `_arquivadas/`) |
| Orquestradores (recipes) | `spec-backend-auth-basic`, `spec-frontend-auth` |
| Fluxo | `spec-analyze` (portão pré-build), `spec-flow` (+ OpenSpec `/openspec:*`), `spec-conventions` |

> Ordem natural: **antes de gerar**, `ddd-strategic-design` decide os bounded contexts →
> `modules/` e `security-threat-model` (STRIDE) levanta as ameaças da feature; **durante a
> geração**, as skills de Domínio/Backend constroem; **antes do merge**, `security-review` audita
> contra OWASP Web+API. Auth completa = `spec-backend-auth-basic` + `spec-frontend-auth`, com
> `backend-authorization` (RBAC) por cima. Nenhuma skill ofensiva existe no catálogo.

---

## Comandos rápidos

```bash
# portão pré-build: coerência dos artefatos + constituição (somente-leitura)
# /analisar <id>     (skill spec-analyze)

# valida + roda o gate (lint, typecheck, test, build + gitleaks, npm audit, semgrep, trivy)
openspec validate <id> --strict
bash scripts/ci/gate.sh

# sobe com segurança
git push -u origin change/<id>
gh pr create --base main --title "<resumo>" --body-file BODY.md
gh pr checks --watch
gh pr merge --squash --delete-branch
git switch main && git pull
openspec archive-change <id> --yes

# publica (quando o marco estiver pronto)
gh pr create --base producao --head main --title "release: <marco>"
```
