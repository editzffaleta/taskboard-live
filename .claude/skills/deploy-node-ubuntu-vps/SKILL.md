---
name: deploy-node-ubuntu-vps
description: >-
  Deploy any Node project — a single app or a NestJS + Next.js Turborepo monorepo
  (Prisma/PostgreSQL) — to a clean Ubuntu VPS with full root (e.g. a HostGator
  "VPS simples", no control panel), from a Mac, using a read-only GitHub deploy
  key, Caddy for automatic HTTPS, and PM2. Project-agnostic: it adapts by reading
  the target repo. Use it for "fazer deploy", "subir o projeto", putting a
  Node/Next/Nest app on a Linux server, SSH/deploy-key setup, reverse proxy with
  auto TLS, Prisma migrations in production, adding swap, or keeping a Node
  process alive. Also use it to recommend the right VPS size (RAM, vCPU, NVMe —
  2/4/8 GB) before buying: "qual VPS contratar", "quantos GB de RAM", "dimensionar
  a VPS". Trigger even when Caddy, PM2, ufw, or swap aren't named. For a cPanel/WHM
  VPS use deploy-node-cpanel-vps instead; not for Vercel/Railway/Render or static.
---

# Deploy: Node monorepo → clean Ubuntu VPS

Takes a Node project — a single app or a Turborepo monorepo (NestJS API +
Next.js app + Prisma on PostgreSQL) — from a Mac to a **clean Ubuntu 22.04 VPS
with root and no control panel**. This is the simplest, cheapest path for a
developer's own apps — you own ports 80/443, so **Caddy** handles TLS
automatically and there's none of the cPanel/Apache gymnastics. It is
**project-agnostic**: nothing here is hard-coded to one repo — see "Adapt to any
project" below.

Covers the four things asked for:
1. **VPS ↔ GitHub** — the server pulls the repo over SSH (Phase 3).
2. **GitHub key on the server** — a read-only *deploy key* (Phase 3).
3. **VPS ↔ Mac** — SSH with a key (Phase 1).
4. **Make the code run** — swap, Node, PostgreSQL/Prisma, PM2, Caddy TLS,
   firewall (Phases 2 & 4).

## Sizing the VPS (do this BEFORE buying)

The binding constraint for these stacks is **RAM** (Node + the Next build +
Postgres); on HostGator's lineup vCPU and disk scale with it, so the decision
collapses to one of three tiers:

| Tier | Spec | Fits |
|------|------|------|
| Small | **2 GB · 1 vCPU · 50 GB** | hobby / staging / internal, light single app, build in CI, managed or tiny DB |
| Medium | **4 GB · 2 vCPU · 100 GB** | **default for a real single-project production app** (build on server + Postgres on box) |
| Large | **8 GB · 4 vCPU · 200 GB** | multi-service, Redis/queues (BullMQ), Docker, larger DB, or real traffic |

Run the recommender instead of guessing — it asks a few questions about the
project and prints a tier with reasoning:

```bash
bash scripts/recommend-vps.sh
```

Full rubric and the scoring it uses are in `references/sizing.md`. Two rules that
always apply: **add swap** regardless of tier (Phase 2), and **building in CI
instead of on the server usually drops you one tier** (the build is the biggest
RAM spike).

## Adapt to any project (auto-fill the placeholders)

Before provisioning, inspect the target repo and fill the placeholders from what
you find — do not assume a specific project:
- **Package manager:** the `packageManager` field in root `package.json` / the
  lockfile (`pnpm-lock.yaml` → pnpm, `package-lock.json` → npm). Set `PM` in
  `deploy.sh` and the `script` in `ecosystem.config.cjs` accordingly.
- **Apps & ports:** which workspaces exist (`apps/*`, `packages/*`) and the port
  each listens on; update `ecosystem.config.cjs` (drop the `web` app for an
  API-only project, add apps for more services).
- **Prisma:** path to `schema.prisma` (adjust the `cd apps/api` step in
  `deploy.sh`); skip the Prisma steps entirely if the project doesn't use it.
- **Extras:** Redis/queues or a `docker-compose.yml` in the repo → factor into
  the sizing and provisioning.

## Architecture

- **Runtime:** PM2 + system Node (≥ 22, via NodeSource). PM2 keeps Nest (`:4000`)
  and Next (`:3000`) alive with restarts and zero-downtime reloads; `pm2 startup`
  (systemd) survives reboots cleanly because Node is system-installed.
- **TLS & routing:** **Caddy** terminates HTTPS (auto Let's Encrypt) and
  reverse-proxies `/api/* → :4000`, everything else `→ :3000`. The apps bind to
  **127.0.0.1** only.
- **Database:** PostgreSQL on the box, or a managed DB (Neon/Supabase).
- **Firewall:** `ufw` — only SSH + 80 + 443 public; app ports and Postgres stay
  on localhost.
- **Alternative:** Docker Compose works freely on a clean VPS (no CloudLinux
  blocking). nginx + certbot is fine too, but Caddy is simpler — use it unless
  there's a reason not to.

## Small-box reality (swap + builds)

Whatever tier you picked, two things matter most on the smaller ones:
- **Add swap (Phase 2).** A Next build can spike past RAM (especially on 2–4 GB);
  swap prevents the OOM killer from killing the build or Postgres.
- **Build conservatively.** `deploy.sh` runs `turbo` with `--concurrency=1` so
  apps don't build in parallel and double the peak memory. If builds still strain
  the box, build in CI and ship artifacts instead of building on the server —
  that's also what lets a project run comfortably on the Small tier.

## Operating principle: recon → plan → confirm

This is a production server, so move deliberately:
- **Run Phase 0 first — it is read-only and changes nothing.**
- After recon, **state a short plan** and get an explicit "go" before changing anything.
- **Gate every system-level / destructive step** (apt installs, ufw, creating the
  DB, **`prisma migrate deploy`**, disabling root login) behind confirmation.
- Treat `HOST`, `SSH_PORT`, `DOMAIN`, `ORG/REPO`, and passwords as placeholders to
  fill from the user — never invent them.

> HostGator specifics (custom SSH port like `22022`, DNS, OS choice, self-managed
> responsibility) are in `references/hostgator-ubuntu.md`.

---

## Phase 0 — Recon (read-only)

```bash
scp -P <SSH_PORT> scripts/recon.sh root@<HOST>:~/recon.sh
ssh -p <SSH_PORT> root@<HOST> 'bash ~/recon.sh'
```

Read the output: OS version, **RAM/swap** (is swap already set?), Node/pnpm,
PostgreSQL, Docker, Caddy/nginx, ufw status, the real SSH port, and what's
listening. Then present the plan.

---

## Phase 1 — Mac ↔ server (SSH)  · pillar 3

Generate a dedicated key on the Mac:
```bash
ssh-keygen -t ed25519 -C "bruno@vps" -f ~/.ssh/vps
```

First login is as `root` on the custom port (HostGator emails you the IP/port):
```bash
ssh-copy-id -i ~/.ssh/vps.pub -p <SSH_PORT> root@<HOST>
```

Add a host alias (`~/.ssh/config` on the Mac):
```sshconfig
Host myvps
  HostName <HOST_OR_IP>
  User deploy           # use 'root' until the deploy user exists (Phase 2)
  Port <SSH_PORT>
  IdentityFile ~/.ssh/vps
  IdentitiesOnly yes
```

---

## Phase 2 — Provision the server (one-time, as root)  · pillar 4

`assets/provision.sh` scripts all of this; **review it, fill the variables at the
top, and run the sections deliberately** (it's idempotent). What it does:

1. **Swap** — creates a 4 GB swapfile and lowers `vm.swappiness` (skip if recon
   shows swap exists).
2. **Deploy user** — creates a non-root `deploy` user with sudo and copies your
   SSH key, so the app never runs as root.
3. **Node** — NodeSource Node 22 + `corepack enable` (for pnpm).
4. **PostgreSQL** — installs, enables, and creates the role + database.
5. **Caddy** — installs from the official repo.
6. **ufw** — allows the SSH port + 80 + 443, then enables the firewall.
7. **PM2** — `npm i -g pm2`.

After this, switch to the `deploy` user for everything below
(`ssh myvps` once the alias points at `deploy`).

---

## Phase 3 — GitHub deploy key + clone  · pillars 1 & 2

As the `deploy` user, make a **read-only** key the repo trusts (a leak can't push):
```bash
ssh-keygen -t ed25519 -C "deploy@PROJECT" -f ~/.ssh/github_deploy -N ""
```
`~/.ssh/config` (on the server):
```sshconfig
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
```
Add `cat ~/.ssh/github_deploy.pub` to the repo → **Settings → Deploy keys → Add**
→ **leave "Allow write access" UNCHECKED**. Then:
```bash
ssh -T git@github.com        # accept fingerprint
git clone git@github.com:<ORG>/<REPO>.git ~/apps/PROJECT
```

---

## Phase 4 — Make it run

### 4a · Env files
Read the repo's `.env.example`, create the real env files (`apps/api/.env`,
`apps/web/.env`, or root `.env` — match the project), set `DATABASE_URL` etc.,
then `chmod 600` them. Never commit them.

### 4b · Prisma  *(confirm before migrating — it alters the live DB)*
```bash
cd ~/apps/PROJECT/apps/api && npx prisma generate && npx prisma migrate deploy && cd -
```

### 4c · PM2
Copy `assets/ecosystem.config.cjs` to the repo root, adjust app `cwd`/ports, make
each app's `start` script bind `127.0.0.1`. Then:
```bash
mkdir -p ~/apps/PROJECT/logs
cd ~/apps/PROJECT
npx turbo run build --concurrency=1
pm2 start ecosystem.config.cjs && pm2 save
pm2 startup            # run the sudo command it prints (systemd → survives reboot)
```

### 4d · Caddy (HTTPS + reverse proxy)
**Point the domain's DNS A record at the VPS IP first** — Caddy needs it to issue
the certificate. Then put `assets/Caddyfile` at `/etc/caddy/Caddyfile` (set your
domain), and:
```bash
sudo systemctl reload caddy
```
Caddy fetches and renews TLS automatically. Verify:
```bash
curl -I https://<DOMAIN>
```

---

## Phase 5 — First deploy & verify

```bash
chmod +x ~/apps/PROJECT/deploy.sh      # from assets/, vars set at top
~/apps/PROJECT/deploy.sh
pm2 status
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000        # Next
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4000/health # Nest
curl -I https://<DOMAIN>
pm2 logs --lines 50
```

## Wiring a trigger later (you chose "decidimos depois")

`deploy.sh` is the single idempotent entry point — only the trigger changes:
- **Manual (now):** `ssh myvps 'cd ~/apps/PROJECT && ./deploy.sh'`
- **GitHub Actions:** on push to `main`, an SSH action runs `deploy.sh` (store the
  Mac key + host as repo secrets).
- **Webhook:** a small listener verifies the GitHub signature, then runs `deploy.sh`.

## Bundled files
- `scripts/recommend-vps.sh` — pre-purchase VPS sizing recommender (run before buying).
- `scripts/recon.sh` — read-only server discovery (run first, after buying).
- `assets/provision.sh` — one-time root setup (swap, user, Node, Postgres, Caddy, ufw, PM2).
- `assets/ecosystem.config.cjs` — PM2 process file for the app(s).
- `assets/deploy.sh` — pull → install → prisma → build → reload (RAM-friendly).
- `assets/Caddyfile` — HTTPS + reverse proxy.
- `references/sizing.md` — the full VPS-sizing rubric and scoring.
- `references/hostgator-ubuntu.md` — HostGator-specific notes (SSH port, DNS, OS,
  hardening, nginx alternative).

## Security defaults
- ed25519 keys; separate keys for Mac→server and server→GitHub; deploy key read-only.
- App runs as non-root `deploy`; app ports + Postgres on `127.0.0.1`; only SSH/80/443 public.
- Env files `chmod 600`, never committed.
- After key login works for `deploy`, disable SSH password auth and root login
  (`PasswordAuthentication no`, `PermitRootLogin no` → `systemctl restart ssh`);
  keep a session open while testing so you don't lock yourself out.
