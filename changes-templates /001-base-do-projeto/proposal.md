<!--
TEMPLATE DE CHANGE — 001-base-do-projeto (fundacao tecnica do monorepo).
Substitua os placeholders e remova este comentario antes de usar.
Placeholders:
  {{produto}}    — nome do produto (ex.: AlphaBet)
  {{namespace}}  — scope npm SEM @ (ex.: alphabet) → usado como @{{namespace}}
-->

## Why

O {{produto}} ainda nao possui uma base tecnica compartilhada. Antes de implementar qualquer
modulo de negocio — e antes mesmo do design system (`002`) e do multi-tenancy (`003`) — e
necessario estabelecer o monorepo, a persistencia, o pacote compartilhado e a infraestrutura
base de backend e frontend. Esta e a fundacao sobre a qual todas as demais changes (`002` em
diante) sao construidas, garantindo um ponto de partida consistente, seguro e rastreavel.

## What Changes

- Criar a estrutura base do monorepo Turbo com `apps/frontend` (Next.js, porta 3000) e
  `apps/backend` (NestJS, porta 4000), sob o namespace npm `@{{namespace}}`.
- Configurar a infraestrutura do Prisma no backend com schema modular por dominio (`DbModule`,
  `PrismaService`, seed tecnico neutro, docker compose derivado da identidade do projeto),
  pronta para receber models de modulos — **sem definir nenhum model de dominio**.
- Criar o pacote compartilhado disponivel para backend, frontend e modulos de negocio, restrito
  a contratos e utilitarios base (**sem logica de dominio**).
- Configurar no backend o tratamento de erros centralizado (`DomainError` + filtro global) e a
  base de autenticacao JWT (guard global + estrategia), prontos para consumo por modulos futuros.
- Garantir a baseline de variaveis de ambiente que as mudancas seguintes dependem: `DATABASE_URL`,
  `JWT_SECRET` (backend) e `NEXT_PUBLIC_API_URL` (frontend), em `.env` e `.env.example`.
- Configurar no frontend a pasta `shared/`, as rotas Next.js com grupos `(public)` e `(private)`,
  o shell de navegacao (AdminShell + sidebar) e a base de i18n (pt/en) que as telas seguintes consomem.
- Esta mudanca entrega **apenas a base tecnica**; nenhum modulo de dominio, design system completo
  ou tenant e criado aqui.

## Capabilities

### New Capabilities
- `base-projeto`: Base tecnica compartilhada do monorepo {{produto}} — estrutura Turbo
  (backend/frontend) sob `@{{namespace}}`, persistencia Prisma modular, pacote compartilhado,
  tratamento de erros e autenticacao JWT no backend, e estrutura compartilhada, rotas, shell de
  navegacao e base de i18n no frontend.

### Modified Capabilities
<!-- Nenhuma capability existente tem requisitos alterados. -->

## Impact

- **Estrutura**: criacao de `apps/backend`, `apps/frontend`, pacote compartilhado e config de
  monorepo Turbo sob `@{{namespace}}`.
- **Persistencia**: infraestrutura Prisma (schema modular por dominio, `DbModule`, `PrismaService`,
  seed tecnico neutro, docker compose), sem models de dominio.
- **Backend**: tratamento de erros centralizado e base de autenticacao JWT (guard global +
  estrategia + decorators utilitarios).
- **Frontend**: pasta `shared/`, grupos de rotas `(public)`/`(private)`, shell com sidebar e base
  de i18n (pt/en).
- **Configuracao**: baseline de `.env`/`.env.example` (`DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`).
- **Dependencias**: namespace npm `@{{namespace}}`; nenhum modulo de dominio afetado.
