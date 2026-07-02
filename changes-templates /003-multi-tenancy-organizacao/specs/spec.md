<!-- TEMPLATE — delta de capability da 003 (multi-tenancy). Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Agregado de organizacao (tenant)

O sistema SHALL prover o agregado `organization` no modulo `tenancy`, representando o tenant ao qual
os dados pertencem.

#### Scenario: Entidade de organizacao valida

- **WHEN** uma `Organization` e criada
- **THEN** ela exige `name` (2 a 120 caracteres) e `slug` unico no formato kebab-case minusculo
- **AND** `status` aceita apenas `active`, `inactive` ou `suspended`, com default `active`

#### Scenario: Slug unico por organizacao

- **WHEN** se tenta persistir uma organizacao com `slug` ja existente
- **THEN** a unicidade e garantida (via `findBySlug` no dominio e indice unico no Prisma)

### Requirement: Persistencia da organizacao

O sistema SHALL persistir organizacoes via Prisma, com o model `organization` e repositorio correspondente.

#### Scenario: Model e repositorio disponiveis

- **WHEN** a infraestrutura de persistencia do `tenancy` e configurada
- **THEN** existe o model `organization` no Prisma com `slug` unico
- **AND** o repositorio Prisma de `organization` implementa o contrato do modulo sem altera-lo

### Requirement: Convencao de escopo por organizacao

O sistema SHALL definir a convencao de escopo por `organizationId` para dados pertencentes a uma
organizacao, com suporte compartilhado consumivel pelos modulos seguintes.

#### Scenario: Dados de tenant isolados por organizationId

- **WHEN** um modulo a partir da `004` persiste ou consulta dados pertencentes a uma organizacao
- **THEN** a convencao determina que essas operacoes sejam escopadas por `organizationId`
- **AND** existe suporte compartilhado (tipos/helper) para aplicar esse escopo de forma consistente
- **AND** a convencao nao acopla a camada de autenticacao nesta mudanca

### Requirement: Organizacao inicial semeada

O sistema SHALL semear uma organizacao inicial (default), de forma idempotente, para tornar o sistema
operavel antes da gestao completa de organizacoes.

#### Scenario: Seed da organizacao default

- **WHEN** o seed e executado
- **THEN** a organizacao inicial (default) e criada
- **AND** executar o seed novamente nao duplica a organizacao
- **AND** nenhum usuario Super Admin e semeado nesta mudanca

### Requirement: Escopo restrito a fundacao multi-tenant

Esta mudanca SHALL entregar apenas a fundacao multi-tenant e MUST NOT criar usuarios, papeis,
autenticacao, casos de uso de gestao de organizacao ou UI de gestao.

#### Scenario: Limites da fundacao respeitados

- **WHEN** a fundacao multi-tenant e entregue
- **THEN** nenhum usuario, papel ou fluxo de autenticacao e criado
- **AND** nenhum caso de uso de criacao/edicao/exclusao de organizacao e implementado
- **AND** a emissao do claim `organizationId` no JWT, o bootstrap do Super Admin e a UI de gestao
  permanecem fora do escopo (mudancas `005`, `006` e `025`, respectivamente)
