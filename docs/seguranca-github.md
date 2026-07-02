# Segurança no GitHub — plano Pro (repositório privado)

O que o **GitHub Pro** dá de graça em repositório privado, o que **não** dá, e como o gate do
template cobre a diferença com scanners open-source. Válido para os projetos gerados; confirme
mudanças de plano na doc oficial quando for configurar.

## Incluído no Pro (usar sempre)

| Recurso | Onde ligar | O que resolve |
|---|---|---|
| **Dependabot** (alerts + security updates + version updates) | *Settings → Advanced Security* + `.github/dependabot.yml` (semeado pela `spec-init`) | PRs automáticos de dependência vulnerável/desatualizada |
| **Dependency graph / SBOM** | *Settings → Advanced Security* · *Insights → Dependency graph → Export SBOM* | inventário de dependências e exportação SPDX |
| **Rulesets** (sucessor das branch protections) | *Settings → Rules → Rulesets* | proteger `main` e `producao` (abaixo) |
| **SECURITY.md** + private vulnerability reporting | arquivo na raiz (asset da `spec-init`) + *Settings → Advanced Security* | canal privado de reporte |
| **Required status checks** | dentro do ruleset | PR só mergeia com o CI (gate) verde |

## NÃO incluído no Pro (exige GitHub Team/Enterprise + Advanced Security)

- **CodeQL** (code scanning nativo) → coberto pelo **Semgrep `p/ci`** no gate.
- **Secret scanning / push protection nativos** → cobertos pelo **gitleaks** no hook
  pre-commit e no CI (histórico completo, `fetch-depth: 0`).
- **Dependency review na PR** → coberto por **npm audit (high+)** + **Trivy fs** bloqueantes
  no gate, e pelo Dependabot nos alertas.

> Resumo: com o gate deste template (gitleaks + npm audit + Semgrep + Trivy, todos
> bloqueantes) + Dependabot + rulesets, um repositório no plano Pro fica com cobertura
> equivalente ao essencial do Advanced Security — sem custo adicional.

## Rulesets recomendados (criar nos dois: `main` e `producao`)

1. *Settings → Rules → Rulesets → New branch ruleset* · Enforcement: **Active**.
2. Target branches: `main` (um ruleset) e `producao` (outro).
3. Regras em ambos:
   - **Require a pull request before merging** (0–1 approvals conforme o time; squash ok)
   - **Require status checks to pass** → check `validate` (o job do `ci.yml`)
   - **Block force pushes** · **Restrict deletions**
4. Extra na `producao`: como só recebe merge de `main`, avalie **Require linear history** e
   restringir quem pode abrir PR para ela (bypass list vazia).

## Rotina

- Alertas do Dependabot: triagem semanal; CRITICAL/HIGH viram change imediata.
- `gitleaks` acusou segredo já commitado → **rotacionar a credencial primeiro**, depois limpar
  histórico (BFG/filtro) — remover o arquivo não desfaz o vazamento.
- Auditoria pré-merge do `security-specialist` continua obrigatória nas changes com risco
  (RBAC, auth, upload, queries dinâmicas) — scanner não substitui revisão.
