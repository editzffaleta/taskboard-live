# Leituras obrigatorias — security-threat-model

Antes de modelar as ameacas, leia:

1. `proposal.md` e `specs/spec.md` da change alvo (o que a feature faz e exige).
2. O context map / saida do `ddd-strategic-design`, quando houver (contextos e fronteiras).
3. `references/stride-guide.md` — as 6 categorias e as perguntas por fronteira.
4. `references/threat-model.template.md` — o formato de saida.
5. O catalogo de papeis/permissoes da `006-rbac-permissoes` (para as ameacas de E e I).

Skills relacionadas (mitigacao/handoff):
- `backend-authorization` (RBAC, ownership, escopo de tenant)
- `shared-validation-rule` / `module-entity` (integridade de entrada)
- `backend-nest-config` (erro padronizado, headers, auth)
- `security-review` (auditoria do codigo pronto contra OWASP)
