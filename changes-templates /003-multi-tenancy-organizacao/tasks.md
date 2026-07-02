<!-- TEMPLATE — tasks da multi-tenancy. Checkboxes vazios; marque com evidencia ao concluir.
Cada task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `001` (base). **Nao faca:** criar usuarios/papeis/auth; emitir claim
> `organizationId` no JWT ou `current-organization` (e a `005`); bootstrap do Super Admin (e a `006`);
> casos de uso de gestao de organizacao ou UI (e a `025`).

## 1. Negocio (modulo tenancy)

- [ ] 1.1 Criar o modulo `tenancy` com a skill [config-new-module](../../../.claude/skills/config-new-module) usando `@{{namespace}}`.
  - **Aceite:** `modules/tenancy`, `apps/backend/src/modules/tenancy` (module+controller registrados no AppModule) e scaffold frontend criados; `build` e teste do workspace verdes.
- [ ] 1.2 Criar o agregado `organization` no modulo `tenancy` com a skill [module-aggregate](../../../.claude/skills/module-aggregate) (mode `crud`).
  - **Aceite:** `model/`, `provider/organization.repository.ts`, usecases CRUD base e barrels; `src/index.ts` preserva exports.
- [ ] 1.3 Implementar a entidade `Organization` com a skill [module-entity](../../../.claude/skills/module-entity): `name` (required, min 2, max 120), `slug` (required, unico, kebab-case minusculo), `status` (required, in `active|inactive|suspended`, default `active`).
  - **Aceite:** entidade com validacao lazy via `Validator.validate`, regras compartilhadas, default `active` no construtor; teste cobrindo valida/getters/lazy/default/limites/slug invalido/status invalido/clone/timestamps com **100% de cobertura**.
- [ ] 1.4 Definir o contrato do repositorio com a skill [module-repository](../../../.claude/skills/module-repository), incluindo `findById` e `findBySlug`.
  - **Aceite:** `OrganizationRepository` com `findBySlug(slug): Promise<Organization | null>`; fake in-memory em `test/mock/`; suite do modulo verde.
- [ ] 1.5 **Nao** implementar casos de uso de criacao/edicao/exclusao de organizacao (escopo da `025`). Registrar a decisao na evidencia.
  - **Aceite:** apenas os esqueletos genericos do scaffold permanecem (sem regra de negocio, nao expostos por controller); decisao registrada.

## 2. Back-end (persistencia + escopo de tenant)

- [ ] 2.1 Sincronizar o model `organization` (com `slug` unico) com a skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Aceite:** `prisma/models/tenancy.model.prisma` com `Organization` (uuid PK, `name`, `slug @unique`, `status` default `active`, timestamps) mapeado para `organizations`; model bootstrap removido; migration aplicada (CREATE TABLE + UNIQUE em `slug`, sem operacao destrutiva); `prisma:generate` ok.
- [ ] 2.2 Implementar o repositorio Prisma de `organization` em `apps/backend/src/modules/tenancy` com a skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository), sem alterar a interface do modulo.
  - **Aceite:** `PrismaOrganizationRepository implements OrganizationRepository` (create/update/delete/findById/findBySlug/findPage), `toDomain`/`toPersistence`; `TenancyModule` importa `DbModule` e registra/exporta a classe; `tsc --noEmit` ok.
- [ ] 2.3 Estabelecer a **convencao de escopo por tenant** em `apps/backend/src/shared` (tipos/helper de `organizationId`), documentada, **sem acoplar autenticacao**.
  - **Aceite:** `shared/tenancy/` com tipos (`TenantScoped`, `WithTenantScope`, `TenantScopedPageParams`) + helper (`withTenantScope`, `assertTenantScope`, `belongsToTenant`), exportados no barrel; doc-comments deixam claro que claim/decorator ficam para a `005`.
- [ ] 2.4 Adicionar o seed da **organizacao default** em `prisma/seed/tasks` (idempotente), registrado no `main.ts` sem sobrescrever o seed neutro. **Nao** semear Super Admin.
  - **Aceite:** `tenancy.seed.ts` com upsert por `slug` `default`; rodar 2x mantem 1 linha em `organizations`; nenhum usuario semeado.

## 3. Front-end

- [ ] 3.1 Manter o scaffold de frontend do `tenancy` apenas como placeholder (UI de gestao e a `025`). Garantir `npx tsc --noEmit` em `apps/frontend` sem erros.
  - **Aceite:** scaffold intacto; `tsc --noEmit` exit 0; build Next.js ok.

## 4. Verificacao

- [ ] 4.1 Rodar `prisma:generate` + migration e validar o model `organization` com `slug` unico.
  - **Aceite:** migration aplicada; UNIQUE index em `slug` confirmado.
- [ ] 4.2 Rodar o seed e confirmar idempotencia da organizacao default.
  - **Aceite:** duas execucoes → mesmo id e 1 linha.
- [ ] 4.3 Rodar `npx tsc --noEmit` no backend; registrar na evidencia os adiamentos (claim no JWT + `current-organization` na `005`; Super Admin na `006`; gestao na `025`).
  - **Aceite:** `tsc` limpo (repo Prisma + escopo compilam); testes verdes; adiamentos registrados.
