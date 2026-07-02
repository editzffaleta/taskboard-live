#!/usr/bin/env bash
# Gate de validação.
# Roda localmente (antes do push) e no CI (mesmo conjunto de checks).
# Executa apenas os scripts que existem no package.json. Falha no 1º erro.

set -euo pipefail

if [ ! -f package.json ]; then
  echo "Sem package.json — nada para validar."
  exit 0
fi

# Detecta o package manager pelo lockfile
if   [ -f package-lock.json ]; then PM="npm"
elif [ -f pnpm-lock.yaml ];    then PM="pnpm"
elif [ -f yarn.lock ];         then PM="yarn"
elif [ -f bun.lockb ];         then PM="bun"
else                                PM="npm"
fi

has_script() {
  node -e "process.exit((require('./package.json').scripts||{})['$1'] ? 0 : 1)" 2>/dev/null
}

run_script() { echo "▶ $PM run $1"; "$PM" run "$1"; }

run_step() {
  if has_script "$1"; then run_script "$1"; else echo "⏭  sem script '$1' — pulando"; fi
}

echo "== Gate de validação ($PM) =="

# 0) Segredos (gitleaks) — fail-fast. Só roda se o binário existir; o CI instala
#    o gitleaks, então lá sempre roda. Localmente é best-effort (pula se ausente).
if command -v gitleaks >/dev/null 2>&1 && [ -f scripts/ci/gitleaks-scan.sh ]; then
  echo "▶ gitleaks (varredura de segredos)"
  bash scripts/ci/gitleaks-scan.sh repo
else
  echo "⏭  gitleaks ausente — pulando varredura de segredos (o CI cobre)"
fi

# 0.1) Vulnerabilidades de dependências — bloqueante (HIGH+). Rápido; roda sempre com npm.
if [ "$PM" = "npm" ]; then
  echo "▶ npm audit (dependências de produção, nível high+)"
  npm audit --omit=dev --audit-level=high
else
  echo "⏭  audit automático só implementado para npm — rode o audit do seu PM manualmente"
fi

run_step lint
# typecheck pode aparecer como 'typecheck' ou 'check-types' (padrão do create-turbo)
if   has_script typecheck;   then run_script typecheck
elif has_script check-types; then run_script check-types
else echo "⏭  sem 'typecheck'/'check-types' — pulando"; fi
run_step test
run_step build

# 5) SAST (Semgrep) — bloqueante quando presente; o CI instala, então lá sempre roda.
if command -v semgrep >/dev/null 2>&1; then
  echo "▶ semgrep (SAST — config p/ci)"
  semgrep scan --config p/ci --error --quiet --metrics=off
else
  echo "⏭  semgrep ausente — pulando SAST (o CI cobre; local: pipx install semgrep)"
fi

# 6) Vulnerabilidades no filesystem/lockfile (Trivy) — bloqueante quando presente.
if command -v trivy >/dev/null 2>&1; then
  echo "▶ trivy fs (vulnerabilidades HIGH/CRITICAL)"
  trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed --quiet .
else
  echo "⏭  trivy ausente — pulando scan de vulnerabilidades (o CI cobre)"
fi

echo "✅ Gate verde — seguro para subir."
