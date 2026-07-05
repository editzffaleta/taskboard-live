> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `004` (JWT/`jwt.util`/`JWT_SECRET`), `005` (`Board`, `BoardMember`,
> autorização por quadro). **Não faça:** emitir eventos de domínio (`card.*`, `list.*`,
> `member.*`, `activity.*` — cada change dona emite depois de seu próprio caso de uso); cliente
> Socket.IO no frontend (é a `009`); storage distribuído de presença (Redis); reconexão/backoff
> de cliente. **Princípio:** esta change entrega só transporte + autorização + presença + a
> porta `RealtimeEmitter` — nenhum evento de negócio nasce aqui além de `presence.update`.

## 1. Infraestrutura do gateway

- [ ] 1.1 Instalar `@nestjs/websockets`, `@nestjs/platform-socket.io` e `socket.io` em
  `@taskboard/backend`.
  - **Pré:** `004` e `005` aplicadas (JWT e `BoardMember` disponíveis).
  - **Aceite:** dependências presentes no `package.json` do backend; `npm install` sem erros.
- [ ] 1.2 Criar `BoardGateway` em `apps/backend/src/modules/board/realtime/board.gateway.ts`,
  escrito diretamente (sem skill dedicada — ver desvio documentado no `design.md`): decorator
  `@WebSocketGateway` com `cors` restrito à origem do frontend (mesma env `CORS_ORIGIN`/
  `NEXT_PUBLIC_API_URL` usada no HTTP); `@WebSocketServer()` expondo o `Server`.
  - **Aceite:** gateway registrado no `BoardModule`; CORS aceita apenas a origem configurada.
  - **Não faça:** abrir CORS com `*`; criar módulo `realtime` separado do `board`.
- [ ] 1.3 Implementar `handleConnection`: ler `socket.handshake.auth.token`, validar com o
  **mesmo** helper/segredo JWT do HTTP (`jwt.util`/`JWT_SECRET` da `004` — reaproveitar a
  função de verificação existente; extrair função pura se estiver acoplada ao Passport). Token
  ausente ou inválido → `socket.disconnect(true)` imediatamente, sem entrar em sala alguma.
  Guardar `userId`/`name` das claims no próprio socket (ex.: `socket.data.user`) para uso nos
  eventos seguintes.
  - **Aceite:** conexão sem token ou com token inválido é recusada (desconectada) antes de
    qualquer evento; conexão com token válido mantém `userId`/`name` acessíveis no socket.
- [ ] 1.4 Implementar `@SubscribeMessage('board:join')`: extrair `boardId` do payload e `userId`
  de `socket.data.user`; consultar `BoardMember` (repositório existente do módulo `board`, sem
  criar um novo) por `(boardId, userId)`. Não é membro → emitir `board:error {event:
  'board:join', code: 'board.member.forbidden'}` ao próprio socket, **sem** entrar na sala. É
  membro → `socket.join('board:' + boardId)` e atualizar a presença (task 1.5).
  - **Aceite:** usuário não-membro recebe `board:error` e não entra na sala; membro entra na
    sala `board:{boardId}` com sucesso.
  - **Não faça:** confiar em qualquer `userId` vindo do payload do evento — sempre usar o
    `userId` do token verificado no handshake.
- [ ] 1.5 Implementar rastreamento de presença (`presence.tracker.ts` ou estrutura interna do
  gateway): `Map<boardId, Map<socketId, {id, name}>>` (ou equivalente). Ao entrar (`board:join`
  autorizado), sair (`board:leave`) ou desconectar (`handleDisconnect`), recalcular a lista de
  usuários **únicos** (dedup por `userId`) da sala e emitir `presence.update {boardId,
  users:[{id, name}]}` para todos os sockets da sala.
  - **Aceite:** entrar/sair/desconectar dispara `presence.update` com a lista atualizada e sem
    duplicar o mesmo usuário quando ele tem múltiplos sockets na mesma sala.
- [ ] 1.6 Implementar `@SubscribeMessage('board:leave')` e `handleDisconnect`: remover o socket
  da sala e do rastreamento de presença, reemitindo `presence.update` conforme 1.5.
  - **Aceite:** `board:leave` e desconexão removem o socket da sala e atualizam a presença dos
    demais membros da sala.

## 2. Porta RealtimeEmitter

- [ ] 2.1 Definir a interface `RealtimeEmitter` (`realtime-emitter.port.ts`) com
  `emitToBoard(boardId: string, event: string, payload: unknown): void`, documentando no
  comentário o catálogo de eventos suportado: `card.created`, `card.updated`, `card.moved`
  (`{cardId, fromListId, toListId, position}`), `card.deleted`, `list.created`, `list.updated`,
  `list.moved`, `list.deleted`, `member.added`, `activity.created`, `presence.update`.
  - **Aceite:** interface exportada do módulo `board`, sem dependência de Socket.IO no tipo.
- [ ] 2.2 Implementar `RealtimeEmitterImpl` com a skill
  [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation),
  recebendo o `Server` do `BoardGateway` (via injeção do próprio gateway ou de um provider que
  expõe o `Server`) e chamando `server.to('board:' + boardId).emit(event, payload)`.
  - **Pré:** 1.2 concluída (gateway com `Server` disponível).
  - **Aceite:** classe concreta simples, sem tokens/wrappers extras; injeção direta da classe
    concreta, como a skill determina.
  - **Não faça:** inventar tokens de injeção (`Symbol`, `@Inject('TOKEN')`) quando a injeção
    direta da classe resolver.
- [ ] 2.3 Registrar `RealtimeEmitterImpl` no `BoardModule` (providers) e **exportá-la** para
  que outros módulos/controllers (changes `007`, `008`, `010`, `011`) possam injetar
  `RealtimeEmitter` importando o `BoardModule`.
  - **Aceite:** `BoardModule` exporta o provider; um módulo de teste consegue injetar
    `RealtimeEmitter` importando `BoardModule`.

## 3. Testes de integração

- [ ] 3.1 Teste: cliente Socket.IO conecta **sem token** → conexão recusada (evento `disconnect`
  ou falha de conexão observável no teste), sem receber nenhum evento de sala.
  - **Aceite:** cenário verde; nenhuma sala é acessada.
- [ ] 3.2 Teste: cliente conecta com token válido de um usuário **que não é membro** do quadro e
  emite `board:join {boardId}` → recebe `board:error` com código `board.member.forbidden` e não
  recebe `presence.update` daquela sala.
  - **Aceite:** cenário verde; usuário não entra na sala.
- [ ] 3.3 Teste: cliente conecta com token válido de um usuário **membro** do quadro (owner ou
  member) e emite `board:join {boardId}` → entra na sala e recebe `presence.update` contendo o
  próprio usuário.
  - **Aceite:** cenário verde; `presence.update` reflete o usuário conectado.
  - **Pré:** fixture de `Board`/`BoardMember` disponível nos testes (reaproveitar helpers de
    `005`, sem recriar fábricas de dados).
- [ ] 3.4 Teste: dois sockets do mesmo usuário entram na mesma sala → `presence.update` lista o
  usuário **uma única vez** (dedup); um dos sockets desconecta → `presence.update` ainda mostra
  o usuário (o outro socket permanece); ambos desconectam → usuário removido da lista.
  - **Aceite:** cenário verde cobrindo dedup e remoção completa na última desconexão.

## 4. Verificação

- [ ] 4.1 Rodar `npx tsc --noEmit` em `apps/backend`; rodar `npm test` (workspace do backend)
  garantindo que a suíte de `modules/board/realtime` está verde; validar manualmente com um
  cliente Socket.IO simples (script ou Postman/Insomnia com WS) que: sem token = recusado; join
  sem ser membro = negado; join como membro = entra e recebe `presence.update`.
  - **Aceite:** `tsc` limpo; testes verdes; validação manual registrada na evidência do
    checkbox.
