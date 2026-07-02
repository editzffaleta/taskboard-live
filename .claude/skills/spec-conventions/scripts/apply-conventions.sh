#!/usr/bin/env bash
set -euo pipefail

# apply-conventions.sh
# Semeia/atualiza os extras do OpenSpec do projeto:
#   openspec/shared/{como-executar.md, regras-de-nomenclatura.md}    (estaveis)
#   openspec/templates/{modelo-base.md, modelo-crud.md}              (estaveis)
#   openspec/memory/{produto.md, contexto-tecnico.md, estrutura.md}  (vivos)
#   openspec/EXECUTION-LOG.md                                        (vivo)
#
# Dois niveis:
#   - estaveis: SOBRESCREVE (a fonte canonica e esta skill).
#   - vivos:    semeia apenas se NAO existir (nunca apaga conteudo do projeto).
#
# Uso:
#   scripts/apply-conventions.sh [caminho-openspec]   # default: ./openspec

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS="$SKILL_DIR/assets"
OPENSPEC_DIR="${1:-openspec}"

if [ ! -d "$OPENSPEC_DIR" ]; then
  echo "ERRO: '$OPENSPEC_DIR/' nao encontrado. Rode 'openspec init' antes de aplicar as convencoes." >&2
  exit 1
fi

mkdir -p "$OPENSPEC_DIR/shared" "$OPENSPEC_DIR/templates" "$OPENSPEC_DIR/memory"

overwrite() { # src dst label
  cp "$1" "$2"
  echo "ok    $3 (atualizado)"
}

seed_if_missing() { # src dst label
  if [ -f "$2" ]; then
    echo "skip  $3 (ja existe, preservado)"
  else
    cp "$1" "$2"
    echo "ok    $3 (semeado)"
  fi
}

# --- estaveis (canonicos): sobrescreve ---
overwrite "$ASSETS/shared/como-executar.md"          "$OPENSPEC_DIR/shared/como-executar.md"          "shared/como-executar.md"
overwrite "$ASSETS/shared/regras-de-nomenclatura.md" "$OPENSPEC_DIR/shared/regras-de-nomenclatura.md" "shared/regras-de-nomenclatura.md"
overwrite "$ASSETS/templates/modelo-base.md"         "$OPENSPEC_DIR/templates/modelo-base.md"         "templates/modelo-base.md"
overwrite "$ASSETS/templates/modelo-crud.md"         "$OPENSPEC_DIR/templates/modelo-crud.md"         "templates/modelo-crud.md"

# --- vivos: semeia so se faltar ---
seed_if_missing "$ASSETS/memory/produto.md"          "$OPENSPEC_DIR/memory/produto.md"          "memory/produto.md"
seed_if_missing "$ASSETS/memory/contexto-tecnico.md" "$OPENSPEC_DIR/memory/contexto-tecnico.md" "memory/contexto-tecnico.md"
seed_if_missing "$ASSETS/memory/estrutura.md"        "$OPENSPEC_DIR/memory/estrutura.md"        "memory/estrutura.md"
seed_if_missing "$ASSETS/memory/constitution.md"     "$OPENSPEC_DIR/memory/constitution.md"     "memory/constitution.md"
seed_if_missing "$ASSETS/EXECUTION-LOG.md"           "$OPENSPEC_DIR/EXECUTION-LOG.md"           "EXECUTION-LOG.md"

echo "concluido em '$OPENSPEC_DIR/'."
