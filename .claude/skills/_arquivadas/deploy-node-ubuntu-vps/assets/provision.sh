#!/usr/bin/env bash
# One-time provisioning for a clean Ubuntu 22.04 VPS. RUN AS ROOT.
# Idempotent and sectioned on purpose — review it, set the vars below, and
# run it (or copy section by section). It does NOT deploy your app; that's deploy.sh.
set -Eeuo pipefail

# ---- configure these ----
DEPLOY_USER="deploy"
SSH_PORT="22"                 # set to HostGator's actual port (often 22022)
DB_NAME="appdb"
DB_USER="appuser"
DB_PASSWORD="CHANGE_ME_STRONG"
NODE_MAJOR="22"               # 22 LTS (or 24)
SWAP_SIZE="4G"
PUBKEY=""                     # paste the Mac public key (~/.ssh/vps.pub) to seed the deploy user
# -------------------------

log(){ printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

log "1/7 Swap (${SWAP_SIZE})"
if swapon --show | grep -q '/swapfile'; then
  echo "swap already present, skipping"
else
  fallocate -l "${SWAP_SIZE}" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf && sysctl --system >/dev/null
fi

log "2/7 Deploy user (${DEPLOY_USER})"
if id "${DEPLOY_USER}" >/dev/null 2>&1; then
  echo "user exists, skipping create"
else
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
  usermod -aG sudo "${DEPLOY_USER}"
fi
if [ -n "${PUBKEY}" ]; then
  install -d -m700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  echo "${PUBKEY}" >> "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
fi

log "3/7 Node ${NODE_MAJOR}.x + corepack"
if command -v node >/dev/null 2>&1; then
  echo "node $(node -v) already installed"
else
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
corepack enable || true

log "4/7 PostgreSQL"
if ! command -v psql >/dev/null 2>&1; then
  apt-get install -y postgresql postgresql-contrib
fi
systemctl enable --now postgresql
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
echo "DATABASE_URL = postgresql://${DB_USER}:<password>@127.0.0.1:5432/${DB_NAME}"

log "5/7 Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

log "6/7 Firewall (ufw)"
ufw allow "${SSH_PORT}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

log "7/7 PM2 (global)"
command -v pm2 >/dev/null 2>&1 || npm i -g pm2

log "Provisioning done. Next: log in as ${DEPLOY_USER}, clone the repo, set .env, deploy.sh."
