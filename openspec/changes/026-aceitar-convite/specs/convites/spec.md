# convites Specification

## Purpose
Permitir convidar colaboradores para um quadro por e-mail via link/token, sem exigir que a
pessoa convidada já tenha conta no TaskBoard Live — complementando a gestão de membros da
`membros` (`010`), que só resolve e-mails de contas já existentes.

## ADDED Requirements

### Requirement: Criar convite por e-mail (link/token)

O sistema SHALL permitir que o owner de um quadro convide qualquer e-mail (com ou sem conta
existente) gerando um convite com token único, MUST NOT enviar e-mail transacional (o convite é
sempre um link copiável) e MUST NOT criar um convite duplicado para o mesmo e-mail+quadro
enquanto houver um `pending`.

#### Scenario: Owner convida um e-mail novo

- **WHEN** o owner do quadro envia `POST /boards/:boardId/invitations` com um e-mail que ainda
  não é `BoardMember` do quadro
- **THEN** um novo `Invitation` é criado com `status='pending'`, `role='member'` e um `token`
  único
- **AND** a resposta inclui o `token`/link para compartilhamento manual (não é enviado e-mail
  algum)

#### Scenario: Owner reconvida o mesmo e-mail com convite pendente

- **WHEN** o owner envia `POST /boards/:boardId/invitations` para um e-mail que já tem um
  `Invitation` `pending` para aquele quadro
- **THEN** o sistema retorna o convite/`token` já existente
- **AND** nenhum `Invitation` duplicado é criado

#### Scenario: Owner tenta convidar e-mail que já é membro

- **WHEN** o owner envia `POST /boards/:boardId/invitations` para um e-mail cujo `User` já é
  `BoardMember` do quadro
- **THEN** o sistema retorna erro de domínio `invitation.already.member` (409)
- **AND** nenhum `Invitation` é criado

#### Scenario: Não-owner tenta criar convite

- **WHEN** um usuário que não é owner do quadro envia `POST /boards/:boardId/invitations`
- **THEN** o sistema retorna erro de domínio `board.owner.required` (403)
- **AND** nenhum `Invitation` é criado

### Requirement: Consulta pública da prévia do convite

O sistema SHALL expor `GET /invitations/:token` sem exigir autenticação, retornando apenas os
dados mínimos para a página pública de aceite, MUST NOT expor o `boardId`, a lista de membros ou
qualquer outro dado sensível do quadro.

#### Scenario: Consulta de token válido

- **WHEN** qualquer visitante (autenticado ou não) faz `GET /invitations/:token` para um token
  existente
- **THEN** o sistema retorna `{ boardName, invitedByName, email, status }`
- **AND** nenhum campo além desses quatro é retornado

#### Scenario: Consulta de token inexistente

- **WHEN** o visitante faz `GET /invitations/:token` para um token que não corresponde a nenhum
  `Invitation`
- **THEN** o sistema retorna erro de domínio `invitation.not.found` (404)

### Requirement: Aceitar convite (usuário autenticado, logado no fluxo)

O sistema SHALL permitir que um usuário autenticado, cujo e-mail corresponda exatamente (case
-insensitive) ao e-mail do convite, aceite um convite `pending` via
`POST /invitations/:token/accept`, criando (ou reaproveitando) o `BoardMember` correspondente e
marcando o convite como `accepted`, MUST NOT permitir o aceite por um usuário com e-mail
diferente do convidado.

#### Scenario: Usuário logado com e-mail correspondente aceita o convite

- **WHEN** um usuário autenticado cujo e-mail é igual (case-insensitive) ao `email` do convite
  `pending` envia `POST /invitations/:token/accept`
- **THEN** um novo `BoardMember` `role='member'` é criado para esse usuário
- **AND** o `Invitation` passa a `status='accepted'`
- **AND** o evento `member.added` é emitido via `RealtimeEmitter` para a sala do quadro com
  `{ boardId, user: { id, name, email }, role: 'member' }`

#### Scenario: Usuário logado com e-mail divergente tenta aceitar

- **WHEN** um usuário autenticado cujo e-mail é diferente do `email` do convite `pending` envia
  `POST /invitations/:token/accept`
- **THEN** o sistema retorna erro de domínio `invitation.email.mismatch` (403)
- **AND** nenhum `BoardMember` é criado
- **AND** o `Invitation` permanece `pending`

#### Scenario: Usuário deslogado passa pelo fluxo de registro/login antes de aceitar

- **WHEN** um visitante deslogado abre a página pública de convite e escolhe "Entrar no quadro"
- **THEN** o sistema encaminha para `/join` preservando o token do convite (ex.:
  `/join?convite=:token`)
- **AND**, após o visitante concluir registro ou login com o mesmo e-mail do convite, o sistema
  completa o aceite automaticamente (`POST /invitations/:token/accept`) e navega para o quadro

#### Scenario: Usuário já é membro tenta aceitar novamente

- **WHEN** um usuário que já é `BoardMember` do quadro aceita o mesmo convite novamente
- **THEN** o sistema marca o `Invitation` como `accepted` sem criar um `BoardMember` duplicado
- **AND** nenhum erro é retornado ao usuário
- **AND** nenhum novo evento `member.added` é emitido

#### Scenario: Convite já aceito ou revogado

- **WHEN** um usuário envia `POST /invitations/:token/accept` para um convite cujo `status` não
  é `pending` (`accepted` ou `revoked`)
- **THEN** o sistema retorna erro de domínio `invitation.invalid.status` (409)
- **AND** nenhum `BoardMember` é criado ou alterado

#### Scenario: Token inexistente no aceite

- **WHEN** um usuário envia `POST /invitations/:token/accept` para um token que não corresponde
  a nenhum `Invitation`
- **THEN** o sistema retorna erro de domínio `invitation.not.found` (404)
