#!/usr/bin/env bash
# Varredura de segredos com gitleaks — resiliente a versao.
# O subcomando mudou entre versoes: <=8.18 usa `detect`/`protect`; >=8.19 usa
# `git`/`dir`. Este script detecta o que existe em vez de assumir.
#
# Uso:  scripts/ci/gitleaks-scan.sh [staged|repo]
#   staged -> so o que esta no stage (pre-commit)
#   repo   -> historico do repositorio (gate/CI)   [padrao]
#
# Respeita o .gitleaksignore (raiz, por padrao). Sai != 0 ao encontrar segredo.
# Pre-condicao: gitleaks instalado (os chamadores checam com `command -v gitleaks`).
set -uo pipefail

mode="${1:-repo}"
FLAGS="--redact -v"

have_sub()       { gitleaks "$1" --help >/dev/null 2>&1; }
git_has_staged() { gitleaks git --help 2>&1 | grep -q -- '--staged'; }

if [ "$mode" = "staged" ]; then
  if have_sub git && git_has_staged; then
    exec gitleaks git --staged $FLAGS .            # gitleaks >= 8.19
  elif have_sub protect; then
    exec gitleaks protect --staged $FLAGS --source .   # gitleaks <= 8.18
  elif have_sub dir; then
    exec gitleaks dir $FLAGS .                      # sem staged dedicado: working tree
  else
    exec gitleaks detect --no-git $FLAGS --source .
  fi
else
  if have_sub git; then
    exec gitleaks git $FLAGS .                      # historico (>= 8.19)
  elif have_sub detect; then
    exec gitleaks detect $FLAGS --source .          # historico (<= 8.18)
  else
    exec gitleaks dir $FLAGS .
  fi
fi
