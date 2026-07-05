# membros Specification

## Purpose
TBD - created by archiving change 010-compartilhamento-membros. Update Purpose after archive.
## Requirements
### Requirement: Adicionar membro por e-mail

O sistema SHALL permitir que o owner de um quadro adicione um novo membro informando o e-mail
de uma conta já existente, criando um `BoardMember` com `role='member'`.

#### Scenario: Owner adiciona um usuário existente com sucesso

- **WHEN** o owner do quadro envia `POST /boards/:boardId/members` com o e-mail de um `User`
  que ainda não é membro do quadro
- **THEN** um novo `BoardMember` é criado com `role='member'` para esse usuário
- **AND** a resposta inclui os dados básicos do membro adicionado (`id`, `name`, `email`, `role`)

#### Scenario: E-mail sem conta correspondente

- **WHEN** o owner tenta adicionar um e-mail que não corresponde a nenhum `User` existente
- **THEN** o sistema retorna erro de domínio `board.member.not.found` (404)
- **AND** nenhum `BoardMember` é criado

#### Scenario: E-mail já é membro do quadro

- **WHEN** o owner tenta adicionar um e-mail cujo `User` já é `BoardMember` do quadro
- **THEN** o sistema retorna erro de domínio `board.member.already.exists` (409)
- **AND** nenhum `BoardMember` duplicado é criado

#### Scenario: Não-owner tenta adicionar membro

- **WHEN** um usuário que não é owner do quadro (seja `member` ou não-membro) tenta
  `POST /boards/:boardId/members`
- **THEN** o sistema retorna erro de domínio `board.owner.required` (403)
- **AND** nenhum `BoardMember` é criado

### Requirement: Remover membro do quadro

O sistema SHALL permitir que apenas o owner de um quadro remova outros membros, MUST NOT
permitir a remoção do próprio owner.

#### Scenario: Owner remove um membro comum

- **WHEN** o owner do quadro envia `DELETE /boards/:boardId/members/:userId` para um `userId`
  que é `BoardMember` com `role='member'`
- **THEN** o `BoardMember` correspondente é removido
- **AND** o usuário removido deixa de ter acesso ao quadro

#### Scenario: Não-owner tenta remover um membro

- **WHEN** um usuário que não é owner do quadro tenta `DELETE /boards/:boardId/members/:userId`
- **THEN** o sistema retorna erro de domínio `board.owner.required` (403)
- **AND** nenhum `BoardMember` é removido

#### Scenario: Tentativa de remover o próprio owner

- **WHEN** é solicitada a remoção do `userId` que corresponde ao owner do quadro
- **THEN** o sistema retorna erro de domínio `board.owner.cannot.be.removed` (403)
- **AND** o `BoardMember` do owner permanece intacto

### Requirement: Listar membros do quadro

O sistema SHALL permitir que qualquer membro do quadro (owner ou member) liste os membros
atuais, MUST NOT expor a lista a usuários que não são membros do quadro.

#### Scenario: Membro lista os membros do quadro

- **WHEN** um usuário que é `BoardMember` do quadro (qualquer role) envia
  `GET /boards/:boardId/members`
- **THEN** o sistema retorna a lista de membros com `id`, `name`, `email` e `role` de cada um

#### Scenario: Não-membro tenta listar membros

- **WHEN** um usuário que não é `BoardMember` do quadro envia `GET /boards/:boardId/members`
- **THEN** o sistema retorna erro de domínio `board.not.found` (404)

### Requirement: Notificação em tempo real de novo membro

O sistema SHALL emitir o evento `member.added` via `RealtimeEmitter` para a sala do quadro
imediatamente após um novo membro ser adicionado com sucesso.

#### Scenario: Cliente conectado ao quadro recebe o novo membro ao vivo

- **WHEN** o owner adiciona um novo membro com sucesso ao quadro
- **THEN** o evento `member.added` é emitido para a sala `board:{boardId}` com o payload
  `{ boardId, user: { id, name, email }, role: 'member' }`
- **AND** qualquer cliente já conectado a essa sala atualiza sua lista de membros ao vivo, sem
  recarregar a página

#### Scenario: Falha na adição não emite evento

- **WHEN** a tentativa de adicionar um membro falha (e-mail sem conta, já membro, ou requisição
  de não-owner)
- **THEN** nenhum evento `member.added` é emitido

### Requirement: Painel de compartilhamento na página do quadro

O frontend SHALL exibir um painel "Compartilhar" na página do quadro com a lista de membros
para qualquer membro, e MUST restringir os controles de convidar/remover ao owner do quadro.

#### Scenario: Membro comum vê a lista sem controles de gestão

- **WHEN** um usuário com `role='member'` abre o painel "Compartilhar" do quadro
- **THEN** a lista de membros é exibida
- **AND** os controles de convidar por e-mail e remover membro não são exibidos

#### Scenario: Owner vê a lista com controles de gestão

- **WHEN** o owner do quadro abre o painel "Compartilhar"
- **THEN** a lista de membros é exibida junto com o formulário de convite por e-mail e o botão
  de remover em cada membro (exceto o próprio owner)

