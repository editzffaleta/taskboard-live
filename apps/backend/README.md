# @taskboard/backend

Backend do **TaskBoard Live** — NestJS (porta 4000) com Socket.IO para o tempo real,
Prisma + PostgreSQL e arquitetura Clean/DDD (módulos de domínio em `src/modules`).

Faz parte do monorepo TaskBoard Live. Rode a partir da raiz:

```bash
npm run dev          # sobe backend :4000 + frontend :3000
npm run test         # testes (Jest)
npm run build        # build de produção
```

Variáveis de ambiente em `.env` (modelo em `.env.example`): `DATABASE_URL`, `JWT_SECRET`,
`JWT_EXPIRES_IN`, `CORS_ORIGIN`.
