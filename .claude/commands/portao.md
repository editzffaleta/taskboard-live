---
description: Roda o portao de qualidade pos-build (Definition of Done + scanners de seguranca) de uma mudanca antes de arquivar/mergear.
argument-hint: "[id-da-mudanca, ex.: 005-login-sessao]"
allowed-tools: Bash(npx tsc --noEmit), Bash(npm test *), Bash(npm audit *), Bash(bash scripts/ci/gate.sh), Bash(openspec validate *), Bash(openspec status *), Read, Glob, Grep
---

Rode o **portao de qualidade** (Definition of Done da change 000) para a mudanca `$ARGUMENTS`.
Pare no primeiro vermelho e reporte o que falhou — **nao avance** com pendencia.

## Pre-condicoes (verifique antes; qualquer falha = pare e reporte)

```bash
test -f scripts/ci/gate.sh || echo "FALTA gate.sh — rode a spec-init (fase 4)"
test -d node_modules || echo "FALTA node_modules — rode npm install"
command -v openspec >/dev/null || echo "FALTA openspec CLI — npm i -g @fission-ai/openspec"
openspec status --change "$ARGUMENTS" --json >/dev/null 2>&1 || echo "mudanca '$ARGUMENTS' nao encontrada em openspec/changes/"
```

## Checklist (todos precisam passar)

1. `npx tsc --noEmit` em `apps/backend` **e** `apps/frontend`.
2. Testes da mudanca (unitarios, integracao e e2e quando aplicavel):
   `npm test` e, se houver, `npm run test:e2e`.
3. `bash scripts/ci/gate.sh` verde. O gate cobre, **todos bloqueantes**:
   lint · typecheck · test · build · **gitleaks** (segredos) · **npm audit** (deps HIGH+) ·
   **semgrep** (SAST, config `p/ci`) · **trivy fs** (vulnerabilidades HIGH/CRITICAL).
   > Scanner ausente localmente = o gate anuncia o pulo e o **CI cobre** — mas o portao FINAL
   > da mudanca exige **CI verde no PR** (nunca considere verde definitivo um scan pulado).
   > Para rodar tudo local: `pipx install semgrep` · instalar `gitleaks` e `trivy` (releases oficiais).
4. `openspec validate "$ARGUMENTS" --strict` sem erros.
5. Cenarios do `specs/spec.md` da mudanca satisfeitos (conferencia funcional quando indicado).
6. Skills indicadas usadas como implementacao principal (desvios devem estar na evidencia).
7. Quando houver risco de seguranca: auditoria do **security-specialist** sem nenhum CRITICAL.
8. Todos os checkboxes da `tasks.md` da mudanca marcados, cada um com evidencia.

Saida: um resumo PASS/FAIL por item. Se tudo verde, sinalize que esta pronto para
`/openspec:archive "$ARGUMENTS"` + commit + marcar o checkbox no ledger + atualizar
`openspec/EXECUTION-LOG.md` + **zerar o contexto** antes da proxima mudanca.
