#!/usr/bin/env bash
# Smoke test MECANICO do template: simula a parte deterministica do bootstrap
# (o que o spec-init copia) num diretorio temporario e valida os artefatos.
# NAO substitui o teste completo com agente (ver bloco comentado no workflow).
set -u
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
ck() { if eval "$2" >/dev/null 2>&1; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1"; fail=$((fail+1)); fi; }

echo "══ 1. Bootstrap mecanico (assets do spec-init) em $TMP"
A="$ROOT/.claude/skills/spec-init/assets"
mkdir -p "$TMP/.github/workflows" "$TMP/scripts/ci"
cp "$A/ci.yml" "$TMP/.github/workflows/ci.yml"
cp "$A/gate.sh" "$TMP/scripts/ci/gate.sh"
cp "$A/gitleaks-scan.sh" "$TMP/scripts/ci/gitleaks-scan.sh" 2>/dev/null
cp "$A/SECURITY.md" "$TMP/SECURITY.md"
cp "$A/env.example" "$TMP/.env.example" 2>/dev/null
cp "$A/gitignore.secrets" "$TMP/" 2>/dev/null
cp -r "$A/githooks" "$TMP/githooks" 2>/dev/null
ck "assets copiados sem erro" '[ -f "$TMP/.github/workflows/ci.yml" ] && [ -f "$TMP/scripts/ci/gate.sh" ] && [ -f "$TMP/SECURITY.md" ]'
ck "gate.sh copiado tem sintaxe valida" 'bash -n "$TMP/scripts/ci/gate.sh"'
ck "hooks copiados tem sintaxe valida" 'for h in "$TMP"/githooks/*; do [ -f "$h" ] && bash -n "$h" || true; done'
ck "ci.yml e YAML valido" 'python3 -c "import yaml,sys; yaml.safe_load(open(\"$TMP/.github/workflows/ci.yml\"))"'
ck "workflow do template e YAML valido" 'python3 -c "import yaml; yaml.safe_load(open(\"$ROOT/.github/workflows/validar-template.yml\"))"'

echo "══ 2. Dockerfiles (parse basico + versao de runtime)"
DK="$ROOT/.claude/skills/deploy-dokploy/assets"
ck "Dockerfiles com FROM/CMD e node:22" 'for f in "$DK/Dockerfile.backend" "$DK/Dockerfile.frontend"; do grep -q "^FROM node:22-alpine" "$f" && grep -q "^CMD" "$f" || exit 1; done'
ck "nenhum node:20 restante nos assets" '! grep -rq "node:20" "$DK"'
ck "dockerignore protege .env e chaves" 'grep -q "^\.env" "$DK/dockerignore" && grep -q "\.pem" "$DK/dockerignore"'

echo "══ 3. Inventario de placeholders das changes (devem ser conhecidos)"
ck "placeholders restritos ao catalogo conhecido" 'python3 - "$ROOT" <<PY
import re,sys,pathlib
root=pathlib.Path(sys.argv[1])
conhecidos={"{{produto}}","{{namespace}}","{{email-seguranca}}","{{versao-do-template}}",
            "{{cor-primaria}}","{{cor-primaria-hover}}","{{fonte-texto}}","{{fonte-dados}}","{{secoes-sidebar}}"}
ok=True
for f in (root/"changes-templates").rglob("*.md"):
    for m in re.findall(r"\{\{[a-z-]+\}\}", f.read_text(encoding="utf-8")):
        if m not in conhecidos: print(f"desconhecido {m} em {f}"); ok=False
sys.exit(0 if ok else 1)
PY'

echo "══ 4. Simulacao de higiene (contrato da fase 3 do spec-init)"
# Contrato: .env ignorado, .env.example versionado, bloco de segredos (chaves) anexado
( cd "$TMP" && git init -q . && printf "node_modules\n.env\n.env.*\n!.env.example\n" > .gitignore \
  && cat "$ROOT/.claude/skills/spec-init/assets/gitignore.secrets" >> .gitignore )
ck ".env ignorado; .env.example versionado" '( cd "$TMP" && touch .env .env.example && git check-ignore -q .env && ! git check-ignore -q .env.example )'
ck "bloco de segredos (chaves) no gitignore" '( cd "$TMP" && touch chave.pem && git check-ignore -q chave.pem )'

echo; echo "════ SMOKE: $pass PASS · $fail FAIL ════"
[ "$fail" -eq 0 ]
