<!--
TEMPLATE — tasks da fundacao. Checkboxes vazios; ao executar, marque e adicione evidencia
(`> ✅ AAAA-MM-DD HH:MM — ...`). Cada task tem **Aceite** (criterio de pronto) para reduzir erro.
Use a skill indicada como implementacao principal; se nao cobrir tudo, complete e registre o desvio.
-->

> **Antes de comecar:** leia `openspec/config.yaml`, `openspec/shared/como-executar.md` e
> `openspec/shared/regras-de-nomenclatura.md`. **Pre-requisitos desta mudanca:** nenhuma (e a base).
> **Nao faca:** nenhum modulo de dominio, nenhum model Prisma de dominio, nenhum design system
> completo, nenhum tenant — isso e escopo de `002`/`003`/`004+`.

## 1. Configuracao (backend + monorepo)

- [ ] 1.1 Criar a estrutura base do monorepo com a skill
  [config-project-fullstack](../../../.claude/skills/config-project-fullstack) usando o namespace
  `@taskboard` (flag `--namespace @taskboard`).
  - **Aceite:** existem `apps/backend` (Nest, :4000) e `apps/frontend` (Next, :3000); pacotes do
    workspace sob `@taskboard`; `.env`/`.env.example` em ambos os apps.
- [ ] 1.2 Configurar a infraestrutura do Prisma com a skill
  [config-prisma](../../../.claude/skills/config-prisma): schema modular por dominio, `DbModule`,
  `PrismaService`, seed tecnico neutro e docker compose — **sem models de dominio**.
  - **Aceite:** `prisma/schema.prisma` + `prisma/models/` (sem model de dominio), `prisma/seed/`,
    `docker-compose.yml`, `src/db/{db.module.ts,prisma.service.ts}`, `DbModule` no `AppModule`,
    `DATABASE_URL` no `.env`.
- [ ] 1.3 Criar o pacote compartilhado com a skill
  [config-package-shared](../../../.claude/skills/config-package-shared) sob `@taskboard`,
  restrito a contratos e utilitarios base.
  - **Aceite:** `packages/shared` como `@taskboard/shared` com contratos base (`model`,
    `usecase`, `error`, `validation`), **sem logica de dominio**; `build` e testes do pacote verdes.
- [ ] 1.4 Configurar erros centralizados + autenticacao JWT com a skill
  [backend-nest-config](../../../.claude/skills/backend-nest-config) (filtro global de erros,
  guard global de JWT, estrategia e decorators utilitarios).
  - **Aceite:** `apps/backend/src/shared/` com auth (guard/módulo/estrategia/mapper), decorators
    (`@Public`, `@CurrentUser`), erros (`ApiExceptionFilter` + `ApiErrorResponse`); `APP_FILTER` e
    `APP_GUARD` globais registrados; `JWT_SECRET`/`JWT_EXPIRES_IN` no `.env`.
- [ ] 1.5 Garantir a baseline de variaveis de ambiente: `DATABASE_URL` e `JWT_SECRET` no backend e
  `NEXT_PUBLIC_API_URL` no frontend, em `.env` e `.env.example`.
  - **Aceite:** as tres variaveis presentes nos dois arquivos de cada app (valor dev no `.env`,
    vazio/exemplo no `.env.example`).

## 2. Front-end

- [ ] 2.1 Executar a skill [frontend-next-config](../../../.claude/skills/frontend-next-config)
  para configurar a pasta `shared/`, os grupos de rotas `(public)`/`(private)` e o shell
  (AdminShell + sidebar).
  - **Aceite:** `src/shared/` (components/ui, branding, form/validator, context, hooks, i18n, lib,
    navigation, types com `api-error.type.ts`), grupos `(public)`/`(private)` com layouts,
    landing raiz; `next build` OK.
- [ ] 2.2 Estabelecer a base de i18n (pt/en) em `shared/i18n` (`messages.pt.ts`/`messages.en.ts`)
  pronta para receber as chaves das mudancas seguintes (a skill `frontend-next-config` cobre isso;
  se nao cobrir, complete manualmente e registre o desvio).
  - **Aceite:** `messages.pt.ts`, `messages.en.ts` e `index.ts` (com `getErrorMessage()` compativel
    com `ApiErrorResponse`) presentes.

## 3. Verificacao

- [ ] 3.1 Subir o banco com `npm --workspace apps/backend run db:start` e validar o Prisma com
  `npm --workspace apps/backend run prisma:generate`.
  - **Aceite:** container do Postgres ativo; Prisma Client gerado sem erros.
- [ ] 3.2 Verificar que o backend sobe em `:4000` e o frontend em `:3000` sem erros, que os pacotes
  usam `@taskboard` e que **nenhum modulo de dominio** foi criado.
  - **Aceite:** boot 200 nas duas portas; `npx tsc --noEmit` limpo nos dois apps; testes do shared
    verdes; sem `src/modules` no backend e sem `modules/` na raiz (Prisma so com model bootstrap/neutro).
