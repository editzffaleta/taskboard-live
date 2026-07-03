---
name: spec-init
description: 'Camada de OpenSpec + git + CI + gate que roda LOGO DEPOIS de criar o monorepo (config-project-fullstack): pre-requisitos (Node, git, GitHub CLI), openspec init + project.md, higiene (.gitignore com .env e chaves, .editorconfig, .nvmrc, .env.example, .gitleaksignore), CI npm + gate.sh com gitleaks e git hooks. Usar UMA vez por projeto novo (ou para refrescar a camada de processo). Nao usar para o dia a dia de branches/commits/PR (spec-flow), para analisar uma change (spec-analyze) nem para semear shared/templates/memory do OpenSpec (spec-conventions).'
compatibility: claude-code, opencode
---

# Spec Init

A camada de **OpenSpec + git + CI + GitHub** que se coloca por cima do monorepo
recém-criado, padronizando o projeto antes de qualquer feature.

Ordem das skills num projeto novo:
1. **`config-project-fullstack`** — scaffolda o monorepo (Turbo, Next :3000 +
   NestJS :4000, npm). *Roda primeiro.*
2. **`spec-init` (esta)** — adiciona OpenSpec, CI/gate, git hooks e cria o repo.
   *Roda uma vez, depois do scaffold.*
3. **`spec-flow`** — em toda change (branch → commit → gate → PR → CI → merge →
   archive).

> Não recria o que o `config-project-fullstack` já fez (monorepo, apps, `.env`).
> Só complementa. O "Fluxo A" do `spec-flow` fica como fallback.

Os arquivos-modelo ficam no diretório desta skill (`<SKILL_DIR>`, fornecido em
runtime), em `assets/` e `references/`.

---

## Princípios

1. **Não sobrescreva** config que o projeto já tenha — detecte e só complete o
   que falta.
2. **Confirme** antes de ações públicas/irreversíveis: criar o repositório no
   GitHub e proteger o `main`.
3. **Idempotente na medida do possível**: rodar de novo não deve quebrar nada.
4. Segredo **nunca** entra no git.

---

## Fase 0 — Garantir o monorepo

Esta skill roda **depois** do `config-project-fullstack`. Confirme que o monorepo
já existe na pasta atual:

```bash
test -f package.json && test -f turbo.json && test -d apps/frontend && test -d apps/backend \
  && echo "monorepo OK" || echo "⚠ rode o config-project-fullstack primeiro"
```

Se não existir, rode o `config-project-fullstack` primeiro e volte aqui.

---

## Fase 1 — Pré-requisitos

Verifique cada um; instale/oriente só se faltar.

```bash
# Node ≥ 22.11 (LTS) (exigência do OpenSpec)
node -v

# git instalado E com identidade configurada (senão o commit sai anônimo)
git --version
git config user.name  || echo "⚠ configure: git config --global user.name '...'"
git config user.email || echo "⚠ configure: git config --global user.email '...'"

# GitHub CLI autenticado
gh auth status        # se falhar: gh auth login

# OpenSpec CLI
openspec --version || npm install -g @fission-ai/openspec@latest
```

Se algum check exigir ação interativa do usuário (ex.: `gh auth login`),
peça pra ele rodar e aguarde antes de seguir.

---

## Fase 2 — Inicializar git e OpenSpec

1. Inicialize o git (se ainda não for repo), com `main` como branch padrão:
   ```bash
   git rev-parse --is-inside-work-tree 2>/dev/null || git init -b main
   ```

2. Inicialize o OpenSpec no projeto:
   ```bash
   openspec init
   ```
   - Selecione **Claude Code** na lista (ele usa `.claude/skills` e
     `.claude/commands`).
   - Se o `openspec init` for interativo e travar no terminal do agente, peça
     pro usuário rodar `openspec init` manualmente e selecionar Claude Code.

3. **Semeie o `openspec/project.md`** com a stack e os padrões, usando
   `references/project-md-template.md` como base (ajuste ao projeto real). Isso
   faz os `/opsx:*` nascerem com contexto.

---

## Fases 3 → 7 — execução detalhada (referência)

Comandos completos e idempotentes em [references/fases-3-a-7.md](references/fases-3-a-7.md).
Sequência e critério de pronto:

| Fase | O que faz | Verificação de pronto |
|---|---|---|
| 3 | Higiene: `.editorconfig`, `.nvmrc`, README, `.env` ignorado + `.env.example` versionado, `.gitignore` endurecido (chaves/certificados/uploads), `.gitleaksignore` | arquivos presentes; `git check-ignore .env` responde |
| 4 | Qualidade e gate: copia `assets/ci.yml` → `.github/workflows/ci.yml`, `assets/gate.sh` → `scripts/ci/gate.sh`, `assets/gitleaks-scan.sh`; scripts npm | `bash scripts/ci/gate.sh` roda (mesmo que amarelo em projeto vazio) |
| 5 | Git hooks (opcional — **pergunte**): instala `assets/githooks` (pre-commit com gitleaks) via `core.hooksPath` | `git config core.hooksPath` aponta para os hooks |
| 6 | GitHub (opcional): `assets/pull_request_template.md`, `assets/dependabot.yml` e `assets/SECURITY.md` (raiz, com `{{email-seguranca}}` preenchido) | arquivos em `.github/` + `SECURITY.md` na raiz |
| 7 | Commit inicial + repositório remoto (delega criação ao fluxo padrão quando existir) | commit feito; remoto configurado se solicitado |

> Fases opcionais (5 e 6) **sempre perguntam** antes; nunca instalar hooks sem consentimento.

## Kit de higiene de segredos (resumo)

Três camadas cobrindo o ciclo todo, todas semeadas aqui (todo projeto novo já nasce com elas):

1. **Nunca commitar** — `.gitignore` endurecido (`.env`/`.env.*` com `!.env.example`, mais
   `*.pem/*.key/*.p12/*.pfx`, uploads/storage) + `.env.example` (modelo, só placeholders).
2. **Nunca virar commit** — hook `pre-commit` roda `gitleaks` no stage (fallback regex sem deps).
   É o equivalente local ao "push protection": pega na origem.
3. **Nunca chegar ao remoto sem checagem** — o `ci.yml` instala o binário do `gitleaks` (versão
   fixada, sem a action) e o `gate.sh` o roda varrendo o repositório; falha o job se achar segredo.

Falsos-positivos vão no `.gitleaksignore` (raiz). Limitações honestas: o hook é best-effort
(quem não tiver o hook, não tiver `gitleaks`, ou usar `--no-verify` não é barrado — daí o CI ser o
portão real); o bloqueio automático de merge depende de **branch protection**, que em repo privado
exige GitHub Pro/Team (ver Fase 7). O subcomando do `gitleaks` mudou entre versões — por isso o
`gitleaks-scan.sh` **detecta** o subcomando disponível em vez de assumir.

---

## Encerramento

Projeto pronto. A partir daqui, **toda mudança** passa a usar o `spec-flow`
(criar a change no OpenSpec → branch → commits → gate → PR → CI → merge →
archive).

---

## Cola de comandos

```bash
# Pré-requisitos
node -v ; git --version ; gh auth status ; openspec --version

# Init
git init -b main
openspec init

# Higiene + gate (copiar de <SKILL_DIR>/assets/)
mkdir -p .github/workflows scripts/ci .githooks

# Commit + repo
git add -A && git commit -m "chore: bootstrap do projeto"
gh repo create <dono>/<nome> --<publico|privado> --source=. --remote=origin --push
```

Leia conforme precisar:
- `references/project-md-template.md` — semente do `openspec/project.md`.
- `references/tooling.md` — garantir lint/typecheck/test/build.
- `references/setup-github.md` — proteção do `main` e ajustes do repo.
- `assets/` — modelos copiados pro projeto: `ci.yml`, `gate.sh`, `gitleaks-scan.sh`,
  `editorconfig`, `pull_request_template.md`, `dependabot.yml`, `githooks/`, e o kit de
  segredos (`gitignore.secrets`, `env.example`, `gitleaksignore`).
