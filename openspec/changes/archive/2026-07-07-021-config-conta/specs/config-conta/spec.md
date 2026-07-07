## ADDED Requirements

### Requirement: Edição de perfil (nome)

O sistema SHALL permitir que o usuário autenticado altere o próprio `name` via
`PATCH /auth/me`, usando exclusivamente o `userId` extraído do JWT (nunca um identificador vindo
do corpo da requisição). O `email` permanece somente leitura nesta funcionalidade.

#### Scenario: Usuário edita o próprio nome com sucesso

- **WHEN** o usuário autenticado envia `PATCH /auth/me` com um `name` válido
- **THEN** o `name` é persistido
- **AND** a resposta inclui `{ id, name, email }` atualizado

#### Scenario: Nome inválido é rejeitado

- **WHEN** o usuário autenticado envia `PATCH /auth/me` com `name` que viola as regras de
  validação já existentes (`RequiredRule`, `MinLengthRule`, `MaxLengthRule`, `PersonNameRule`)
- **THEN** a requisição é rejeitada
- **AND** o `name` anterior permanece inalterado

### Requirement: Troca de senha

O sistema SHALL permitir que o usuário autenticado troque a própria senha via
`PATCH /auth/me/password`, exigindo a senha atual (validada por comparação de hash) e uma nova
senha que cumpra as mesmas regras de força já aplicadas no registro.

#### Scenario: Troca de senha com senha atual correta

- **WHEN** o usuário autenticado envia `PATCH /auth/me/password` com `currentPassword` correta e
  `newPassword` que cumpre as regras de força de senha
- **THEN** o hash da senha é atualizado
- **AND** um login subsequente com a nova senha é aceito

#### Scenario: Troca de senha rejeita senha atual incorreta

- **WHEN** o usuário autenticado envia `PATCH /auth/me/password` com `currentPassword` que não
  corresponde ao hash persistido
- **THEN** a requisição é rejeitada
- **AND** a senha persistida permanece inalterada

#### Scenario: Troca de senha rejeita nova senha fraca

- **WHEN** o usuário autenticado envia `PATCH /auth/me/password` com `newPassword` que não
  cumpre as regras de força de senha (`StrongPasswordRule`/`NoCommonPasswordRule`)
- **THEN** a requisição é rejeitada antes de comparar a senha atual
- **AND** a senha persistida permanece inalterada

### Requirement: Exclusão da própria conta

O sistema SHALL permitir que o usuário autenticado exclua a própria conta via `DELETE /auth/me`,
aplicando a seguinte regra em relação a quadros: a exclusão é bloqueada se o usuário for owner de
algum quadro com outros membros; quadros de que o usuário é owner sem outros membros são
excluídos em cascata junto com a conta; memberships em quadros de terceiros são removidas antes
da exclusão do usuário.

#### Scenario: Exclusão de conta sem quadros ou apenas com quadros solo

- **WHEN** o usuário autenticado que não é owner de nenhum quadro, ou é owner apenas de quadros
  sem outros membros, confirma a exclusão da própria conta
- **THEN** os quadros-owner sem outros membros são excluídos (junto com listas, cartões,
  etiquetas e atividades desses quadros)
- **AND** o usuário é excluído
- **AND** o front encerra a sessão (logout) e navega para a rota pública

#### Scenario: Exclusão de conta é bloqueada por quadro-owner com outros membros

- **WHEN** o usuário autenticado é owner de pelo menos um quadro que possui outros membros e
  tenta excluir a própria conta
- **THEN** a requisição é rejeitada com um código de erro identificando o bloqueio
- **AND** nenhum quadro, membership ou o próprio usuário é excluído

#### Scenario: Exclusão de conta remove memberships em quadros de terceiros

- **WHEN** o usuário autenticado é membro (não-owner) de um ou mais quadros de terceiros e a
  exclusão da conta é bem-sucedida (nenhum bloqueio por quadro-owner com outros membros)
- **THEN** as memberships desse usuário nesses quadros são removidas
- **AND** os quadros de terceiros e seus demais dados permanecem intactos

### Requirement: Seções placeholder de segurança e preferências fora de escopo funcional

O sistema SHALL exibir, na tela "Configurações da Conta", as seções "Autenticação em 2 fatores",
"Sessões e dispositivos ativos" e "Notificações por e-mail" de forma fiel ao mockup, porém
**sem** qualquer efeito funcional (controles desabilitados ou informativos, sem chamada de API),
e MUST NOT implementar TOTP, gestão de sessões/refresh token ou envio de e-mail real nesta
mudança.

#### Scenario: Seções placeholder não produzem efeito algum

- **WHEN** o usuário autenticado interage com os controles das seções "Autenticação em 2
  fatores", "Sessões e dispositivos ativos" ou "Notificações por e-mail" na tela de
  configurações
- **THEN** nenhuma requisição de API é disparada
- **AND** nenhum estado relacionado a essas seções é persistido no backend

#### Scenario: Nenhuma infraestrutura de 2FA, sessões ou e-mail é criada

- **WHEN** a tela de Configurações da Conta é entregue por esta mudança
- **THEN** nenhum endpoint, tabela ou dependência de TOTP é criado
- **AND** nenhuma infraestrutura de sessões/refresh token é criada
- **AND** nenhum provedor de e-mail é integrado
