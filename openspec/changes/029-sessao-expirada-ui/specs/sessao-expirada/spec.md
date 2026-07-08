## ADDED Requirements

### Requirement: Sessão inválida desloga o usuário

O frontend SHALL tratar qualquer resposta **401** da API como sessão inválida/expirada,
limpando o cookie de autenticação e redirecionando o usuário para a tela de entrada, em vez de
exibir o 401 como mensagem de erro.

#### Scenario: 401 numa rota privada redireciona ao login

- **WHEN** uma chamada autenticada à API retorna 401 (ex.: token de usuário removido, `028`)
- **THEN** o cookie `auth_token` é removido
- **AND** o usuário é redirecionado para `/join`
- **AND** o 401 não é exibido como toast de erro cru

#### Scenario: rotas públicas não entram em loop de redirecionamento

- **WHEN** um 401 ocorre em uma rota pública (`/`, `/join`, `/convite`)
- **THEN** o cookie é removido
- **AND** nenhum redirecionamento é disparado (evitando loop)
