<!-- TEMPLATE — design da fundacao. Placeholders: TaskBoard Live, taskboard. -->

## Context

O TaskBoard Live adota um monorepo Turbo com `apps/frontend` (Next.js, porta 3000) e `apps/backend`
(NestJS, porta 4000), sob o namespace npm `@taskboard`. A persistencia e via Prisma com schema
modular por dominio, e o backend usa autenticacao baseada em JWT com tratamento de erros
centralizado. O frontend e organizado com a pasta `shared/`, grupos de rotas `(public)`/`(private)`,
shell de navegacao (AdminShell + sidebar) e base de i18n (pt/en).

Esta mudanca entrega **apenas a base tecnica**. O design system derivado das telas e da `002`; o
multi-tenancy (modelo `organization` e escopo de tenant) e da `003`; modulos de dominio (a comecar
por `auth`) vem da `004` em diante.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Estabelecer a base do monorepo (backend + frontend) sob `@taskboard`.
- Configurar a infraestrutura do Prisma (schema modular por dominio), pronta para receber models.
- Criar o pacote compartilhado consumivel por backend, frontend e modulos.
- Configurar tratamento de erros centralizado e base de autenticacao JWT no backend.
- Configurar a estrutura compartilhada, as rotas, o shell e a base de i18n do frontend.
- Garantir a baseline de variaveis de ambiente que as mudancas seguintes consomem.

**Non-Goals:**
- Criar qualquer modulo de dominio do produto (ex.: `auth`). Foco exclusivo em infraestrutura.
- Definir models de dominio no Prisma — apenas deixar a infraestrutura pronta.
- Aplicar o design system (tokens, paleta, componentes das telas) — escopo da `002`.
- Introduzir organizacao/tenant ou escopo multi-tenant — escopo da `003`.

## Decisions

- **Namespace `@taskboard`**: alinha os pacotes do workspace a identidade do produto. Decisao
  tomada via flag `--namespace @taskboard` da skill `config-project-fullstack`. *(Caso prefira
  outro scope, esta e a unica decisao a reverter antes de aplicar.)*
- **Skills dedicadas como implementacao principal**: cada etapa e executada por uma skill especifica
  (`config-project-fullstack`, `config-prisma`, `config-package-shared`, `backend-nest-config`,
  `frontend-next-config`), conforme a regra de preferir a ferramenta indicada. Alternativa
  (config manual) descartada por reduzir rastreabilidade e consistencia.
- **Schema Prisma modular por dominio**: prepara a base para que modulos futuros (a partir da `003`)
  adicionem seus models (`*.model.prisma`) sem reescrever a infraestrutura compartilhada.
- **Baseline de `.env` explicita**: `DATABASE_URL`, `JWT_SECRET` e `NEXT_PUBLIC_API_URL` ja na
  fundacao porque `004`/`005` (registro/login) e seguintes dependem delas; declarar agora evita
  retrabalho e quebra de contrato adiante.
- **Base de i18n (pt/en) na fundacao**: as telas seguintes (a partir da `004`) mapeiam codigos de
  erro e textos em `messages.pt.ts`/`messages.en.ts`; criar a estrutura agora evita reinvencao.

## Risks / Trade-offs

- [Skill indicada nao cobre o caso inteiro] → Aplicar a skill ate onde fizer sentido e completar
  manualmente o restante, registrando o desvio na evidencia.
- [Acoplamento entre apps via pacote compartilhado] → Manter o pacote restrito a contratos e
  utilitarios base, sem logica de dominio.
- [Infra de banco indisponivel no ambiente] → A verificacao (3.x) pode pausar aguardando o Docker;
  retomar apos subir o Postgres.
