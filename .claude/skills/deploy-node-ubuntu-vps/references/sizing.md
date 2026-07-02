# VPS sizing rubric

How `scripts/recommend-vps.sh` decides, and how to reason about it by hand.

## The three tiers

| Tier | RAM | vCPU | NVMe | Typical fit |
|------|-----|------|------|-------------|
| **Small** | 2 GB | 1 | 50 GB | hobby, staging, internal tools, a light single app, build in CI, managed/tiny DB |
| **Medium** | 4 GB | 2 | 100 GB | **default** for a real single-project app in production (build on server + Postgres on box) |
| **Large** | 8 GB | 4 | 200 GB | multi-service, Redis/queues, Docker, larger DB or media on disk, real traffic |

These map to HostGator's VPS lineup; match the plan that carries these specs.
If the catalog lets you mix specs, treat **RAM** as the number that matters and
let vCPU/disk follow.

## Why RAM is the deciding factor
For a Node/Nest/Next + Postgres stack, RAM is what runs out first:
- **Next build** is the biggest spike — easily 1.5–2 GB+ peak. On 2 GB it's risky
  even with swap; 4 GB is comfortable; building in CI removes the spike entirely.
- **Each long-running Node process** (api, web) sits around 100–300 MB idle and
  grows under load.
- **PostgreSQL on the box** is light at idle but uses more with connections and
  cache; a managed DB moves this off the server.
- **Redis + queue workers** (BullMQ) add a process or two and a few hundred MB.
- **Docker** adds daemon + per-container overhead.

vCPU mostly affects **build speed** and **concurrent SSR throughput**; disk grows
with the **DB, logs, multiple deploys, node_modules, and Docker images**.

## Scoring (what the script computes)
Start at 0 and add:

| Factor | Points |
|--------|--------|
| Build on the server (not CI) | +2 |
| PostgreSQL on the same box | +1 |
| Redis / queues / background workers | +2 |
| Docker / docker compose | +1 |
| Services: 1 / 2 / 3+ | 0 / +1 / +3 |
| Traffic: low / moderate / high | 0 / +2 / +4 |

Then:
- **0–1 → Small (2/1/50)**
- **2–6 → Medium (4/2/100)**
- **7+ → Large (8/4/200)**

## Always
- **Add swap** equal to RAM (capped ~4 GB) on every tier — cheap insurance against
  OOM during builds and traffic spikes (Phase 2 of SKILL.md).
- **Build in CI to save money:** the build is the main reason to size up. If CI
  produces the artifacts and the server only runs them, a project that scored
  Medium often runs fine on Small.

## Worked examples
- **Single Nest+Next app, build on server, Postgres on box, no Redis/Docker,
  2 services, low traffic:** 2+1+1 = **4 → Medium (4/2/100)**. The everyday case.
- **App + Postgres + Redis/BullMQ, build on server, 3 services, moderate
  traffic:** 2+1+2+3+2 = **10 → Large (8/4/200)**.
- **API-only, build in CI, managed DB, 1 service, internal:** **0 → Small
  (2/1/50)**.
- **Single app, build on server, managed DB, Docker, 2 services, moderate
  traffic:** 2+1+1+2 = **6 → Medium (4/2/100)**.

## Scaling later
HostGator VPS resources are scalable — start one tier down if unsure, watch
`free -h`, `pm2 status`, and build times for a couple of weeks, and resize up if
RAM/swap is consistently tight. Moving the build to CI is usually cheaper than
jumping a tier.
