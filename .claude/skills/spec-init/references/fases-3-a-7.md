# spec-init — Fases 3 a 7 (comandos completos)

> Extraído do corpo da skill (progressive disclosure). O SKILL.md carrega princípios,
> pré-requisitos e o kit-resumo; aqui vivem os comandos idempotentes de cada fase.

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

