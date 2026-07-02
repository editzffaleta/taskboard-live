---
name: spec-init
description: >-
  Camada de OpenSpec + git + CI + GitHub que roda LOGO DEPOIS de criar o
  monorepo (com config-project-fullstack) num projeto novo. Verifica
  pré-requisitos (Node, git, GitHub CLI autenticado), inicializa o OpenSpec e
  semeia o openspec/project.md com a stack, completa a higiene que faltar
  (.gitignore cobrindo .env + chaves, .editorconfig, .nvmrc, .env.example,
  .gitleaksignore), traz o CI (npm) + gate de qualidade com varredura de segredos
  (gitleaks no hook pre-commit e no CI), garante que os scripts
  lint/typecheck/test/build resolvam, configura
  git hooks opcionais, faz o commit inicial e (opcional) cria o repositório no
  GitHub (público ou privado) com o main protegido. Use SEMPRE que o usuário for
  preparar/configurar um projeto novo, fizer "setup inicial", ou logo após
  scaffoldar o monorepo — mesmo sem citar "bootstrap" ou "OpenSpec".
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
# Node ≥ 20.19 (exigência do OpenSpec)
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

## Fase 3 — Higiene do projeto

O `config-project-fullstack` já criou os `.env`/`.env.example` (por app) e um
`.gitignore`. Aqui só completamos o que falta, sem sobrescrever:

```bash
# .editorconfig
[ -f .editorconfig ] || cp "<SKILL_DIR>/assets/editorconfig" .editorconfig
# .nvmrc (fixa o Node)
[ -f .nvmrc ]        || echo "22" > .nvmrc
# README: garante que existe
[ -f README.md ]     || printf '# %s\n' "$(basename "$PWD")" > README.md

# Garante que .env fica IGNORADO e .env.example fica VERSIONADO
grep -qF '!.env.example' .gitignore 2>/dev/null \
  || printf '\n# Segredos (.env ignorado; .env.example versionado)\n.env\n.env.*\n!.env.example\n' >> .gitignore

# Endurece o .gitignore (chaves, certificados, uploads) — idempotente
grep -qF '=== Kit de segredos' .gitignore 2>/dev/null \
  || cat "<SKILL_DIR>/assets/gitignore.secrets" >> .gitignore

# .env.example da raiz (modelo, só placeholders) — se ainda não existir
[ -f .env.example ]     || cp "<SKILL_DIR>/assets/env.example"     .env.example
# .gitleaksignore vazio (só comentário) — para falsos-positivos futuros
[ -f .gitleaksignore ]  || cp "<SKILL_DIR>/assets/gitleaksignore"  .gitleaksignore
```

---

## Fase 4 — Qualidade e gate

1. Copie o CI e o runner do gate:
   ```bash
   mkdir -p .github/workflows scripts/ci
   [ -f .github/workflows/ci.yml ]      || cp "<SKILL_DIR>/assets/ci.yml"           .github/workflows/ci.yml
   [ -f scripts/ci/gate.sh ]            || cp "<SKILL_DIR>/assets/gate.sh"          scripts/ci/gate.sh
   [ -f scripts/ci/gitleaks-scan.sh ]   || cp "<SKILL_DIR>/assets/gitleaks-scan.sh" scripts/ci/gitleaks-scan.sh
   chmod +x scripts/ci/gate.sh scripts/ci/gitleaks-scan.sh
   ```

   > **Segredos no gate/CI:** o `gate.sh` roda o `gitleaks` (varredura do repo) como
   > primeiro passo, e o `ci.yml` instala o binário do gitleaks (versão fixada, sem a
   > action — evita a questão de licença) antes de rodar o gate. Localmente o gate só
   > escaneia se o `gitleaks` estiver instalado (best-effort); no CI sempre escaneia.
   > O `gitleaks` respeita o `.gitleaksignore` da raiz.

2. **Garanta que os passos do gate resolvam** (`lint`, `typecheck`/`check-types`,
   `test`, `build`) na raiz do monorepo. O `config-project-fullstack` já traz
   lint/build/check-types; o que costuma faltar é um `test` agregado na raiz.
   Detalhes em `references/tooling.md`. Não recrie tooling que já existe.

3. Commite o `package-lock.json` — o CI usa `npm ci` e o cache do npm dependem dele.

---

## Fase 5 — Git hooks (opcional — PERGUNTE)

Pergunte: "Configurar git hooks de qualidade (sem dependências)?"
Eles fazem o "shift-left" do que o CI já cobra:
- `commit-msg` → valida Conventional Commits
- `pre-commit` → barra `.env` e roda o `gitleaks` no que está em stage; se o
  `gitleaks` não estiver instalado, cai num check por regex (best-effort, sem deps)
- `pre-push` → roda o gate antes de subir (inclui a varredura de segredos)

> O hook é **best-effort local**: quem não tiver o hook, não tiver o `gitleaks`
> instalado, ou usar `git commit --no-verify`, não é barrado — por isso o CI é o
> portão de verdade. Para o hook ter força total, instale o `gitleaks` localmente
> (`brew install gitleaks`, ou baixe o binário do release).

Se sim:
```bash
mkdir -p .githooks
cp "<SKILL_DIR>/assets/githooks/"* .githooks/
chmod +x .githooks/*
git config core.hooksPath .githooks
```
E adicione ao `package.json` (pra ativar nos clones via `npm install`):
```json
"scripts": { "prepare": "git config core.hooksPath .githooks" }
```

---

## Fase 6 — GitHub: PR template e Dependabot (opcional)

```bash
mkdir -p .github
[ -f .github/pull_request_template.md ] || cp "<SKILL_DIR>/assets/pull_request_template.md" .github/pull_request_template.md
[ -f .github/dependabot.yml ]           || cp "<SKILL_DIR>/assets/dependabot.yml" .github/dependabot.yml
```

---

## Fase 7 — Commit inicial e repositório

1. **Commit inicial:**
   ```bash
   git add -A
   git commit -m "chore: bootstrap do projeto"
   ```

2. **Criar o repositório no GitHub?** (PERGUNTE e CONFIRME — esta é a parte
   "ele tem que me perguntar"). Levante:
   - Nome do repositório
   - Dono: conta pessoal **ou** uma organização
   - Visibilidade: **público** ou **privado**

   Mostre o resumo (`dono/nome` + visibilidade) e só então:
   ```bash
   gh repo create <dono>/<nome> --<publico|privado> --source=. --remote=origin --push
   ```

3. **Proteger o `main`** (best-effort; não fatal). Exige PR + check `validate`
   verde pra mergear. Comando completo em `references/setup-github.md`. Em resumo:
   ```bash
   gh api -X PUT "repos/<dono>/<nome>/branches/main/protection" --input - <<'JSON'
   { "required_status_checks": { "strict": true, "checks": [{ "context": "validate" }] },
     "enforce_admins": false,
     "required_pull_request_reviews": { "required_approving_review_count": 0 },
     "restrictions": null }
   JSON
   ```
   > **Produção:** branch protection em repositório **privado** só existe no GitHub
   > **Pro/Team/Enterprise** — em repo privado de conta free a chamada falha. Em repo
   > público funciona no free. Documente isso como passo de produção; sem ele, o
   > "merge bloqueado" não é imposto automaticamente (o CI ainda roda e reprova o PR).

4. **(Opcional) Secret push protection** do GitHub:
   ```bash
   gh api -X PATCH "repos/<dono>/<nome>" \
     -F "security_and_analysis[secret_scanning_push_protection][status]=enabled" || true
   ```

5. Confirme a URL do repositório pro usuário.

---

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
