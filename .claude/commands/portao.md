---
description: Roda o portao de qualidade (Definition of Done) de uma mudanca antes de arquivar/mergear.
argument-hint: "[id-da-mudanca, ex.: 005-login-sessao]"
allowed-tools: Bash(npx tsc --noEmit), Bash(npm test *), Bash(bash scripts/ci/gate.sh), Bash(openspec validate *)
---

Rode o **portao de qualidade** (Definition of Done da change 000) para a mudanca `$ARGUMENTS`.
Pare no primeiro vermelho e reporte o que falhou — **nao avance** com pendencia.

Checklist (todos precisam passar):
1. `npx tsc --noEmit` em `apps/backend` **e** `apps/frontend`.
2. Testes da mudanca (unitarios, integracao e e2e quando aplicavel):
   `npm test` e, se houver, `npm run test:e2e`.
3. `bash scripts/ci/gate.sh` verde (lint, typecheck/check-types, test, build).
4. `openspec validate "$ARGUMENTS" --strict` sem erros.
5. Cenarios do `specs/spec.md` da mudanca satisfeitos (conferencia funcional quando indicado).
6. Skills indicadas usadas como implementacao principal (desvios devem estar na evidencia).
7. Quando houver risco de seguranca: auditoria do **security-specialist** sem nenhum CRITICAL.
8. Todos os checkboxes da `tasks.md` da mudanca marcados, cada um com evidencia.

Saida: um resumo PASS/FAIL por item. Se tudo verde, sinalize que esta pronto para
`/openspec:archive "$ARGUMENTS"` + commit + marcar o checkbox no ledger.
