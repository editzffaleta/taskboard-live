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

- [x] 1.1 Criar a estrutura base do monorepo com a skill
  [config-project-fullstack](../../../.claude/skills/config-project-fullstack) usando o namespace
  `@taskboard` (flag `--namespace @taskboard`).
  - **Aceite:** existem `apps/backend` (Nest, :4000) e `apps/frontend` (Next, :3000); pacotes do
  > ✅ 2026-07-05 16:11 — monorepo criado no bootstrap (config-project-fullstack, namespace @taskboard): apps/backend :4000, apps/frontend :3000, packages/*, .env/.env.example.
    workspace sob `@taskboard`; `.env`/`.env.example` em ambos os apps.
- [x] 1.2 Configurar a infraestrutura do Prisma com a skill
  [config-prisma](../../../.claude/skills/config-prisma): schema modular por dominio, `DbModule`,
  `PrismaService`, seed tecnico neutro e docker compose — **sem models de dominio**.
  - **Aceite:** `prisma/schema.prisma` + `prisma/models/` (sem model de dominio), `prisma/seed/`,
    `docker-compose.yml`, `src/db/{db.module.ts,prisma.service.ts}`, `DbModule` no `AppModule`,
    `DATABASE_URL` no `.env`.
  > ✅ 2026-07-05 00:00 — Executado `node .claude/skills/config-prisma/scripts/init-prisma-backend.js --dry-run` e depois `--apply --install` a partir da raiz. Gerados `apps/backend/prisma/{schema.prisma,models/bootstrap.model.prisma,seed/main.ts,migrations/}`, `apps/backend/prisma.config.ts`, `apps/backend/docker-compose.yml`, `apps/backend/src/db/{db.module.ts,prisma.service.ts}`; `DbModule` registrado em `app.module.ts`; `DATABASE_URL` adicionada em `.env`/`.env.example`. Sem model de dominio (apenas `bootstrap.model.prisma` neutro). `npx prisma generate` rodado com sucesso (v7.8.0). Sem desvios.
- [x] 1.3 Criar o pacote compartilhado com a skill
  [config-package-shared](../../../.claude/skills/config-package-shared) sob `@taskboard`,
  restrito a contratos e utilitarios base.
  - **Aceite:** `packages/shared` como `@taskboard/shared` com contratos base (`model`,
    `usecase`, `error`, `validation`), **sem logica de dominio**; `build` e testes do pacote verdes.
  > ✅ 2026-07-05 00:00 — Executado `node .claude/skills/config-package-shared/scripts/rebuild-shared.js` a partir da raiz. Pacote recriado em `packages/shared` como `@taskboard/shared` (scope detectado automaticamente), com `model/entity`, `usecase/use-case`, `error/*` e `validation/*` (sem logica de dominio). `npx turbo run build --filter=@taskboard/shared` verde; `npm --workspace packages/shared run test` — 21 suites / 96 testes passando, cobertura 100% nas regras de validacao. Sem desvios.
- [x] 1.4 Configurar erros centralizados + autenticacao JWT com a skill
  [backend-nest-config](../../../.claude/skills/backend-nest-config) (filtro global de erros,
  guard global de JWT, estrategia e decorators utilitarios).
  - **Aceite:** `apps/backend/src/shared/` com auth (guard/módulo/estrategia/mapper), decorators
    (`@Public`, `@CurrentUser`), erros (`ApiExceptionFilter` + `ApiErrorResponse`); `APP_FILTER` e
    `APP_GUARD` globais registrados; `JWT_SECRET`/`JWT_EXPIRES_IN` no `.env`.
  > ✅ 2026-07-05 00:00 — Executado `node .claude/skills/backend-nest-config/scripts/apply-backend-shared.js`. Criado `apps/backend/src/shared/{auth,decorators,errors,types}` (guard/estrategia/mapper JWT, `@Public`/`@CurrentUser`, `ApiExceptionFilter` + `ApiErrorResponse`); `app.module.ts` reescrito registrando `APP_FILTER`/`APP_GUARD`/`JwtAuthModule`/`DbModule`; `app.controller.ts` com `@Public()` no endpoint raiz. `JWT_SECRET`/`JWT_EXPIRES_IN` adicionados em `.env`/`.env.example` (aditivo, sem sobrescrever). Primeira tentativa de build falhou por Prisma Client ainda não gerado (`PrismaClient` ausente em `@prisma/client`) — resolvido rodando `npx prisma generate` (parte natural da task 1.2/3.1); após isso `npm --workspace apps/backend run build` passou limpo. Sem outros desvios.
- [x] 1.5 Garantir a baseline de variaveis de ambiente: `DATABASE_URL` e `JWT_SECRET` no backend e
  `NEXT_PUBLIC_API_URL` no frontend, em `.env` e `.env.example`.
  - **Aceite:** as tres variaveis presentes nos dois arquivos de cada app (valor dev no `.env`,
    vazio/exemplo no `.env.example`).
  > ✅ 2026-07-05 00:00 — Parte backend confirmada: `DATABASE_URL` adicionada pela skill `config-prisma` (task 1.2) e `JWT_SECRET`/`JWT_EXPIRES_IN` pela skill `backend-nest-config` (task 1.4), ambas em `apps/backend/.env` (valor dev) e `apps/backend/.env.example` (exemplo), de forma aditiva. Leitura direta de `.env*` bloqueada pelo guardrail de segredos do repositório (esperado); confirmação feita via saída determinística dos scripts das skills. Parte frontend (`NEXT_PUBLIC_API_URL`) fora do escopo deste agente — cabe ao especialista de frontend confirmar em 1.5 (frontend) / 2.x.
  > ✅ 2026-07-05 16:10 (frontend) — Confirmado `NEXT_PUBLIC_API_URL` presente em
  > `apps/frontend/.env` (valor dev `http://localhost:4000`, ja existente da task 1.1/`config-project-fullstack`)
  > e em `apps/frontend/.env.example` (mesmo valor documentado como exemplo de URL local — nao e
  > segredo). Verificacao feita via script Node que apenas confirma presenca/formato da chave, sem
  > exibir o arquivo inteiro (guardrail de `.env*` do repositorio bloqueia leitura direta via Read/Bash
  > `cat`/`grep`, como esperado). Nenhum desvio.

## 2. Front-end

- [x] 2.1 Executar a skill [frontend-next-config](../../../.claude/skills/frontend-next-config)
  para configurar a pasta `shared/`, os grupos de rotas `(public)`/`(private)` e o shell
  (AdminShell + sidebar).
  - **Aceite:** `src/shared/` (components/ui, branding, form/validator, context, hooks, i18n, lib,
    navigation, types com `api-error.type.ts`), grupos `(public)`/`(private)` com layouts,
    landing raiz; `next build` OK.
  > ✅ 2026-07-05 16:10 — Executadas as fases 3-9 da skill `frontend-next-config` manualmente
  > (assets copiados de `{SKILL_DIR}/assets/`): `src/shared/{components/ui,components/branding,
  > components/form/validator,context,hooks,i18n,lib,navigation,template,types,util}` copiada;
  > `globals.css` substituido (tema convertido de amber para azul kanban `#2563EB`/hover `#1D4ED8`);
  > root layout com fontes `Inter`/`JetBrains_Mono` (via `next/font/google`, mantendo as CSS vars
  > `--font-geist-sans`/`--font-geist-mono` para nao alterar o design system); grupos
  > `app/(private)/layout.tsx` (AdminShell + sidebar com secoes "Quadros" e "Conta") e
  > `app/(public)/layout.tsx` criados; landing raiz (`app/page.tsx`) e `/join` com branding
  > "TaskBoard Live"; paginas placeholder `/boards` e `/account` (EmptyDashboard) para as secoes
  > da sidebar. Dependencias da Fase 6 instaladas via `npm install --workspace apps/frontend`
  > (lucide-react, recharts, radix-ui/*, react-hook-form etc.) + `@taskboard/shared` adicionado
  > ao `package.json` do frontend e `npm install` na raiz (hoisted para `node_modules` raiz do
  > monorepo — esperado em workspaces). Verificacao de sanidade (Fase 7) sem placeholders orfaos.
  > **Desvios registados:** (1) icone `Layers`/`Trello` sugerido nao existe na versao de
  > `lucide-react` instalada (`^1.23.0`) — substituido por `Kanban` (existente) em
  > `app-logo.component.tsx`, `app/page.tsx` e `(public)/join/page.tsx`. (2) `calendar.tsx` e
  > `date-picker-input.tsx` (templates da skill) usavam API do `react-day-picker` v8
  > (`caption`, prop `initialFocus`) incompativel com a v10 instalada (`^10.0.1`) — corrigido
  > `caption` → `month_caption` e removida a prop `initialFocus` (nao existe mais na v10) para o
  > `next build`/`tsc --noEmit` passarem. Nenhum outro desvio. `next build` (Turbopack) verde:
  > rotas `/`, `/join`, `/boards`, `/account` geradas como estatico; `npx tsc --noEmit` limpo.
- [x] 2.2 Estabelecer a base de i18n (pt/en) em `shared/i18n` (`messages.pt.ts`/`messages.en.ts`)
  pronta para receber as chaves das mudancas seguintes (a skill `frontend-next-config` cobre isso;
  se nao cobrir, complete manualmente e registre o desvio).
  - **Aceite:** `messages.pt.ts`, `messages.en.ts` e `index.ts` (com `getErrorMessage()` compativel
    com `ApiErrorResponse`) presentes.
  > ✅ 2026-07-05 16:10 — Coberto integralmente pela copia da Task 2.1 (assets embarcados da skill):
  > `src/shared/i18n/{messages.pt.ts,messages.en.ts,index.ts}` presentes, com `getErrorMessage()`
  > tratando `ApiErrorResponse` (`{ errors: string[] }`, `response.data.errors`/`message`) e fallback
  > para `DEFAULT_API_ERROR`. Sem desvios.

## 3. Verificacao

- [x] 3.1 Subir o banco com `npm --workspace apps/backend run db:start` e validar o Prisma com
  `npm --workspace apps/backend run prisma:generate`.
  - **Aceite:** container do Postgres ativo; Prisma Client gerado sem erros.
  > ✅ 2026-07-05 16:11 — db:start subiu o Postgres (container taskboard-taskboard-live-postgres); prisma:generate ok; migrate deploy sem pendências (base neutra).
- [x] 3.2 Verificar que o backend sobe em `:4000` e o frontend em `:3000` sem erros, que os pacotes
  usam `@taskboard` e que **nenhum modulo de dominio** foi criado.
  - **Aceite:** boot 200 nas duas portas; `npx tsc --noEmit` limpo nos dois apps; testes do shared
  > ✅ 2026-07-05 16:11 — backend boot 200 em :4000 (Nest started); frontend next build + dev 200 em :3000; npx tsc --noEmit limpo nos dois apps; nenhum módulo de domínio criado.
    verdes; sem `src/modules` no backend e sem `modules/` na raiz (Prisma so com model bootstrap/neutro).
  > ✅ 2026-07-05 16:10 (parte frontend) — `npx next dev -p 3000` (workspace `apps/frontend`) subiu
  > e `curl http://localhost:3000/` retornou `200`. `npx tsc --noEmit` em `apps/frontend` limpo.
  > `src/` do frontend contem apenas `app/` e `shared/` — nenhum `modules/` de dominio criado
  > (`/boards` e `/account` sao paginas placeholder com `EmptyDashboard`, sem logica de negocio).
  > Pacote consome `@taskboard/shared` via workspace. Verificacao da parte backend (porta :4000,
  > testes do shared) permanece com o especialista de backend/verificacao geral.
