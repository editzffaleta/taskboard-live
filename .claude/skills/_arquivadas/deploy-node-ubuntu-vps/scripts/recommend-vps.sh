#!/usr/bin/env bash
# Recommend a HostGator VPS size for a Node/Nest/Next (+ Postgres) project.
# PLANNING TOOL — run it BEFORE buying. Answer a few questions, get a tier.
# Portable (works with macOS's bash 3.2). Non-interactive: preset the env vars
# (e.g. BUILD_ON_SERVER=y PG_ON_BOX=y SERVICES=2 TRAFFIC=low bash recommend-vps.sh).
set -o pipefail

lc(){ printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
yn(){ case "$(lc "${1:-}")" in y|yes|s|sim|1|true) return 0;; *) return 1;; esac; }
ask(){ # ask VAR "prompt" default
  local var="$1" prompt="$2" def="$3" cur ans
  eval "cur=\${$var:-}"
  if [ -n "$cur" ]; then printf '%s %s\n' "$prompt" "$cur"; return; fi
  printf '%s ' "$prompt"; read -r ans || true
  [ -z "$ans" ] && ans="$def"
  eval "$var=\$ans"
}

echo "── VPS sizing for a Node project ─────────────────────────"
echo "Answer y/n or pick a value. Press Enter to take the [default]."
echo
ask BUILD_ON_SERVER "Build the app ON the server (not in CI)? [Y/n]"            "y"
ask PG_ON_BOX       "PostgreSQL on the SAME VPS (not a managed DB)? [Y/n]"      "y"
ask REDIS_QUEUES    "Redis / background workers / queues (BullMQ, etc.)? [y/N]" "n"
ask USE_DOCKER      "Run with Docker / docker compose? [y/N]"                   "n"
ask SERVICES        "How many long-running services/apps? (1 / 2 / 3) [2]"      "2"
ask TRAFFIC         "Expected traffic? (low / moderate / high) [low]"           "low"

pts=0; reasons=""
add(){ pts=$((pts+$1)); reasons="$reasons\n  + $2 (+$1)"; }

yn "$BUILD_ON_SERVER" && add 2 "build on server"
yn "$PG_ON_BOX"       && add 1 "Postgres on box"
yn "$REDIS_QUEUES"    && add 2 "Redis / queues"
yn "$USE_DOCKER"      && add 1 "Docker"
case "$SERVICES" in
  1) : ;;
  2) add 1 "2 services" ;;
  *) add 3 "3+ services" ;;
esac
case "$(lc "$TRAFFIC")" in
  mod*|medium|med|alta|alto) add 2 "moderate traffic" ;;
  high|alta|alto|big|grande) add 4 "high traffic" ;;
  *) : ;;
esac

if   [ "$pts" -le 1 ]; then
  tier="2 GB RAM · 1 vCPU · 50 GB NVMe";  note="hobby / staging / internal"
elif [ "$pts" -le 6 ]; then
  tier="4 GB RAM · 2 vCPU · 100 GB NVMe"; note="recommended for a real single-project production app"
else
  tier="8 GB RAM · 4 vCPU · 200 GB NVMe"; note="heavier: multi-service, queues, Docker, or real traffic"
fi

echo
echo "Score: $pts"
[ -n "$reasons" ] && printf 'From:%b\n' "$reasons" || echo "From: no add-ons"
echo
echo ">> Recommended VPS:  $tier"
echo "   ($note)"
echo
echo "Always add swap (~equal to RAM, cap ~4 GB) — see SKILL.md Phase 2."
if yn "$BUILD_ON_SERVER"; then
  echo "Tip: moving the build to CI usually lets you drop one tier (the build is"
  echo "     the biggest RAM spike)."
fi
