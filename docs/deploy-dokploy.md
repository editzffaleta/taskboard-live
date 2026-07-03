# Runbook — Deploy com Dokploy

Guia **operacional** do deploy (a skill `.claude/skills/deploy-dokploy/` é a versão que os
agentes executam; este runbook é a referência humana do dia a dia). Arquitetura: VPS única com
**Dokploy** (Traefik + Docker), backend NestJS `:4000`, frontend Next.js `:3000`, PostgreSQL
gerenciado pelo painel.

## 0. Pré-requisitos (uma vez por VPS)

1. VPS Ubuntu com Docker + Dokploy instalado (`curl -sSL https://dokploy.com/install.sh | sh`)
   e o painel acessível (porta 3000 da VPS ou domínio próprio do painel).
2. DNS do produto sob seu controle (criará `A`/`CNAME` para `<dominio>` e `api.<dominio>`).
3. Repositório no GitHub com a branch **`producao`** criada e protegida (ver
   `docs/seguranca-github.md`).

## 1. Branch `producao` (pertence ao projeto gerado, não ao template)

- Criação: `git switch -c producao && git push -u origin producao`.
- Fluxo: `change/<id>` → PR → `main` (CI verde) → quando for publicar, PR de `main` → `producao`.
  O Dokploy observa **somente** a `producao` — merge nela = deploy (via webhook).
- Nunca commitar direto na `producao`; ela recebe apenas merges de `main` já validados.

## 2. Preparar o repositório

1. Copie os assets da skill: `Dockerfile.backend` → `apps/backend/Dockerfile`,
   `Dockerfile.frontend` → `apps/frontend/Dockerfile`, `dockerignore` → `.dockerignore` (raiz).
2. Ajuste os TODO dos cabeçalhos (schema Prisma, main.js) e confirme `output: 'standalone'`
   no `next.config` e `app.listen(4000, '0.0.0.0')` no Nest.
3. Valide local: `docker build -f apps/backend/Dockerfile .` e o do frontend com
   `--build-arg NEXT_PUBLIC_API_URL=http://localhost:4000`.

## 3. Criar o projeto no painel

1. *Create Project* → nome do produto.
2. **PostgreSQL**: *Create Service → Database → PostgreSQL*; anote host interno (nome do
   serviço), porta, usuário, senha e database. Ative **backup agendado** já na criação.
3. **Backend**: *Create Service → Application* → fonte GitHub, branch `producao`,
   *Build Type: Dockerfile* (`apps/backend/Dockerfile`, contexto `.`). Em *Environment*:
   `DATABASE_URL` (host = nome interno do serviço Postgres), `JWT_SECRET`, `PORT=4000` e o
   restante do `.env.example`. Em *Domains*: `api.<dominio>` → porta `4000` (HTTPS on).
4. **Frontend**: igual, com `apps/frontend/Dockerfile`; em *Build args*:
   `NEXT_PUBLIC_API_URL=https://api.<dominio>` (é build-time!). Domínio `<dominio>` → `3000`.
5. **DNS antes do domínio**: crie os registros apontando para a VPS **antes** de salvar os
   domínios no painel (Let's Encrypt falha e entra em rate-limit se o DNS não resolver).

## 4. Primeira publicação

1. *Deploy* no backend → acompanhe o log de build → status `running`.
2. Migrations: o CMD do Dockerfile roda `prisma migrate deploy` no boot (confira no log).
3. `curl -fsS https://api.<dominio>/health` → 200. Depois *Deploy* no frontend →
   `curl -fsS -o /dev/null -w '%{http_code}\n' https://<dominio>` → 200.
4. Login completo pela URL pública (cookie `secure` exige HTTPS — não teste por IP).

## 5. Auto-deploy e rotina

- Ative o **webhook** (aba *Deployments* do serviço → GitHub) nos dois serviços; push/merge na
  `producao` dispara o redeploy. Teste com um commit vazio.
- Mudou env no painel → **Redeploy** (env não aplica a quente).
- Rollback: aba *Deployments* → redeploy de um build anterior (imagem preservada).
- Registre cada publicação no `openspec/EXECUTION-LOG.md` (data, commit, domínios).

## 6. Backup e RESTORE (backup não testado não é backup)

- **Backup**: agendado na criação do serviço PostgreSQL (seção 3); confira o primeiro backup
  listado com sucesso e a retenção configurada.
- **Restore**: no serviço PostgreSQL → aba *Backups* → *Restore* no snapshot desejado. Para
  restaurar **sem** derrubar produção, crie um serviço PostgreSQL temporário no mesmo projeto e
  restaure nele; valide com `psql` (contagem de tabelas/linhas críticas) antes de qualquer
  restore sobre o banco real.
- **Teste trimestral (obrigatório)**: a cada trimestre, restaure o backup mais recente num banco
  temporário, rode a validação e registre o resultado no `openspec/EXECUTION-LOG.md`
  (data, snapshot, resultado). Falhou → tratar como incidente: o produto está sem backup real.
- **Rollback de app ≠ restore de banco**: redeploy de build anterior não desfaz migration; se a
  migration foi destrutiva, o caminho é o restore + correção da change.

## 7. Problemas comuns

Tabela completa de troubleshooting (502/404/SSL/env/upload sumindo):
`.claude/skills/deploy-dokploy/references/dokploy-detalhes.md`. Regra de ouro: 90% dos
404/502 pós-deploy são **healthcheck falhando** (Traefik não cria rota sem ele) ou app
escutando em `127.0.0.1` em vez de `0.0.0.0`.
