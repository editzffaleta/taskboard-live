#!/usr/bin/env bash
# Valida a integridade estrutural do template Fabrica Fullstack.
# Uso: bash scripts/validar-template.sh   (exit 0 = tudo verde)
set -u
cd "$(dirname "$0")/.."
pass=0; fail=0
ok()   { echo "PASS  $1"; pass=$((pass+1)); }
bad()  { echo "FAIL  $1"; fail=$((fail+1)); }
ck()   { if eval "$2" >/dev/null 2>&1; then ok "$1"; else bad "$1"; fi; }

echo "══ 1. Changes — estrutura e contrato"
for d in changes-templates/0*/; do
  id=$(basename "$d")
  faltas=""
  for f in proposal.md design.md tasks.md .openspec.yaml; do [ -f "$d$f" ] || faltas="$faltas $f"; done
  if [ "$id" != "000-orquestracao-execucao" ]; then [ -f "$d/specs/spec.md" ] || faltas="$faltas specs/spec.md"; fi
  grep -q "CONTRATO DE LEITURA" "$d/proposal.md" 2>/dev/null || faltas="$faltas contrato"
  if [ "$id" != "000-orquestracao-execucao" ]; then  # a 000 e o ledger (sem Aceite por item)
    cb=$(grep -c "^- \[ \]" "$d/tasks.md" 2>/dev/null || echo 0)
    ac=$(grep -c '\*\*Aceite:\*\*' "$d/tasks.md" 2>/dev/null || echo 0)
    [ "$ac" -ge "$cb" ] || faltas="$faltas aceites($ac<$cb)"
  fi
  [ -z "$faltas" ] && ok "$id" || bad "$id —$faltas"
done

echo "══ 2. Ledger da 000 ↔ pastas"
ledger=changes-templates/000-orquestracao-execucao/tasks.md
for d in changes-templates/0*/; do
  id=$(basename "$d"); [ "$id" = "000-orquestracao-execucao" ] && continue
  grep -q "\`$id\`" "$ledger" && ok "ledger cita $id" || bad "ledger NAO cita $id"
done
grep -o '\`0[0-9][0-9][a-c]\?-[a-z-]*\`' "$ledger" | tr -d '\`' | sort -u | while read -r cid; do
  [ -d "changes-templates/$cid" ] || echo "FAIL  ledger cita $cid mas a pasta nao existe"
done

echo "══ 3. Skills"
n_sk=$(ls -d .claude/skills/*/ | grep -v _arquivadas | wc -l)
ck "frontmatter completo ($n_sk skills)" "[ \$(grep -l 'compatibility:' .claude/skills/*/SKILL.md | wc -l) -eq $n_sk ]"
ck "openai.yaml $n_sk/$n_sk" "[ \$(ls .claude/skills/*/agents/openai.yaml | wc -l) -eq $n_sk ]"
ck "nenhum SKILL.md >=250 linhas" '! wc -l .claude/skills/*/SKILL.md | awk "\$1>=250 && \$2!=\"total\"" | grep -q .'
ck "links references/ resolvem" 'python3 - <<PY
import re,pathlib,sys
bad=0
for s in pathlib.Path(".claude/skills").glob("*/SKILL.md"):
    for m in re.finditer(r"\]\((references/[^)]+)\)", s.read_text(encoding="utf-8")):
        if not (s.parent/m.group(1)).exists(): bad+=1
sys.exit(bad)
PY'
ck "gate.sh/ci.yml canonicos unicos" '[ $(find .claude/skills -name gate.sh -not -path "*_arquivadas*" | wc -l) -eq 1 ] && [ $(find .claude/skills -name ci.yml -not -path "*_arquivadas*" | wc -l) -eq 1 ]'
ck "sintaxe do gate.sh" 'bash -n .claude/skills/spec-init/assets/gate.sh'

echo "══ 4. Agents e commands"
ck "retorno fixo nos 8 especialistas" '[ $(grep -l "Retorno obrigatório (formato fixo)" .claude/agents/*specialist*.md | wc -l) -eq 8 ]'
ck "briefing-padrao no orquestrador" 'grep -q "Briefing-padrão" .claude/agents/orchestrator-fullstack.md'
ck "settings.json nega .env/chaves" 'grep -q "\.env" .claude/settings.json && grep -q "\.pem" .claude/settings.json'
ck "pre-condicoes nos 4 commands" '[ $(grep -l "Pre-condic" .claude/commands/*.md | wc -l) -eq 4 ]'

echo "══ 5. Referencias e higiene"
ck "zero refs a changes antigas densas" '! grep -rq --exclude=validar-template.sh "006-rbac-permissoes\|008-cadastro-colaboradores\|009-mfa-recuperacao-primeiro-acesso" changes-templates .claude AGENTS.md WORKFLOW.md README.md scripts 2>/dev/null'
ck "docs citados no AGENTS.md existem" 'for f in $(grep -oh "docs/[a-z-]*\.md" AGENTS.md | sort -u); do [ -f "$f" ] || exit 1; done'
ck "symlink .agents/skills -> .claude/skills" '[ "$(readlink .agents/skills)" = "../.claude/skills" ]'
ck "pasta sem espaco no nome" '! ls -d "changes-templates " 2>/dev/null | grep -q .'
ck "VERSION consta no CHANGELOG (se existirem)" '[ ! -f VERSION ] || grep -q "$(cat VERSION)" CHANGELOG.md'
ck "sintaxe deste script" 'bash -n scripts/validar-template.sh'

echo; echo "════ RESULTADO: $pass PASS · $fail FAIL ════"
[ "$fail" -eq 0 ]
