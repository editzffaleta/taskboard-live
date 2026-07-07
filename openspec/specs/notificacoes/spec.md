# notificacoes Specification

## Purpose
TBD - created by archiving change 024-notificacoes. Update Purpose after archive.
## Requirements
### Requirement: Registro persistente de notificação por usuário

O sistema SHALL persistir cada evento relevante direcionado a um usuário (membro adicionado a um
quadro, atribuição de cartão, novo comentário em cartão sob sua responsabilidade) como uma
`Notification` associada ao `userId` destinatário.

#### Scenario: Usuário adicionado a um quadro recebe notificação

- **WHEN** um usuário é adicionado como membro de um quadro
- **THEN** uma `Notification` do tipo `member.added.you` é persistida para o `userId` do usuário
  adicionado, com `boardId`, `boardName` e `addedByName` em `data`
- **AND** a falha ao gravar a `Notification` não impede a resposta de sucesso da mutação original

#### Scenario: Usuário atribuído a um cartão recebe notificação, exceto ao se auto-atribuir

- **WHEN** um usuário diferente do próprio atribui outro usuário como assignee de um cartão
- **THEN** uma `Notification` do tipo `card.assigned.you` é persistida para o `userId` do assignee,
  com `boardId`, `cardId`, `cardTitle` e `assignedByName` em `data`
- **AND** quando o usuário se atribui a si mesmo como assignee, nenhuma `Notification` é gerada

#### Scenario: Assignees de um cartão recebem notificação de novo comentário, exceto o autor

- **WHEN** um novo comentário é adicionado a um cartão que possui assignees
- **THEN** uma `Notification` do tipo `comment.added` é persistida para cada `userId` de assignee
  do cartão, exceto para o `userId` do autor do comentário, com `boardId`, `cardId`, `cardTitle`,
  `commentId`, `authorName` e `excerpt` em `data`
- **AND** um cartão sem assignees não gera nenhuma `Notification`
- **AND** falha ao notificar um assignee não impede notificar os demais assignees do mesmo cartão

### Requirement: Entrega em tempo real por canal de usuário

O sistema SHALL emitir o evento `notification.created` via `RealtimeEmitter.emitToUser` para o
canal individual do usuário destinatário (`user:{userId}`) imediatamente após persistir cada
`Notification`, e SHALL colocar automaticamente todo socket autenticado nesse canal no handshake,
independente de o usuário estar com algum quadro aberto.

#### Scenario: Usuário conectado recebe a notificação ao vivo, mesmo sem quadro aberto

- **WHEN** um usuário autenticado estabelece conexão Socket.IO com a aplicação (sem
  necessariamente emitir `board:join`)
- **THEN** o socket é automaticamente colocado no canal `user:{userId}` correspondente ao seu
  próprio `id`
- **AND** ao ser registrada uma `Notification` para esse `userId`, o socket recebe o evento
  `notification.created` com os dados da notificação recém-criada

### Requirement: Consulta paginada e contagem de não lidas restritas ao próprio usuário

O sistema SHALL expor um endpoint que retorna o histórico de notificações do usuário autenticado,
paginado e ordenado do mais recente para o mais antigo, e um endpoint que retorna a contagem de
notificações não lidas, ambos restritos exclusivamente ao próprio usuário.

#### Scenario: Usuário consulta suas notificações e a contagem de não lidas

- **WHEN** um usuário autenticado chama `GET /notifications`
- **THEN** recebe uma página de suas próprias notificações ordenadas por `createdAt` decrescente
- **AND** ao chamar `GET /notifications/unread-count`, recebe a contagem de suas notificações com
  `readAt` nulo
- **AND** em nenhum caso o usuário recebe notificações cujo `userId` seja diferente do seu

### Requirement: Marcação de leitura restrita ao próprio usuário

O sistema SHALL permitir que o usuário autenticado marque uma notificação específica ou todas as
suas notificações como lidas, e MUST NOT permitir que um usuário marque como lida uma notificação
pertencente a outro usuário.

#### Scenario: Usuário marca uma notificação e depois todas como lidas

- **WHEN** um usuário autenticado chama `PATCH /notifications/:id/read` para uma notificação sua
  não lida
- **THEN** a notificação passa a ter `readAt` preenchido e a contagem de não lidas do usuário
  diminui em um
- **AND** chamar `PATCH /notifications/:id/read` novamente para a mesma notificação (já lida) não
  gera erro (idempotente)
- **AND** chamar `PATCH /notifications/:id/read` para uma notificação de outro usuário resulta em
  erro de não encontrado
- **AND** chamar `POST /notifications/read-all` marca todas as notificações não lidas do usuário
  como lidas, zerando sua contagem de não lidas

### Requirement: Central de notificações no frontend

O frontend SHALL exibir, na topbar de toda página privada, um sino de notificações com contador de
não lidas e um dropdown/central que lista as notificações do usuário, atualizado ao vivo pelo
evento `notification.created` recebido por um canal de socket de nível de aplicação (não restrito
à página de um quadro específico).

#### Scenario: Sino exibe contador e central lista notificações com atualização ao vivo

- **WHEN** o usuário está autenticado em qualquer página privada, com ou sem um quadro aberto
- **THEN** o sino na topbar exibe o número de notificações não lidas
- **AND** ao abrir o dropdown, o histórico de notificações é carregado via `GET /notifications`
  com rótulo i18n legível por `type` (com fallback para `type` desconhecido) e tempo relativo
- **AND** ao ocorrer uma nova notificação para o usuário, ela aparece no topo da lista e o contador
  é incrementado, sem exigir recarregar a página, mesmo se o usuário não estiver na página de
  nenhum quadro

#### Scenario: Clicar em uma notificação marca como lida e navega ao recurso

- **WHEN** o usuário clica em uma notificação não lida na central
- **THEN** a notificação é marcada como lida e o contador de não lidas é atualizado
- **AND** o usuário é navegado para o quadro (`/boards/{boardId}`) ou, quando a notificação se
  refere a um cartão, para o quadro com o cartão indicado (`/boards/{boardId}?card={cardId}`)

### Requirement: Escopo restrito aos três gatilhos e sem alteração de comportamento de 010/017

Esta mudança SHALL entregar apenas o agregado `notification`, a extensão do `RealtimeEmitter`/
`BoardGateway` com o canal por usuário, e a integração de gancho nos três controllers existentes
listados no `design.md`, e MUST NOT alterar o comportamento funcional dos casos de uso de membros,
atribuição de cartão ou comentários, nem o comportamento existente de `emitToBoard` e de
`board:join`/`board:leave`.

#### Scenario: Nenhuma regra de negócio de outros agregados é alterada

- **WHEN** o agregado `notification` é entregue
- **THEN** os casos de uso de `member`, `card-assignee` e `comment` continuam se comportando
  exatamente como antes desta mudança
- **AND** a única alteração nos controllers desses agregados é a chamada adicional a
  `NotificationRecorder.record` após a emissão do evento de domínio já existente
- **AND** `emitToBoard` e o fluxo de `board:join`/`board:leave` continuam funcionando exatamente
  como antes desta mudança

