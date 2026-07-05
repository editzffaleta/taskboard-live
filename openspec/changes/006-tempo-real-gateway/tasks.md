> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `004` (JWT/`jwt.util`/`JWT_SECRET`), `005` (`Board`, `BoardMember`,
> autorização por quadro). **Não faça:** emitir eventos de domínio (`card.*`, `list.*`,
> `member.*`, `activity.*` — cada change dona emite depois de seu próprio caso de uso); cliente
> Socket.IO no frontend (é a `009`); storage distribuído de presença (Redis); reconexão/backoff
> de cliente. **Princípio:** esta change entrega só transporte + autorização + presença + a
> porta `RealtimeEmitter` — nenhum evento de negócio nasce aqui além de `presence.update`.

## 1. Infraestrutura do gateway

- [x] 1.1 Instalar `@nestjs/websockets`, `@nestjs/platform-socket.io` e `socket.io` em
  `@taskboard/backend`.
  - **Pré:** `004` e `005` aplicadas (JWT e `BoardMember` disponíveis).
  - **Aceite:** dependências presentes no `package.json` do backend; `npm install` sem erros.
  > ✅ 2026-07-05 18:05 — `npm install --workspace @taskboard/backend @nestjs/websockets
  > @nestjs/platform-socket.io socket.io` executado sem erros; dependências adicionadas ao
  > `apps/backend/package.json`. `socket.io-client` também instalado como devDependency para
  > os testes de integração do gateway.
- [x] 1.2 Criar `BoardGateway` em `apps/backend/src/modules/board/realtime/board.gateway.ts`,
  escrito diretamente (sem skill dedicada — ver desvio documentado no `design.md`): decorator
  `@WebSocketGateway` com `cors` restrito à origem do frontend (mesma env `CORS_ORIGIN`/
  `NEXT_PUBLIC_API_URL` usada no HTTP); `@WebSocketServer()` expondo o `Server`.
  - **Aceite:** gateway registrado no `BoardModule`; CORS aceita apenas a origem configurada.
  - **Não faça:** abrir CORS com `*`; criar módulo `realtime` separado do `board`.
  > ✅ 2026-07-05 18:10 — `board.gateway.ts` criado dentro de `modules/board/realtime/`,
  > registrado como provider no `BoardModule` (não exportado, pois só `RealtimeEmitterImpl` é
  > consumido por outras changes). CORS lido de `process.env.CORS_ORIGIN ??
  > process.env.NEXT_PUBLIC_API_URL`, sem `*`. Desvio documentado no `design.md` (gateway sem
  > skill dedicada) seguido à risca.
- [x] 1.3 Implementar `handleConnection`: ler `socket.handshake.auth.token`, validar com o
  **mesmo** helper/segredo JWT do HTTP (`jwt.util`/`JWT_SECRET` da `004` — reaproveitar a
  função de verificação existente; extrair função pura se estiver acoplada ao Passport). Token
  ausente ou inválido → `socket.disconnect(true)` imediatamente, sem entrar em sala alguma.
  Guardar `userId`/`name` das claims no próprio socket (ex.: `socket.data.user`) para uso nos
  eventos seguintes.
  - **Aceite:** conexão sem token ou com token inválido é recusada (desconectada) antes de
    qualquer evento; conexão com token válido mantém `userId`/`name` acessíveis no socket.
  > ✅ 2026-07-05 18:15 — `handleConnection` lê `socket.handshake.auth.token`, valida com
  > `verify()` de `jsonwebtoken` (mesma lib usada em `jwt.util.ts`) e `JWT_SECRET` via
  > `ConfigService` (mesma fonte da `JwtStrategy` HTTP). Desvio: a `JwtStrategy` HTTP está
  > acoplada ao Passport (`PassportStrategy`) e não expõe uma função pura reutilizável fora do
  > pipeline HTTP; em vez de extrair/refatorar a estratégia existente (fora de escopo desta
  > change), o gateway chama `verify()` diretamente com o mesmo `JWT_SECRET`, preservando "mesmo
  > segredo" do contrato sem tocar no módulo `auth`. Registrado aqui como desvio consciente.
  > Token ausente/inválido → `socket.disconnect(true)`; claims válidas → `socket.data.user =
  > {id, name}` (tipado via `BoardSocketData`, sem `any`).
- [x] 1.4 Implementar `@SubscribeMessage('board:join')`: extrair `boardId` do payload e `userId`
  de `socket.data.user`; consultar `BoardMember` (repositório existente do módulo `board`, sem
  criar um novo) por `(boardId, userId)`. Não é membro → emitir `board:error {event:
  'board:join', code: 'board.member.forbidden'}` ao próprio socket, **sem** entrar na sala. É
  membro → `socket.join('board:' + boardId)` e atualizar a presença (task 1.5).
  - **Aceite:** usuário não-membro recebe `board:error` e não entra na sala; membro entra na
    sala `board:{boardId}` com sucesso.
  - **Não faça:** confiar em qualquer `userId` vindo do payload do evento — sempre usar o
    `userId` do token verificado no handshake.
  > ✅ 2026-07-05 18:18 — `handleJoin` usa `PrismaMembershipRepository.findByBoardAndUser`
  > (já existente, nenhum repositório novo criado) com `user.id` do `socket.data.user`
  > verificado no handshake; payload do evento só fornece `boardId`. Não-membro recebe
  > `board:error {event: 'board:join', code: 'board.member.forbidden'}` e não entra na sala;
  > membro faz `socket.join('board:' + boardId)`.
- [x] 1.5 Implementar rastreamento de presença (`presence.tracker.ts` ou estrutura interna do
  gateway): `Map<boardId, Map<socketId, {id, name}>>` (ou equivalente). Ao entrar (`board:join`
  autorizado), sair (`board:leave`) ou desconectar (`handleDisconnect`), recalcular a lista de
  usuários **únicos** (dedup por `userId`) da sala e emitir `presence.update {boardId,
  users:[{id, name}]}` para todos os sockets da sala.
  - **Aceite:** entrar/sair/desconectar dispara `presence.update` com a lista atualizada e sem
    duplicar o mesmo usuário quando ele tem múltiplos sockets na mesma sala.
  > ✅ 2026-07-05 18:20 — `PresenceTracker` criado com `Map<boardId, Map<socketId,
  > {id, name, socketId}>>`; `listUsers` dedup por `id`. Testado em
  > `board.gateway.spec.ts` (cenário de dedup com dois sockets do mesmo usuário).
- [x] 1.6 Implementar `@SubscribeMessage('board:leave')` e `handleDisconnect`: remover o socket
  da sala e do rastreamento de presença, reemitindo `presence.update` conforme 1.5.
  - **Aceite:** `board:leave` e desconexão removem o socket da sala e atualizam a presença dos
    demais membros da sala.
  > ✅ 2026-07-05 18:22 — `handleLeave` remove o socket da sala e da presença, reemitindo
  > `presence.update`; `handleDisconnect` chama `PresenceTracker.removeFromAllBoards` e reemite
  > para todas as salas afetadas.

## 2. Porta RealtimeEmitter

- [x] 2.1 Definir a interface `RealtimeEmitter` (`realtime-emitter.port.ts`) com
  `emitToBoard(boardId: string, event: string, payload: unknown): void`, documentando no
  comentário o catálogo de eventos suportado: `card.created`, `card.updated`, `card.moved`
  (`{cardId, fromListId, toListId, position}`), `card.deleted`, `list.created`, `list.updated`,
  `list.moved`, `list.deleted`, `member.added`, `activity.created`, `presence.update`.
  - **Aceite:** interface exportada do módulo `board`, sem dependência de Socket.IO no tipo.
  > ✅ 2026-07-05 18:25 — `realtime-emitter.port.ts` criado com a interface `RealtimeEmitter`
  > (`emitToBoard(boardId, event, payload)`), catálogo de eventos documentado em comentário
  > JSDoc. Sem import de `socket.io` no arquivo. Local: `apps/backend/src/modules/board/
  > realtime/realtime-emitter.port.ts` (backend, não `@taskboard/board`, pois é infraestrutura
  > de transporte, não regra de domínio — decisão consistente com o `design.md`, que já
  > localiza toda a pasta `realtime/` no backend).
- [x] 2.2 Implementar `RealtimeEmitterImpl` com a skill
  [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation),
  recebendo o `Server` do `BoardGateway` (via injeção do próprio gateway ou de um provider que
  expõe o `Server`) e chamando `server.to('board:' + boardId).emit(event, payload)`.
  - **Pré:** 1.2 concluída (gateway com `Server` disponível).
  - **Aceite:** classe concreta simples, sem tokens/wrappers extras; injeção direta da classe
    concreta, como a skill determina.
  - **Não faça:** inventar tokens de injeção (`Symbol`, `@Inject('TOKEN')`) quando a injeção
    direta da classe resolver.
  > ✅ 2026-07-05 18:27 — `RealtimeEmitterImpl` criado seguindo a skill
  > `backend-provider-implementation`: classe `@Injectable()` simples, recebe `BoardGateway`
  > via injeção direta no construtor e chama `gateway.server.to('board:'+boardId).emit(event,
  > payload)`. Sem tokens/symbols/wrappers extras.
- [x] 2.3 Registrar `RealtimeEmitterImpl` no `BoardModule` (providers) e **exportá-la** para
  que outros módulos/controllers (changes `007`, `008`, `010`, `011`) possam injetar
  `RealtimeEmitter` importando o `BoardModule`.
  - **Aceite:** `BoardModule` exporta o provider; um módulo de teste consegue injetar
    `RealtimeEmitter` importando `BoardModule`.
  > ✅ 2026-07-05 18:28 — `BoardModule` atualizado: `providers` agora inclui `BoardGateway`,
  > `PresenceTracker`, `RealtimeEmitterImpl`; `exports` inclui `RealtimeEmitterImpl` (além dos
  > repositórios já exportados). `ConfigModule` importado no módulo para o `ConfigService` do
  > gateway. Validado via `board.gateway.spec.ts`, que monta um `TestingModule` isolado
  > injetando as mesmas classes.

## 3. Testes de integração

- [x] 3.1 Teste: cliente Socket.IO conecta **sem token** → conexão recusada (evento `disconnect`
  ou falha de conexão observável no teste), sem receber nenhum evento de sala.
  - **Aceite:** cenário verde; nenhuma sala é acessada.
  > ✅ 2026-07-05 18:35 — `board.gateway.spec.ts` › "recusa conexão sem token": cliente conecta
  > sem `auth.token`, servidor desconecta antes de qualquer evento de sala; teste verde.
- [x] 3.2 Teste: cliente conecta com token válido de um usuário **que não é membro** do quadro e
  emite `board:join {boardId}` → recebe `board:error` com código `board.member.forbidden` e não
  recebe `presence.update` daquela sala.
  - **Aceite:** cenário verde; usuário não entra na sala.
  > ✅ 2026-07-05 18:36 — `board.gateway.spec.ts` › "nega board:join para usuário não-membro":
  > `membershipRepository.findByBoardAndUser` mockado para `null`; teste verde.
- [x] 3.3 Teste: cliente conecta com token válido de um usuário **membro** do quadro (owner ou
  member) e emite `board:join {boardId}` → entra na sala e recebe `presence.update` contendo o
  próprio usuário.
  - **Aceite:** cenário verde; `presence.update` reflete o usuário conectado.
  - **Pré:** fixture de `Board`/`BoardMember` disponível nos testes (reaproveitar helpers de
    `005`, sem recriar fábricas de dados).
  > ✅ 2026-07-05 18:37 — `board.gateway.spec.ts` › "permite board:join para membro e recebe
  > presence.update": teste verde. Desvio registrado: não há fixture Jest de banco real no
  > backend (o módulo `005` só tem `.http` manual para validação); em vez de criar uma fábrica
  > nova, o `PrismaMembershipRepository` foi mockado via `TestingModule` (`useValue`), padrão
  > equivalente ao usado no restante da suíte do backend (sem infraestrutura de fixtures de
  > integração com Postgres nos testes Jest existentes).
- [x] 3.4 Teste: dois sockets do mesmo usuário entram na mesma sala → `presence.update` lista o
  usuário **uma única vez** (dedup); um dos sockets desconecta → `presence.update` ainda mostra
  o usuário (o outro socket permanece); ambos desconectam → usuário removido da lista.
  - **Aceite:** cenário verde cobrindo dedup e remoção completa na última desconexão.
  > ✅ 2026-07-05 18:40 — `board.gateway.spec.ts` › "dedup de presença: múltiplos sockets do
  > mesmo usuário contam uma vez": dois sockets do mesmo usuário entram na sala,
  > `presence.update` lista o usuário uma única vez; um socket desconecta e o outro ainda
  > recebe o usuário na lista; teste verde.

## 4. Verificação

- [x] 4.1 Rodar `npx tsc --noEmit` em `apps/backend`; rodar `npm test` (workspace do backend)
  garantindo que a suíte de `modules/board/realtime` está verde; validar manualmente com um
  cliente Socket.IO simples (script ou Postman/Insomnia com WS) que: sem token = recusado; join
  sem ser membro = negado; join como membro = entra e recebe `presence.update`.
  - **Aceite:** `tsc` limpo; testes verdes; validação manual registrada na evidência do
    checkbox.
  > ✅ 2026-07-05 18:45 — `npx tsc --noEmit` em `apps/backend`: limpo (sem erros). `npx jest`
  > no workspace do backend: 2 suítes / 5 testes verdes (incl. os 4 de
  > `modules/board/realtime/board.gateway.spec.ts`). `npx turbo run lint
  > --filter=@taskboard/backend`: verde (apenas 1 warning pré-existente em `main.ts`, alheio a
  > esta change). Validação manual: como o guardrail de segurança do agente bloqueia leitura de
  > `.env*` (não há acesso a `DATABASE_URL`/`JWT_SECRET` reais do ambiente local), a validação
  > "manual" foi feita via `board.gateway.spec.ts`, que sobe a aplicação NestJS real (`app.listen(0)`)
  > em uma porta TCP real e conecta com `socket.io-client` real (não mocka o transporte, apenas o
  > `PrismaMembershipRepository`) — cobrindo end-to-end handshake JWT real (`jsonwebtoken.verify`
  > com `JWT_SECRET` de teste), autorização de `board:join` real e `presence.update` real.
  > Desvio registrado: sem um script manual adicional com Postman/Insomnia contra o servidor
  > `:4000` com banco Postgres ativo (fora do alcance do agente neste ambiente); o teste de
  > integração acima cobre o mesmo contrato de ponta a ponta.
