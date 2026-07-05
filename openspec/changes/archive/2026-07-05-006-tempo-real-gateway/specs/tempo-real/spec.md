## ADDED Requirements

### Requirement: Gateway de tempo real com sala por quadro

O sistema SHALL prover um gateway Socket.IO (`BoardGateway`) que agrupa conexões em uma sala por
quadro no formato `board:{boardId}`, permitindo que eventos sejam direcionados apenas aos
membros conectados a um quadro específico.

#### Scenario: Membro entra na sala do quadro

- **WHEN** um usuário membro do quadro emite `board:join {boardId}` em uma conexão autenticada
- **THEN** o socket é adicionado à sala `board:{boardId}`
- **AND** o usuário passa a receber eventos direcionados àquela sala

### Requirement: Handshake autenticado por JWT

O gateway SHALL validar o token JWT enviado em `socket.handshake.auth.token` usando o mesmo
helper e segredo (`JWT_SECRET`) utilizados pela autenticação HTTP, recusando qualquer conexão
sem token válido.

#### Scenario: Conexão sem token válido é recusada

- **WHEN** um cliente tenta conectar ao gateway sem enviar `socket.handshake.auth.token` ou com
  um token expirado/inválido
- **THEN** a conexão é recusada (desconectada) antes de qualquer evento ser processado
- **AND** o cliente não entra em nenhuma sala de quadro

#### Scenario: Conexão com token válido mantém identidade do usuário

- **WHEN** um cliente conecta com um token JWT válido
- **THEN** o `userId` e o `name` das claims ficam disponíveis no contexto do socket para uso na
  autorização de `board:join` e no rastreamento de presença

### Requirement: Autorização de entrada em sala por associação ao quadro

O sistema SHALL autorizar a entrada de um socket na sala de um quadro apenas quando o usuário
autenticado for `BoardMember` (owner ou member) daquele quadro, negando a entrada caso contrário.

#### Scenario: Usuário não-membro é negado ao tentar entrar no quadro

- **WHEN** um usuário autenticado, mas sem registro de `BoardMember` para o `boardId`
  informado, emite `board:join {boardId}`
- **THEN** o gateway emite um evento de erro ao socket informando a negação
- **AND** o socket não é adicionado à sala do quadro

#### Scenario: Usuário membro entra na sala com sucesso

- **WHEN** um usuário autenticado com registro de `BoardMember` para o `boardId` informado emite
  `board:join {boardId}`
- **THEN** o socket é adicionado à sala `board:{boardId}`

### Requirement: Rastreamento de presença por quadro

O sistema SHALL rastrear quais usuários estão conectados a cada sala de quadro e emitir
`presence.update {boardId, users}` sempre que a composição de usuários da sala mudar.

#### Scenario: Presença atualizada ao entrar na sala

- **WHEN** um usuário membro entra com sucesso na sala de um quadro
- **THEN** todos os sockets da sala recebem `presence.update {boardId, users}` contendo a lista
  atualizada de usuários únicos conectados

#### Scenario: Presença atualizada ao sair ou desconectar

- **WHEN** um usuário emite `board:leave {boardId}` ou desconecta enquanto está em uma sala de
  quadro
- **THEN** o socket é removido da sala e do rastreamento de presença
- **AND** os sockets restantes da sala recebem `presence.update` com a lista atualizada

#### Scenario: Múltiplos sockets do mesmo usuário não duplicam a presença

- **WHEN** o mesmo usuário está conectado à mesma sala de quadro por mais de um socket (por
  exemplo, duas abas do navegador)
- **THEN** a lista emitida em `presence.update` contém o usuário apenas uma vez
- **AND** o usuário só é removido da lista quando todos os seus sockets saírem da sala

### Requirement: Porta RealtimeEmitter para emissão de eventos por quadro

O sistema SHALL prover a porta `RealtimeEmitter`, com o método `emitToBoard(boardId, event,
payload)`, registrada e exportada pelo módulo de quadros para que outros módulos e controllers
emitam eventos de domínio para todos os sockets conectados à sala de um quadro.

#### Scenario: Emissão de um evento para a sala de um quadro

- **WHEN** um controller ou caso de uso, após concluir uma operação com sucesso, chama
  `RealtimeEmitter.emitToBoard(boardId, event, payload)`
- **THEN** todos os sockets atualmente na sala `board:{boardId}` recebem o evento com o payload
  informado

#### Scenario: Porta disponível para consumo por outros módulos

- **WHEN** outro módulo do backend importa o módulo de quadros
- **THEN** ele consegue injetar `RealtimeEmitter` e chamar `emitToBoard` sem depender
  diretamente do `BoardGateway` ou de detalhes do Socket.IO

### Requirement: Escopo restrito à infraestrutura de tempo real

Esta mudança SHALL entregar apenas a infraestrutura de tempo real (gateway, autorização de sala,
presença e a porta `RealtimeEmitter`) e MUST NOT emitir eventos de domínio de cartões, listas,
membros ou atividade, nem incluir um cliente Socket.IO no frontend.

#### Scenario: Nenhum evento de domínio é emitido por esta mudança

- **WHEN** a infraestrutura de tempo real é entregue
- **THEN** o único evento efetivamente emitido pelo gateway é `presence.update`
- **AND** eventos como `card.created`, `list.moved`, `member.added` e `activity.created` não são
  emitidos por esta mudança, ficando a cargo das mudanças donas de cada recurso
- **AND** nenhum cliente Socket.IO é adicionado ao frontend nesta mudança
