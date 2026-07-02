<!--
TEMPLATE DE CHANGE — 007-estrutura-organizacional (dados de referencia org-scoped).
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigos de tela (D4/D5/D6) referem-se aos seus mockups; ajuste-os ao seu projeto.
Se o seu dominio nao precisar de setor/cargo/unidade, adapte os tres agregados a sua estrutura.
-->

## Why

O cadastro de colaboradores (`008`) precisa posicionar cada pessoa na estrutura da empresa: a que
**setor** pertence, qual **cargo** ocupa e em qual **unidade/filial** trabalha (telas D4, D5, D6).
Essas tres entidades sao dados de referencia org-scoped, geridos pelo Admin da Organizacao, e
precisam existir antes do wizard de colaborador. Sao distintas do `role` (RBAC) e dos grupos de
permissao (`006`): setor/cargo/unidade sao metadados organizacionais, nao autorizacao.

## What Changes

- Criar o modulo `org-structure` com tres agregados org-scoped: `sector` (setor), `position`
  (cargo) e `unit` (unidade/filial).
- Implementar as entidades com validacoes: cada uma com `organizationId`, `name` (unico por
  organizacao), `description?` e `active`; `unit` tambem com `code?`.
- Definir os contratos de repositorio (`findById`, `findByOrganization` paginado, `findByName` para
  unicidade por organizacao) e implementar os repositorios Prisma, escopados por `organizationId` (`003`).
- Implementar os casos de uso `save-*` (criacao/atualizacao via `findById`) e `delete-*`
  (`DomainError('<agregado>.not_found', 404)`) para os tres agregados, com testes unitarios.
- Sincronizar os models `sector`, `position` e `unit` no Prisma (nome unico por organizacao).
- Expor o CRUD autenticado e **autorizado por papel** (`@Roles('admin_org','super_admin')`,
  conforme `006`) em `/sectors`, `/positions` e `/units`.
- No frontend, entregar as telas D4/D5/D6: listagens paginadas, formularios compartilhados
  criacao/edicao e exclusao com confirmacao, com itens de menu na area administrativa sob gating por papel (`006`).
- Mapear no i18n (pt/en) os erros e rotulos novos.

## Capabilities

### New Capabilities
- `estrutura-organizacional`: CRUD de estrutura organizacional no modulo `org-structure` — agregados
  `sector`, `position` e `unit` (org-scoped, validados), persistencia Prisma com nome unico por
  organizacao, casos de uso `save`/`delete` com testes, CRUD autorizado por papel em `/sectors`,
  `/positions`, `/units`, e telas D4/D5/D6 no frontend.

### Modified Capabilities
<!-- Nenhuma capability existente tem requisitos alterados. -->

## Impact

- **Dominio (`modules/org-structure`)**: agregados `sector`, `position`, `unit`; entidades, contratos
  e casos de uso `save`/`delete` + testes unitarios.
- **Backend**: models Prisma `sector`/`position`/`unit` (nome unico por `organizationId`) +
  repositorios; controllers de CRUD em `/sectors`, `/positions`, `/units` protegidos por
  `@Roles('admin_org','super_admin')`; testes de integracao HTTP.
- **Frontend**: telas D4/D5/D6 no modulo `org-structure` (listagem paginada, formulario via
  `form-section-layout`, exclusao via `delete-confirmation-dialog`), itens de menu com gating por
  papel; chaves i18n novas.
- **Dependencias**: escopo por `organizationId` (`003`), autorizacao por papel (`006`), design system (`002`).
- **Habilita**: o wizard de cadastro de colaborador da `008` consome setor/cargo/unidade como referencias selecionaveis.
