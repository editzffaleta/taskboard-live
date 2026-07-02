# Dokploy — referência detalhada (compose, healthchecks, troubleshooting)

## Docker Compose de referência (opção “Compose” em vez de 2 Applications)

> Lembretes: sem `ports:` 80/443, sem `dokploy-network` manual, env de **runtime** declarado
> explicitamente (`environment:`/`env_file:`), dados fora de `code/`.

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    # runtime env — o env do painel só vale para build em Compose
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - PORT=4000
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:4000/health"]
      interval: 15s
      timeout: 5s
      retries: 5
    volumes:
      - ../files/uploads:/app/uploads   # persistência fora do code/

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}   # build-time no Next.js
    environment:
      - PORT=3000
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000"]
      interval: 15s
      timeout: 5s
      retries: 5
```

- O healthcheck interno usa `127.0.0.1` **dentro** do container (correto); o que não pode é o
  **servidor** escutar só em 127.0.0.1 — o Nest deve dar `app.listen(4000, '0.0.0.0')` e o Next
  roda com `HOSTNAME=0.0.0.0` na imagem standalone.
- Banco: prefira o **PostgreSQL gerenciado** do painel (backup/restore prontos) em vez de um
  serviço `postgres` no compose. Use o nome do serviço gerenciado como host na `DATABASE_URL`.

## Dockerfile — pontos que quebram no Dokploy

- **Next.js**: `output: 'standalone'` no `next.config`; copiar `.next/standalone` + `.next/static`;
  `ENV HOSTNAME=0.0.0.0`; `EXPOSE 3000`; `CMD ["node","server.js"]`.
- **NestJS**: build com dev-deps, imagem final só com `dist` + `node_modules` de produção +
  `prisma/` (para `migrate deploy`); `EXPOSE 4000`.
- Monorepo npm: `COPY package*.json` da raiz + workspaces antes do `npm ci` para cache de camada.

## Migrations em produção

Preferência: entrypoint do backend roda `npx prisma migrate deploy` antes de subir o Nest
(idempotente). Alternativa: console do container no painel. **Nunca** `migrate dev` em produção.

## Troubleshooting

| Sintoma | Causa provável | Correção |
|---|---|---|
| 502 Bad Gateway | app escutando em 127.0.0.1 | escutar em `0.0.0.0`; conferir `HOSTNAME`/`app.listen` |
| 404 no domínio recém-criado | healthcheck falhando → Traefik sem rota | corrigir `/health`; ver logs do serviço |
| SSL não emite | DNS não aponta p/ VPS na criação do domínio | corrigir DNS, aguardar propagação, recriar domínio |
| Env “não pega” | falta redeploy / Compose sem env runtime | redeploy; declarar `environment:` no compose |
| Upload some após deploy | arquivo salvo em `code/` | mover para volume nomeado ou `../files/` |
| Serviços não se enxergam | rede manual conflitando c/ Isolated Deployments | remover `networks:` custom; usar nome do serviço |
| Porta em uso 80/443 | serviço publicando portas do Traefik | remover `ports:`; domínio → porta do container |

## Checklist de go-live

1. `/health` 200 nos dois serviços (interno e via domínio).
2. Login completo pela URL pública (cookie `secure` funcionando sob HTTPS).
3. Backup do PostgreSQL executado 1x com sucesso.
4. Push de teste na `producao` disparou redeploy via webhook.
5. `EXECUTION-LOG.md` atualizado com domínios, serviços e commit do deploy.
