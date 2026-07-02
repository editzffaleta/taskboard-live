<!-- TEMPLATE — delta de capability da 007 (estrutura-organizacional). Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Agregados de estrutura organizacional

O sistema SHALL prover os agregados `sector`, `position` e `unit` no modulo `org-structure`,
org-scoped e validados.

#### Scenario: Entidades validas

- **WHEN** um `Sector`, `Position` ou `Unit` e criado
- **THEN** exige `organizationId` e `name` (2 a 80 caracteres), aceita `description` (ate 300) e `active` (default `true`)
- **AND** `Unit` aceita tambem `code` (ate 30)
- **AND** `name` e unico dentro da organizacao

#### Scenario: Exclusao de item inexistente

- **WHEN** se exclui um item inexistente de qualquer um dos tres agregados
- **THEN** lanca `DomainError('<agregado>.not_found', 404)`

### Requirement: Persistencia da estrutura organizacional

O sistema SHALL persistir `sector`, `position` e `unit` no Prisma, com nome unico por organizacao e repositorios.

#### Scenario: Models e repositorios disponiveis

- **WHEN** a sincronizacao do modulo `org-structure` e executada
- **THEN** existem os models `sector`, `position` e `unit` com unicidade de `name` por `organizationId`
- **AND** os repositorios Prisma implementam os contratos sem altera-los, escopados por organizacao

### Requirement: CRUD autorizado de estrutura organizacional

O backend SHALL expor o CRUD de `/sectors`, `/positions` e `/units`, escopado por organizacao e autorizado por papel.

#### Scenario: CRUD com dados validos

- **WHEN** um Admin da Organizacao cria, atualiza, exclui, obtem ou lista itens
- **THEN** as operacoes sao escopadas a sua organizacao e respondem corretamente

#### Scenario: Acesso negado por papel

- **WHEN** um usuario sem papel `admin_org`/`super_admin` acessa esses endpoints
- **THEN** a resposta e `403`

### Requirement: Telas de estrutura organizacional (D4/D5/D6)

O frontend SHALL prover as telas de listagem, formulario e exclusao de setores, cargos e unidades, sob gating por papel.

#### Scenario: Gestao pela area administrativa

- **WHEN** um Admin da Organizacao acessa Setores, Cargos ou Unidades
- **THEN** ve a listagem paginada, consegue criar/editar via formulario compartilhado e excluir com confirmacao
- **AND** os itens de menu correspondentes nao aparecem para quem nao tem o papel adequado

### Requirement: Build, testes e i18n

O projeto SHALL permanecer sem erros de TypeScript/build, com os casos de uso testados e as chaves de erro/rotulos no i18n (pt/en).

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes unitarios do modulo sao executados
- **THEN** nao ha erros e os testes passam
- **AND** os codigos de erro e rotulos novos tem chaves em `messages.pt.ts` e `messages.en.ts`
