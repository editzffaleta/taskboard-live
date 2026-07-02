# Contexto Técnico Global

Stack, arquitetura, convenções e decisões que valem para **todas** as mudanças. As specs referenciam este arquivo em vez de repetir. Ajuste por projeto.

## Stack

- Monorepo Turborepo (npm), TypeScript.
- Backend: NestJS (porta 4000) + Prisma + PostgreSQL.
- Frontend: Next.js (porta 3000, App Router).
- Domínio: pacotes em `modules/` (clean architecture + DDD).
- Compartilhado: `packages/shared` (validação, erros, tipos).
- Testes: unitários (Jest), Rest Client (`*.integration.http`) e E2E (Playwright em `apps/e2e`, quando houver).

## Arquitetura

- DDD tático por bounded context em `modules/<contexto>`: aggregate, entity, value-object, repository (contrato), use-case.
- O backend NestJS injeta as implementações concretas (providers) e expõe os controllers.
- Erros de domínio padronizados (`DomainError` / `ApiErrorResponse`).

## Convenções

- Nomenclatura de arquivos: ver `../shared/regras-de-nomenclatura.md`.
- Execução de specs e evidência: ver `../shared/como-executar.md`.
- Sem DTOs de entrada. Respostas de leitura são mapeadas para objeto simples no controller antes de retornar (entidades usam `protected readonly props`, que não serializam via `JSON.stringify`).
- Casos de uso de comando retornam `void`; consultas chamam o repositório direto.

## Decisões fixas

- <decisão técnica>: <razão>

## Restrições / ambiente

- <variáveis de ambiente, serviços externos, integrações, limites>
