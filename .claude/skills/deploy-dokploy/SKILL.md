---
name: deploy-dokploy
description: 'Publicar o monorepo (NestJS :4000 + Next.js :3000 + PostgreSQL) em uma VPS com Dokploy. Usar quando o pedido envolver deploy, configurar o Dokploy, domínio/SSL, variáveis de produção, banco gerenciado, backup ou auto-deploy da branch producao. Não usar para deploy manual em VPS sem painel (skill arquivada deploy-node-ubuntu-vps), para ambiente local (npm run dev) nem para CI de testes (gate.sh).'
compatibility: claude-code, opencode
---

# Deploy com Dokploy

## Objetivo

Colocar o sistema em produção numa VPS com **Dokploy** (painel self-hosted com Traefik + Docker),
observando a branch **`producao`**: backend NestJS, frontend Next.js e PostgreSQL gerenciado, com
SSL automático, backups e auto-deploy por webhook. Instruções em português do Brasil.

## Quando usar / não usar

- **Usar:** primeiro deploy, novo ambiente, domínio/SSL, env de produção, backup do banco,
  auto-deploy, diagnóstico de 502/404 pós-deploy.
- **Não usar:** VPS manual legada (ver `_arquivadas/deploy-node-ubuntu-vps`), desenvolvimento
  local, pipeline de testes/CI (isso é o `gate.sh`/workflow, não o deploy).

## Entradas / Saídas

- **Entradas:** URL do repositório + branch `producao`; Dockerfiles de `apps/backend` e
  `apps/frontend` (multi-stage, `node:20-alpine`); domínios apontados por DNS; lista de variáveis
  de `.env.example`.
- **Saídas:** projeto no Dokploy com 3 serviços (backend, frontend, PostgreSQL), domínios com SSL,
  env de produção no painel, backup agendado e webhook de auto-deploy ativo.

## Regras inegociáveis (aprendidas da documentação oficial)

1. **Escutar em `0.0.0.0`**, nunca `127.0.0.1`/`localhost` — o Traefik acessa o container pela
   rede Docker; bind local = **Bad Gateway**.
2. **Nunca publicar as portas 80/443** nos serviços — são do Traefik. Não usar `ports:` para
   expor web; o roteamento é por domínio no painel.
3. **Healthcheck saudável é pré-requisito de rota**: se o healthcheck falha, o Traefik **não cria
   a rota** (404/502). Backend expõe `GET /health` (200); frontend responde `GET /` (200).
4. **DNS antes do domínio**: crie o registro A/CNAME apontando para a VPS **antes** de cadastrar o
   domínio no Dokploy, senão a emissão Let's Encrypt falha e entra em rate-limit.
5. **Env é do painel, nunca do repositório**: cadastre as variáveis em *Environment* e **redeploy**
   após alterar. Em **Docker Compose**, o env do painel vale para *build*; para o **runtime**,
   declare `environment:`/`env_file:` explícitos no compose (ver referência).
6. **`code/` é efêmero**: o diretório do clone é recriado a cada deploy. Persistência só em
   volumes nomeados ou bind em `../files/` (uploads, certificados, etc.).
7. **Rede por projeto (Isolated Deployments)**: não declarar `dokploy-network` manualmente no
   compose; o Dokploy injeta a rede do projeto. Serviços do mesmo projeto se resolvem pelo nome.

## Passo a passo

1. **Pré-check do repositório** — Dockerfiles presentes e válidos:
   `ls apps/backend/Dockerfile apps/frontend/Dockerfile .dockerignore` → devem existir. Se
   faltarem, copie de `<SKILL_DIR>/assets/` (`Dockerfile.backend`, `Dockerfile.frontend`,
   `dockerignore` → `.dockerignore` na raiz) e ajuste os TODO do cabeçalho.
   Verificação: `docker build -f apps/backend/Dockerfile .` local conclui.
2. **Projeto no Dokploy** — criar *Project* `{{produto}}`; dentro dele os serviços.
3. **PostgreSQL gerenciado** — *Create Service → Database → PostgreSQL*; anotar host interno
   (nome do serviço), usuário, senha, database. Verificação: status `running` no painel.
4. **Backend (Application)** — fonte: GitHub, branch `producao`, *Build Type* Dockerfile
   (`apps/backend/Dockerfile`, contexto na raiz). Env: `DATABASE_URL` usando o host interno do
   passo 3, `JWT_SECRET`, `PORT=4000` e demais do `.env.example`. Domínio: `api.<dominio>` →
   porta do container `4000`. Verificação: `curl -fsS https://api.<dominio>/health` → 200.
5. **Frontend (Application)** — igual, com `apps/frontend/Dockerfile`;
   `NEXT_PUBLIC_API_URL=https://api.<dominio>` (build-time!), domínio `<dominio>` → porta `3000`.
   Verificação: `curl -fsS -o /dev/null -w '%{http_code}' https://<dominio>` → 200.
6. **Migrations** — rodar `npx prisma migrate deploy` no container do backend (aba *Advanced →
   Command/Console* ou como passo do Dockerfile/entrypoint). Verificação: tabela `_prisma_migrations`
   com a última migration.
7. **Backup do banco** — no serviço PostgreSQL, agendar backup (destino + retenção).
   Verificação: primeiro backup listado com sucesso **e um restore validado** em banco
   temporário (runbook §6 — backup não testado não é backup).
8. **Auto-deploy** — ativar o webhook do provedor Git no serviço; push na `producao` dispara
   redeploy. Verificação: commit vazio de teste → deployment novo no painel.
9. **Registrar** — atualizar `openspec/EXECUTION-LOG.md` (data, serviços, domínios, commit).

## Do / Don't

- **Do**: um serviço por app; nomes internos para comunicação entre serviços; secrets só no painel.
- **Do**: conferir o healthcheck antes de investigar “SSL quebrado” — 90% dos 404/502 são healthcheck.
- **Don't**: commitar `.env`; usar `localhost` entre serviços; mapear 80/443; guardar arquivos em `code/`.
- **Don't**: criar domínio antes do DNS propagar; esquecer o redeploy após mudar env.

## Detalhe e diagnóstico

Compose de referência completo, healthchecks prontos e tabela de troubleshooting:
[references/dokploy-detalhes.md](references/dokploy-detalhes.md). Runbook operacional do
repositório: `docs/deploy-dokploy.md`.
