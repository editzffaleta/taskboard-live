# base-projeto Specification

## Purpose
TBD - created by archiving change 001-base-do-projeto. Update Purpose after archive.
## Requirements
### Requirement: Monorepo Turbo funcional

O sistema SHALL prover um monorepo Turbo com `apps/backend` (NestJS, porta 4000) e `apps/frontend`
(Next.js, porta 3000) sob o namespace npm `@taskboard`.

#### Scenario: Aplicacoes inicializam nas portas configuradas

- **WHEN** o monorepo e inicializado
- **THEN** o backend NestJS sobe na porta 4000 e o frontend Next.js sobe na porta 3000 sem erros
- **AND** os pacotes do workspace usam o namespace `@taskboard`

### Requirement: Infraestrutura Prisma configurada

O sistema SHALL prover a infraestrutura do Prisma no backend com schema modular por dominio,
pronta para receber models de modulos.

#### Scenario: Infraestrutura de persistencia disponivel

- **WHEN** a infraestrutura do Prisma e configurada
- **THEN** existem `DbModule`, `PrismaService`, seed tecnico neutro e docker compose
- **AND** o schema e modular por dominio e esta pronto para receber models de modulos
- **AND** nenhum model de dominio e definido nesta mudanca

### Requirement: Pacote compartilhado disponivel

O sistema SHALL prover um pacote compartilhado disponivel para backend, frontend e modulos de
negocio, restrito a contratos e utilitarios base.

#### Scenario: Pacote compartilhado consumivel

- **WHEN** o pacote compartilhado e criado
- **THEN** ele esta disponivel para ser importado por backend, frontend e modulos sob `@taskboard`
- **AND** nao contem logica de dominio

### Requirement: Backend com tratamento de erros e autenticacao JWT

O backend SHALL prover tratamento de erros centralizado e a base de autenticacao JWT, prontos para
serem consumidos por modulos futuros.

#### Scenario: Base de backend pronta para modulos

- **WHEN** a base do backend e configurada
- **THEN** o tratamento de erros e centralizado (filtro global de erros)
- **AND** a base de autenticacao JWT (guard global, estrategia e decorators) esta disponivel para
  consumo por modulos futuros

### Requirement: Baseline de variaveis de ambiente

O sistema SHALL declarar a baseline de variaveis de ambiente exigida pelas mudancas seguintes, em
`.env` e `.env.example`.

#### Scenario: Variaveis de ambiente disponiveis

- **WHEN** a base do projeto e configurada
- **THEN** o backend declara `DATABASE_URL` e `JWT_SECRET`
- **AND** o frontend declara `NEXT_PUBLIC_API_URL`
- **AND** os valores estao presentes tanto em `.env` quanto em `.env.example`

### Requirement: Frontend com estrutura compartilhada, rotas, shell e i18n

O frontend SHALL prover a pasta `shared/`, os grupos de rotas Next.js `(public)` e `(private)`, o
shell de navegacao com sidebar e a base de i18n (pt/en).

#### Scenario: Estrutura e rotas do frontend inicializam

- **WHEN** o frontend e configurado
- **THEN** existe a pasta `shared/` e os grupos de rotas `(public)` e `(private)` estao configurados
- **AND** o shell de navegacao (AdminShell + sidebar) e funcional e a aplicacao inicializa sem erros
- **AND** a base de i18n disponibiliza `messages.pt.ts` e `messages.en.ts` prontos para receber chaves

### Requirement: Escopo restrito a base tecnica

Esta mudanca SHALL entregar apenas a base tecnica compartilhada e MUST NOT criar nenhum modulo de
dominio, design system completo ou conceito de tenant.

#### Scenario: Nenhum modulo de dominio e criado

- **WHEN** a base do projeto e entregue
- **THEN** nenhum modulo de dominio do produto (ex.: `auth`) e criado nesta mudanca
- **AND** o design system completo (escopo da `002`) e o multi-tenancy (escopo da `003`) nao sao
  introduzidos aqui

