<!-- TEMPLATE — delta da capability cadastro-colaboradores (parte CONVITES/A6) + MODIFIED de
registro-usuario. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Convites com auto-cadastro

O sistema SHALL prover convites por token (organizacao e, opcionalmente, papel/estrutura
pre-definidos) com expiracao, uso unico e revogacao, permitindo auto-cadastro publico que gera
colaborador `pending`.

#### Scenario: Ciclo do convite

- **WHEN** o admin cria um convite
- **THEN** um token aleatorio seguro e unico e gerado, com `expiresAt` e `status = pending`
- **AND** o admin pode listar e revogar convites da sua organizacao

#### Scenario: Aceite valido

- **WHEN** um visitante aceita um convite valido em `/convite/[token]`
- **THEN** o usuario e criado via `register-user` com a organizacao/papel/estrutura do convite e `status = pending`
- **AND** o convite transita para `accepted` (uso unico)

#### Scenario: Tokens invalidos

- **WHEN** o token e inexistente, expirado ou ja usado/revogado
- **THEN** o aceite falha com `invitation.not_found` / `invitation.expired` / `invitation.already_used`

### Requirement: Persistencia e endpoints de convites

O backend SHALL persistir `invitation` com `token @unique` e expor rotas admin (criar/listar/
revogar, autorizadas) e publicas (`GET /invitations/:token`, `POST /invitations/:token/accept`).

#### Scenario: Rotas admin e publicas

- **WHEN** as rotas de convite sao exercitadas
- **THEN** criar/listar/revogar exigem `@Roles('admin_org','super_admin')` e escopo da organizacao
- **AND** validar/aceitar sao publicas via `public.decorator`

### Requirement: Tela publica de aceite e gestao de convites

O frontend SHALL prover a pagina publica A6 (validacao do token antes do formulario, estados de erro
amigaveis) e a gestao de convites do admin (link exibido para compartilhar), sob gating.

#### Scenario: A6 e gestao operaveis

- **WHEN** o admin gera um convite e o visitante abre `/convite/[token]`
- **THEN** o link e exibido ao admin para compartilhar; a pagina valida o token e concluí o auto-cadastro
- **AND** o colaborador criado aparece como `pending` na fila de aprovacao

## MODIFIED Requirements

### Requirement: register-user reaproveitado pelo convite

O `register-user` (capability `registro-usuario`, `004`) SHALL aceitar a organizacao (e
papel/estrutura opcionais) vindas do convite — nao apenas a organizacao default — e o
`status = pending` resultante SHALL fluir pelo ciclo convite → aprovacao.

#### Scenario: Registro via convite

- **WHEN** `accept-invitation` invoca `register-user`
- **THEN** o usuario nasce na organizacao do convite, com papel/estrutura pre-definidos quando presentes
- **AND** com `status = pending`, sujeito ao gate de login e a aprovacao
