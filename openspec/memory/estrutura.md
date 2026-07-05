# Estrutura do Projeto

Mapa de onde cada coisa vive no monorepo. Atualize conforme o projeto cresce.

## Monorepo

- `apps/backend` — API NestJS (porta 4000).
- `apps/frontend` — Next.js (porta 3000).
- `apps/e2e` — testes Playwright (quando houver).
- `modules/<contexto>` — domínio por bounded context (clean arch + DDD).
- `packages/shared` — validação, erros e tipos compartilhados.
- `packages/*` — demais pacotes compartilhados.

## Domínio (dentro de cada `modules/<contexto>`)

- `src/<aggregate>/model/*.entity.ts`, `*.vo.ts`
- `src/<aggregate>/*.repository.ts` (contrato)
- `src/<aggregate>/*.use-case.ts`
- `test/...` (espelha `src/`)

## Backend (`apps/backend`)

- `src/modules/<modulo>/<modulo>.module.ts`
- `src/modules/<modulo>/*.controller.ts`
- `src/modules/<modulo>/*.repository.ts` (Prisma)
- `src/modules/<modulo>/*.integration.http`

## Frontend (`apps/frontend`)

- `src/app/(public)` e `src/app/(private)`
- `src/shared/components/ui/...`
- `src/modules/<modulo>/...`

## OpenSpec

- `openspec/memory/` — produto, contexto técnico, estrutura (este arquivo) e a constituição (princípios inegociáveis).
- `openspec/shared/` — como-executar, regras-de-nomenclatura.
- `openspec/templates/` — modelo-base, modelo-crud.
- `openspec/changes/NNN-...` — mudanças.
- `openspec/EXECUTION-LOG.md` — histórico de execução.
