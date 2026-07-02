# HostGator "VPS simples" (Ubuntu) — specifics

Notes specific to running this on a HostGator BR VPS with no control panel.

## Choosing the plan / OS
- HostGator's **"VPS simples"** ships **with no panel** and gives **full root via
  SSH** — you install only what you need. OS options are **Ubuntu 22.04 LTS,
  AlmaLinux 9, or Rocky Linux 9**. This skill assumes **Ubuntu 22.04**.
- "cPanel disponível" on the pricing page means cPanel is an *optional* add-on,
  not required. For your own apps you don't need it — skipping it frees RAM and
  avoids a license cost.
- Management (security, updates, backups) is **entirely your responsibility** —
  there's no managed hand-holding.

## SSH access
- HostGator emails the IP and access details after purchase. First login is as
  **`root`**, often on a **custom port** (e.g. `22022`), not 22:
  ```bash
  ssh -p 22022 root@<IP>
  ```
- If a cPanel/WHM add-on is ever installed, the **root password equals the WHM
  password** — but on a panel-less VPS, just use the root credentials from the
  welcome email (or set a key).
- Confirm the real port from the welcome email or the client portal, and put it
  in `~/.ssh/config` and in `provision.sh` (`SSH_PORT`).

## DNS (do this before Caddy)
Point your domain's **A record → the VPS IP** (and `www` if you use it) at your
registrar. Caddy can only issue the TLS certificate once the domain resolves to
the box. Propagation can take a few minutes to a couple of hours.

## Hardening (after key login works)
Edit `/etc/ssh/sshd_config`:
```
PasswordAuthentication no
PermitRootLogin no            # only after the 'deploy' user works via key
Port 22022                    # keep HostGator's port (or change it, then update ufw)
```
Then `sudo systemctl restart ssh`. **Keep an existing session open** while you
test a fresh login, so a mistake doesn't lock you out. `ufw` already limits the
surface to SSH + 80 + 443.

## Backups
No panel means no automatic cPanel backups. Options: enable HostGator's snapshot/
backup add-on if offered, `pg_dump` on a cron to off-box storage, and keep the
repo as the source of truth for code (the server holds no unique state except the
DB and `.env`).

## nginx + certbot (alternative to Caddy)
If you'd rather use nginx:
```bash
sudo apt-get install -y nginx
# server block: location /api/ -> proxy_pass http://127.0.0.1:4000/;  location / -> :3000;
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```
Caddy is recommended only because it does the same with far less config and
auto-renews TLS without a separate certbot timer.

## Docker (also fine here)
A clean Ubuntu VPS has no CloudLinux/CageFS restriction, so Docker works
normally if you prefer containers — install via `get.docker.com`, publish ports
to `127.0.0.1`, and let Caddy proxy to them. Run migrations as a one-off:
`docker compose run --rm api npx prisma migrate deploy`.
