<!--
TEMPLATE DE CHANGE — 003-multi-tenancy-organizacao (fundacao multi-tenant).
Substitua os placeholders e remova este comentario antes de usar.
Placeholders:
  {{produto}}    — nome do produto (ex.: AlphaBet)
  {{namespace}}  — scope npm SEM @ (ex.: alphabet) → @{{namespace}}
Premissa: o produto e multi-tenant (dados pertencem a uma organizacao). Se NAO for, remova/adapte esta mudanca.
-->

## Why

O {{produto}} e multi-tenant: usuarios e demais dados pertencem sempre a uma **organizacao**.
Antes de criar o primeiro modulo de dominio (`auth`/usuario, na `004`), o sistema precisa do
conceito de organizacao como tenant e de uma convencao clara de **escopo por organizacao** na
persistencia — caso contrario, cada modulo seguinte inventaria seu proprio jeito de isolar dados,
criando inconsistencia e risco de vazamento entre organizacoes. Esta e a base de quase todo o
dominio: o model `user` da `004` ja nasce vinculado a uma organizacao.

## What Changes

- Criar o modulo de negocio `tenancy` com o agregado `organization`.
- Implementar a entidade `Organization` (`name`, `slug` unico, `status`) com validacoes de dominio.
  Campos de plano, cobranca, limites, SSO e branding ficam para a `025` (gestao pelo Super Admin).
- Definir o contrato do repositorio de `organization` (incluindo `findBySlug` para garantir unicidade).
- Sincronizar o model `organization` no Prisma (migration) e implementar o repositorio Prisma.
- Estabelecer a **convencao de escopo por tenant**: todo dado pertencente a uma organizacao e
  isolado por `organizationId`, com suporte compartilhado (tipos/helper) pronto para os modulos
  seguintes consumirem — o model `user` da `004` ja referencia `organizationId`.
- Criar o seed da **organizacao inicial (default)**, para o sistema ser utilizavel antes da gestao completa.
- Esta mudanca **nao** cria usuarios, papeis nem casos de uso de gestao de organizacao. Tres pontos
  sao deliberadamente adiados (ver Impact): a emissao do claim `organizationId` no JWT, o bootstrap
  do usuario Super Admin e a UI de gestao de organizacoes.

## Capabilities

### New Capabilities
- `multi-tenancy`: Fundacao multi-tenant do {{produto}} — modulo `tenancy` com agregado
  `organization` (entidade validada, contrato e repositorio Prisma), convencao de escopo por
  `organizationId` com suporte compartilhado para os modulos seguintes, e seed da organizacao inicial.

### Modified Capabilities
<!-- Nenhuma capability existente tem requisitos alterados. -->

## Impact

- **Dominio (`modules/tenancy`)**: agregado `organization`, entidade `Organization`, contrato de repositorio.
- **Backend**: model `organization` no Prisma + migration, repositorio Prisma em
  `apps/backend/src/modules/tenancy`, seed da organizacao inicial em `prisma/seed/tasks`.
- **Escopo de tenant (shared)**: convencao e suporte compartilhado (tipos/helper) para isolar dados
  por `organizationId`, consumivel pelos modulos a partir da `004`.
- **Frontend**: apenas o scaffold de modulo gerado por `config-new-module` (placeholder); a UI de
  gestao de organizacoes e escopo da `025`.
- **Dependencias futuras (adiadas conscientemente)**:
  - A emissao do claim `organizationId` no JWT e o decorator `current-organization` sao feitos na
    **`005`** (login), onde o token e de fato emitido.
  - O bootstrap do usuario **Super Admin** (seed) e feito na **`006`**, quando usuario (`004`) e
    papeis (`006`) ja existem.
  - A gestao de organizacoes (CRUD, plano, cobranca, limites, SSO, branding, metricas, seletor de
    contexto) e a **`025`**.
