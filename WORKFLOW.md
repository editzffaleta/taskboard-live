# Guia do template

Template "fábrica fullstack": **NestJS + Next.js + Prisma + Turborepo** (npm, Jest),
clean architecture, já com **OpenSpec + git/CI** no fluxo. Você duplica esta pasta
e segue daqui.

> As skills ficam em `.claude/skills/`. Os comandos `/nome-da-skill` abaixo são as
> próprias skills; `/openspec:*` são do OpenSpec.

---

## 0. Setup da máquina (uma vez só)

```bash
gh auth login                              # GitHub CLI
node -v                                    # Node ≥ 20.19
openspec --version || npm i -g @fission-ai/openspec@latest
```

Detalhes: `.claude/skills/spec-init/references/setup-github.md`.

---

## 1. Projeto novo

1. **Duplique esta pasta** e abra no Claude Code.
2. **`/inicializar`** — bootstrap **pré-`000`**: roda antes da `000` porque é quem instala o
   OpenSpec que ela exige. Encadeia os passos abaixo e ainda copia as changes para
   `openspec/changes/`. Por baixo, é:
   - `/config-project-fullstack` — cria o monorepo (Next em `apps/frontend` :3000,
     NestJS em `apps/backend` :4000).
   - `/spec-init` — adiciona OpenSpec + CI + git hooks, faz o commit inicial e
     (perguntando público/privado) cria o repositório no GitHub com o `main` protegido.
   - `/spec-conventions` — semeia `openspec/shared/`, `templates/` e `memory/` (produto,
     contexto-técnico, estrutura e a **`constitution.md`** com os princípios P1–P9) + o
     `EXECUTION-LOG.md`. Ajuste a constituição ao seu domínio (não é sobrescrita depois).
3. **Base (uma vez por projeto):** `/config-package-shared`, `/config-prisma`,
   `/backend-nest-config`, `/frontend-next-config`.

---

## 2. Cada feature (o loop do dia a dia)

1. `/openspec-propose "<a feature>"` — cria a change (`proposal.md`, `specs/`,
   `design.md`, `tasks.md`).
2. `/analisar <id>` — **portão pré-build** (skill `spec-analyze`): coerência dos
   artefatos (cobertura requirement↔task, design vs proposal, deltas vs `specs/`) +
   conformidade com a **constituição** (`openspec/memory/constitution.md`).
   Somente-leitura. **FAIL → corrija a change antes de codar.**
3. `/spec-flow` — cria a branch `change/<id>` e conduz commits, gate e PR.
4. **Gere o código nesta ordem** (a sequência canônica do seu `spec-backend-auth-basic`):
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

   > `backend-nest-config` (infra Nest: filtro de erro, AuthGuard JWT, decorator de
   > usuário) roda uma vez — normalmente junto da 1ª feature de autenticação.
   > **Atalho:** pra a base de autenticação, `/spec-backend-auth-basic` encadeia
   > toda essa sequência de uma vez (só backend).
5. **Feche com `/spec-flow`:** `openspec validate --strict` + gate
   (`scripts/ci/gate.sh`) → PR → CI verde → merge squash → `openspec archive`.

---

## Regras de ouro

- Nunca mergeia no `main` com o gate ou o CI vermelho.
- Nunca commita segredo (`.env`); o `.env.example` é o que fica versionado.
- 1 change do OpenSpec = 1 branch = 1 PR.
- Só arquiva a change quando estiver validada e pronta pro merge.

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
| Orquestradores (recipes) | `spec-backend-auth-basic`, `spec-frontend-auth` |
| Fluxo | `spec-analyze` (portão pré-build), `spec-flow` (+ OpenSpec `/openspec:*`) |

> Ordem natural: **antes de gerar**, `ddd-strategic-design` decide os bounded contexts → `modules/` e `security-threat-model` (STRIDE) levanta as ameaças e mitigações da feature; **durante a geração**, as skills de Domínio/Backend constroem; **antes do merge**, `security-review` audita o código contra OWASP Web+API. Auth completa = `spec-backend-auth-basic` (backend) + `spec-frontend-auth` (front), com `backend-authorization` (RBAC) por cima. `module-value-object` é o building block de DDD para valores imutáveis (Email, CPF, Money…). As três novas são defensivas/de design — nenhuma skill ofensiva foi reconstruída.

---

## Comandos rápidos

```bash
# portão pré-build: coerência dos artefatos + constituição (somente-leitura)
# /analisar <id>     (skill spec-analyze)

# valida + roda o gate (lint, typecheck/check-types, test jest, build)
openspec validate <id> --strict
bash scripts/ci/gate.sh

# sobe com segurança
git push -u origin change/<id>
gh pr create --base main --title "<resumo>" --body-file BODY.md
gh pr checks --watch
gh pr merge --squash --delete-branch
git switch main && git pull
openspec archive-change <id> --yes
```
