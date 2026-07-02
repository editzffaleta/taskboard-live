#!/usr/bin/env bash
# Read-only reconnaissance for a clean Ubuntu VPS. Makes NO changes.
# Run FIRST and read the output before provisioning anything.
set -uo pipefail
sec(){ printf '\n=== %s ===\n' "$1"; }

sec "OS / kernel"
grep -E '^(PRETTY_NAME|VERSION)=' /etc/os-release 2>/dev/null || true
uname -srm

sec "CPU / RAM / Swap"
nproc --all | sed 's/^/vCPU: /'
free -h

sec "Disk"
df -h / 2>/dev/null

sec "User / privileges"
id
sudo -n true 2>/dev/null && echo "passwordless sudo: yes" || echo "sudo: will prompt / locked"
getent passwd deploy >/dev/null && echo "user 'deploy' exists" || echo "user 'deploy': absent"

sec "Node toolchain"
command -v node >/dev/null 2>&1 && echo "node $(node -v)" || echo "node: not installed"
command -v corepack >/dev/null 2>&1 && echo "corepack: present" || echo "corepack: absent"
for pm in pnpm npm yarn; do command -v "$pm" >/dev/null 2>&1 && echo "$pm $($pm -v)"; done
command -v pm2 >/dev/null 2>&1 && echo "pm2 $(pm2 -v)" || echo "pm2: not installed"

sec "PostgreSQL"
command -v psql >/dev/null 2>&1 && psql --version || echo "psql: not installed"
systemctl is-active postgresql 2>/dev/null || true

sec "Docker"
command -v docker >/dev/null 2>&1 && docker --version || echo "docker: not installed"

sec "Reverse proxy"
command -v caddy >/dev/null 2>&1 && caddy version || echo "caddy: not installed"
command -v nginx >/dev/null 2>&1 && nginx -v 2>&1 || echo "nginx: not installed"

sec "Firewall (ufw)"
sudo ufw status verbose 2>/dev/null || ufw status 2>/dev/null || echo "ufw: not available / needs sudo"

sec "SSH port(s) in use"
grep -E '^\s*Port' /etc/ssh/sshd_config 2>/dev/null || echo "(Port not set in sshd_config; default 22 — but HostGator often uses a custom port)"

sec "Listening ports of interest"
ss -tlnp 2>/dev/null | awk 'NR==1 || /:(80|443|3000|4000|5432|6379)\b/' || true

printf '\nRecon complete. No changes were made.\n'
