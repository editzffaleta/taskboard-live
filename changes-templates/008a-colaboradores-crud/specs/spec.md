<!-- TEMPLATE — delta da capability cadastro-colaboradores (parte CRUD/D2/D3) + MODIFIED de
registro-usuario. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Colaborador vinculado a papel e estrutura

O sistema SHALL permitir cadastrar/editar colaboradores com papel e vinculo opcional a
setor/cargo/unidade da mesma organizacao, rejeitando itens de outra organizacao ou desativados, e
SHALL preservar o hash de senha em edicoes sem `password`.

#### Scenario: Cadastro com estrutura valida

- **WHEN** o admin salva um colaborador com `sectorId`/`positionId`/`unitId` da sua organizacao (itens `active`)
- **THEN** o colaborador e criado/atualizado com os vinculos
- **AND** a organizacao do colaborador vem do contexto do admin (`super_admin` pode indicar outra)

#### Scenario: Estrutura invalida rejeitada

- **WHEN** o vinculo referencia item de outra organizacao ou desativado
- **THEN** a operacao e rejeitada com `DomainError`
- **AND** vinculos pre-existentes a itens desativados sao preservados em edicoes que nao os alteram

#### Scenario: Edicao sem senha preserva o hash

- **WHEN** um colaborador e editado sem o campo `password`
- **THEN** o hash existente e preservado e o login continua funcionando

### Requirement: Endpoints e leitura mapeada de colaboradores

O backend SHALL expor `/users` (CRUD com estrutura/papel) sob `@Roles('admin_org','super_admin')`,
escopado por organizacao, e SHALL mapear consultas para objeto simples (papel, status, estrutura),
sem expor entidade crua nem `password`.

#### Scenario: CRUD autorizado e escopado

- **WHEN** um admin da organizacao exercita `/users`
- **THEN** cria/edita/exclui/lista colaboradores apenas da sua organizacao
- **AND** um usuario sem papel administrativo recebe 403

#### Scenario: Leitura sem vazamento

- **WHEN** a listagem/detalhe de colaboradores e consultada
- **THEN** a resposta traz objeto simples com papel, status e estrutura
- **AND** nunca inclui `password`/hash

### Requirement: Telas de colaboradores (D2/D3)

O frontend SHALL prover a listagem paginada com filtros e badges de status (D2) e o wizard de
cadastro em 6 passos (D3), cujo passo de acesso reutiliza a atribuicao de grupos do RBAC.

#### Scenario: Listagem D2

- **WHEN** um admin acessa a listagem de colaboradores
- **THEN** ve tabela paginada com filtros e badges de status, sob gating por papel

#### Scenario: Wizard D3 cria colaborador ativo

- **WHEN** o admin conclui o wizard de 6 passos (dados, estrutura, acesso)
- **THEN** o colaborador e criado com `status = active`, estrutura vinculada
- **AND** o passo "Acesso" define o `role` e reusa `assign-groups-to-user` (RBAC), sem duplicar logica

### Requirement: Build, testes e i18n do CRUD

O projeto SHALL permanecer sem erros de TypeScript/testes e as chaves i18n novas SHALL existir em pt/en.

#### Scenario: Verificacao do CRUD

- **WHEN** typecheck e testes rodam em `apps/backend` e `apps/frontend`
- **THEN** nao ha erros e as chaves i18n (wizard, estrutura, status) existem em pt e en

## MODIFIED Requirements

### Requirement: Entidade user com vinculo opcional a estrutura

A entidade `user` (capability `registro-usuario`, `004`) SHALL aceitar `sectorId?`, `positionId?` e
`unitId?` como FKs opcionais para a estrutura organizacional da mesma organizacao.

#### Scenario: Campos opcionais de estrutura

- **WHEN** um `user` e criado/validado com os novos campos ausentes
- **THEN** a entidade permanece valida (campos opcionais)
- **AND** quando presentes, cada FK referencia item da mesma organizacao
