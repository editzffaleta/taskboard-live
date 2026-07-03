<!-- TEMPLATE — delta da capability seeds-desenvolvimento. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Seed demo idempotente

O backend SHALL prover um seed de desenvolvimento idempotente que cria organizacao demo e um
usuario ativo por papel com senha conhecida de dev, hasheada pelo provider do produto.

#### Scenario: Ambiente navegavel em um comando

- **WHEN** `db:seed:demo` roda num banco migrado de desenvolvimento
- **THEN** existem a organizacao demo e os usuarios colaborador/lider/admin_org ativos
- **AND** o login funciona com as credenciais demo documentadas

#### Scenario: Idempotencia

- **WHEN** o seed roda duas vezes
- **THEN** nenhum registro e duplicado (upsert por chave natural)

### Requirement: Guard de producao

O seed SHALL abortar em producao a menos que `SEED_DEMO=true` esteja explicitamente definida.

#### Scenario: Producao protegida

- **WHEN** o seed roda com `NODE_ENV=production` sem `SEED_DEMO=true`
- **THEN** aborta sem escrever nada, com mensagem clara

### Requirement: Blocos condicionais por presenca

O seed SHALL semear estrutura organizacional, grupo de permissao demo e usuario pendente apenas
quando as changes correspondentes (`007`, `006a`, `008a`) estiverem aplicadas.

#### Scenario: Deteccao por presenca

- **WHEN** o seed roda num projeto sem alguma das changes condicionais
- **THEN** os blocos correspondentes sao pulados sem erro

### Requirement: Build e testes

O projeto SHALL permanecer sem erros de TypeScript/build, com idempotencia e guard testados.

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes sao executados
- **THEN** nao ha erros e os testes passam
