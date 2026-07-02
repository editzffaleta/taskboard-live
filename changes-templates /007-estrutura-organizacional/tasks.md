<!-- TEMPLATE — tasks da estrutura organizacional. Checkboxes vazios; marque com evidencia.
Cada task tem **Aceite**. Os tres agregados sao simetricos — trate-os em paralelo. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `003` (escopo), `006` (autorizacao por papel). **Nao faca:** vincular
> colaboradores a setor/cargo/unidade (e a `008`); hierarquia entre setores/unidades; relatorios por estrutura (`021`).

## 1. Negocio (modulo org-structure)

- [ ] 1.1 Criar o modulo `org-structure` com a skill [config-new-module](../../../.claude/skills/config-new-module) (`@{{namespace}}`).
  - **Aceite:** modulo + scaffold registrados; `OrgStructureModule` no `AppModule` (conferir/registrar).
- [ ] 1.2 Criar os agregados `sector`, `position` e `unit` com a skill [module-aggregate](../../../.claude/skills/module-aggregate) (mode `crud`).
  - **Aceite:** os tres agregados com model/provider/usecases base + barrels.
- [ ] 1.3 Implementar as entidades com a skill [module-entity](../../../.claude/skills/module-entity): cada uma com `organizationId` (required), `name` (required, min 2, max 80, unico por org), `description` (opcional, max 300), `active` (boolean, default `true`); `unit` tambem com `code` (opcional, max 30).
  - **Aceite:** entidades simetricas com validacao lazy; `unit` com `code`; testes com cobertura alta.
- [ ] 1.4 Definir os contratos de repositorio dos tres com a skill [module-repository](../../../.claude/skills/module-repository): `findById`, `findByOrganization` (paginado) e `findByName` (unicidade por organizacao).
  - **Aceite:** contratos com os metodos; fakes in-memory em `test/mock/`.
- [ ] 1.5 Implementar, para cada agregado, `save-<agregado>` (criar/atualizar via `findById`; validar unicidade de `name` por organizacao) e `delete-<agregado>` (`DomainError('<agregado>.not_found', 404)`) com a skill [module-use-case](../../../.claude/skills/module-use-case).
  - **Aceite:** unicidade de nome por org; delete de inexistente → 404; nos tres agregados.
- [ ] 1.6 Cobrir os casos de uso com testes (fakes), incluindo item nao encontrado e nome duplicado na mesma organizacao.
  - **Aceite:** cenarios cobertos nos tres; suite do modulo verde.

## 2. Back-end

- [ ] 2.1 Sincronizar o `org-structure` com o Prisma criando `sector`, `position` e `unit` (nome unico por `organizationId`; `unit` com `code`) com a skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Aceite:** tres models com unique (`organizationId`,`name`); migration aplicada; `prisma:generate` ok.
- [ ] 2.2 Implementar os repositorios Prisma dos tres em `apps/backend/src/modules/org-structure` com a skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository), escopados por `organizationId` (`003`), sem alterar as interfaces.
  - **Aceite:** repositorios implementam os contratos; `tsc --noEmit` ok.
- [ ] 2.3 Criar os controllers com a skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller): CRUD em `/sectors`, `/positions`, `/units` (criar/atualizar/excluir/obter/listar paginado), escopados por organizacao e sob `@Roles('admin_org','super_admin')` (`006`). Consultas chamam o repositorio direto; comandos instanciam o caso de uso no corpo do metodo.
  - **Aceite:** os tres CRUDs autorizados e escopados; negacao por papel → 403.
- [ ] 2.4 Criar `org-structure.integration.http` cobrindo o CRUD dos tres, os erros (nome duplicado, item inexistente em update/delete) e o acesso negado por papel (403). Validar manualmente.
  - **Aceite:** cenarios cobertos; validacao manual com o backend rodando.

## 3. Front-end (telas D4/D5/D6)

- [ ] 3.1 Criar as listagens paginadas em rotas privadas com gating por papel (`006`): **D4 Setores**, **D5 Cargos**, **D6 Unidades** (tabela com nome, status `active` e acoes).
  - **Aceite:** tres listagens paginadas com gating por papel.
- [ ] 3.2 Criar os formularios compartilhados criacao/edicao via `form-section-layout`: `name`, `description`, `active` (e `code` para Unidades).
  - **Aceite:** formulario reaproveitado pelos tres; `code` so em Unidades.
- [ ] 3.3 Integrar as acoes: editar navega para o formulario; excluir abre `delete-confirmation-dialog`, chama o backend e atualiza a tabela.
  - **Aceite:** editar/excluir funcionando com atualizacao da tabela.
- [ ] 3.4 Adicionar "Setores", "Cargos" e "Unidades" na secao administrativa do menu, com gating por papel.
  - **Aceite:** itens visiveis apenas para os papeis administrativos.
- [ ] 3.5 Acrescentar no i18n (pt/en) as chaves novas (erros `sector.not_found`/`position.not_found`/`unit.not_found`, rotulos e validacoes), reaproveitando chaves existentes.
  - **Aceite:** chaves presentes em pt e en.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes do modulo e validar manualmente o CRUD das tres entidades e o gating (um colaborador nao ve os itens nem acessa os endpoints).
  - **Aceite:** `tsc` limpo; testes verdes; CRUD e gating validados.
