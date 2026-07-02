#!/usr/bin/env bash
# Idempotent deploy for a Nest+Next Turborepo on a clean Ubuntu VPS.
# Run as the 'deploy' user. Safe to run repeatedly. Point GitHub Actions or a
# webhook at this same script later (see SKILL.md, "Wiring a trigger later").
set -Eeuo pipefail

# ---- configure these ----
APP_DIR="${APP_DIR:-$HOME/apps/PROJECT}"
BRANCH="${BRANCH:-main}"
PM="${PM:-pnpm}"                  # pnpm | npm  (recon tells you which)
# -------------------------

cd "$APP_DIR"

echo "==> Pull origin/$BRANCH"
git fetch --all --prune
git reset --hard "origin/${BRANCH}"

echo "==> Install dependencies (frozen lockfile)"
if [ "$PM" = "pnpm" ]; then pnpm install --frozen-lockfile; else npm ci; fi

echo "==> Prisma: generate + migrate deploy"
( cd apps/api && npx prisma generate && npx prisma migrate deploy )   # adjust path if schema lives elsewhere

echo "==> Build (turbo, single concurrency to spare RAM on 4 GB)"
npx turbo run build --concurrency=1

echo "==> Reload via PM2 (zero-downtime) + persist"
pm2 reload ecosystem.config.cjs --update-env
pm2 save

echo "==> Done."
