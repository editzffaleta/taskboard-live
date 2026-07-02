# GitHub — proteção do main e ajustes do repositório

## Proteger o `main` (uma vez por repositório)

Torna "não quebrar o main" uma regra da plataforma: o `main` só muda via PR, e
o PR só pode ser mergeado com o check `validate` (do CI) verde.

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
- `"context": "validate"` casa com o nome do job em `assets/ci.yml`. Se renomear
  o job, ajuste aqui.
- `required_approving_review_count: 0` → exige PR, mas não exige aprovação
  humana. Para exigir a revisão da Calie, troque para `1`.
- `enforce_admins: false` → como admin, você pode dar bypass em emergência.
- Em planos/repos onde a proteção clássica não estiver disponível, use o endpoint
  de **rulesets** (`repos/<dono>/<repo>/rulesets`) com o mesmo efeito. Mesmo sem
  a regra na plataforma, o fluxo (`spec-flow`) já impede merge com gate
  vermelho — proteção em camadas.

## Secret push protection (opcional, recomendado)

Bloqueia o push de segredos detectáveis pelo GitHub:

```bash
gh api -X PATCH "repos/<dono>/<repo>" \
  -F "security_and_analysis[secret_scanning_push_protection][status]=enabled"
```

(Disponibilidade varia por tipo de repo/plano; trate como best-effort.)

## CODEOWNERS (opcional, p/ trabalho com a Calie)

Crie `.github/CODEOWNERS` para rotear revisão automaticamente:

```
*   @bruno-usuario @calie-usuario
```
