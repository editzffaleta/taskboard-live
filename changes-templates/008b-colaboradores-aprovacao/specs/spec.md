<!-- TEMPLATE — delta da capability cadastro-colaboradores (parte APROVACAO/D29). Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Aprovacao e rejeicao de colaboradores

O sistema SHALL prover `approve-user` (`pending → active`) e `reject-user` (`pending → inactive`)
com transicao validada, e endpoints autorizados para executa-los e listar pendentes.

#### Scenario: Aprovacao valida

- **WHEN** o admin aprova um colaborador `pending`
- **THEN** o status transita para `active` e o colaborador passa a conseguir logar

#### Scenario: Rejeicao valida

- **WHEN** o admin rejeita um colaborador `pending`
- **THEN** o status transita para `inactive` e o login segue barrado (gate da sessao)

#### Scenario: Transicao invalida

- **WHEN** aprovar/rejeitar e chamado sobre usuario fora de `pending`
- **THEN** a operacao falha com `DomainError('user.invalid_status_transition', 409)`

#### Scenario: Endpoints autorizados e escopados

- **WHEN** `POST /users/:id/approve|reject` e a listagem de pendentes sao exercitados
- **THEN** exigem `@Roles('admin_org','super_admin')` e operam apenas na organizacao do admin
- **AND** papel nao autorizado recebe 403

### Requirement: Fila de aprovacao (D29)

O frontend SHALL prover a fila de colaboradores pendentes com acoes de aprovar/rejeitar, sob gating,
tratando conflito de transicao.

#### Scenario: Fila operavel

- **WHEN** o admin acessa a D29
- **THEN** ve os `pending` da sua organizacao e pode aprovar/rejeitar item a item
- **AND** um 409 (transicao ja feita) e tratado com aviso e recarga da fila
