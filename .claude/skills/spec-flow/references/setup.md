# Setup — máquina e proteção do main

## 1. Instalar a skill (uma vez)

Coloque a pasta `spec-flow/` em:

```
~/.claude/skills/spec-flow/
```

Skills pessoais ficam disponíveis em **todos** os seus projetos. Confira a
estrutura:

```
~/.claude/skills/spec-flow/
├── SKILL.md
├── assets/
│   ├── ci.yml
│   └── gate.sh
└── references/
    ├── conventions.md
    └── setup.md
```

## 2. Pré-requisitos da máquina

```bash
# GitHub CLI autenticado
gh auth status        # se não estiver: gh auth login

# Node ≥ 20.19 (o npm vem junto)
node -v

# OpenSpec (você já usa; só confirme)
openspec --version
```

> O monorepo é criado em **npm** pelo `config-project-fullstack`. Commite o
> `package-lock.json` — o CI usa `npm ci` e o cache do npm dependem dele.

## 3. Proteger o `main` (uma vez por repositório)

Isto torna "não quebrar o main" uma regra da plataforma: o main só muda via PR,
e o PR só pode ser mergeado com o check `validate` (CI) verde.

```bash
gh api -X PUT "repos/<dono>/<repo>/branches/main/protection" \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [{ "context": "validate" }]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null
}
JSON
```

Notas:
- `"context": "validate"` casa com o nome do job em `assets/ci.yml`. Se você
  renomear o job, ajuste aqui.
- `required_approving_review_count: 0` → exige PR, mas **não** exige aprovação
  humana (você consegue auto-mergear com o CI verde). Para exigir a revisão da
  Calie, troque para `1`.
- `enforce_admins: false` → como admin, você pode dar bypass em emergência.
- Em planos/repos onde a proteção clássica não estiver disponível, dá pra usar
  o endpoint de **rulesets** (`repos/<dono>/<repo>/rulesets`) com o mesmo efeito.
  Mesmo sem a regra na plataforma, a skill já impede merge com gate vermelho —
  é proteção em camadas.

## 4. Ajustes por stack

`assets/ci.yml` usa **npm** (`npm ci`), alinhado ao `config-project-fullstack`.
Para um projeto em pnpm/yarn/bun, troque só o passo de instalação no `ci.yml`
(o `gate.sh` já detecta o gerenciador sozinho pelo lockfile).
