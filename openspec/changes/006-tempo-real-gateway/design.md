## Context

O módulo `board` já existe com `Board` e `BoardMember` (`005`), e a autenticação JWT via
`jwt.util`/`JWT_SECRET` já protege o HTTP (`004`). Falta o canal servidor→clientes: sem ele, um
membro que move um cartão ou renomeia uma lista não notifica os outros membros conectados ao
mesmo quadro. Esta change entrega **só a infraestrutura**: gateway, autorização de sala,
presença e a porta de emissão. Nenhum evento de domínio (`card.*`, `list.*`, `member.*`,
`activity.*`) é emitido por aqui — isso é responsabilidade de cada change dona do recurso, que
vai injetar `RealtimeEmitter` e chamar `emitToBoard` depois que o caso de uso tiver sucesso.

Referências compartilhadas: `openspec/shared/como-executar.md` e
`openspec/shared/regras-de-nomenclatura.md`.

## Goals / Non-Goals

**Goals:**
- Gateway Socket.IO autenticado por JWT no handshake, reaproveitando o mesmo segredo do HTTP.
- Sala por quadro (`board:{boardId}`) com entrada autorizada por `BoardMember` (owner ou
  member) — nunca por confiança no `boardId` enviado pelo cliente.
- Presença rastreada em memória por sala, com `presence.update` a cada entrada/saída/disconnect.
- Porta `RealtimeEmitter` estável e simples (`emitToBoard(boardId, event, payload)`) para as
  changes seguintes consumirem sem conhecer detalhes do Socket.IO.
- CORS do Socket.IO alinhado à mesma origem do frontend usada no HTTP.

**Non-Goals:**
- Cliente Socket.IO no frontend — é a `009`.
- Emitir qualquer evento de domínio (`card.created`, `list.moved` etc.) — cada change dona
  injeta o emitter e chama após seu próprio caso de uso; esta change só define o contrato e a
  infraestrutura de transporte.
- Persistência de presença (Redis, adapter distribuído) — em memória é suficiente para uma
  réplica (padrão do template); storage compartilhado é decisão futura se houver escala
  horizontal.
- Reconexão/backoff no cliente — também escopo do frontend na `009`.

## Decisions

- **Localização**: `apps/backend/src/modules/board/realtime/` dentro do módulo `board` (não um
  módulo `realtime` separado), porque a autorização de sala depende diretamente de
  `BoardMemberRepository`/dados do quadro e o emitter só faz sentido acoplado ao domínio de
  quadros. Arquivos: `board.gateway.ts`, `ws-jwt.guard.ts` (ou verificação inline no
  `handleConnection`), `presence.tracker.ts`, `realtime-emitter.provider.ts`,
  `realtime-emitter.port.ts` (interface).
- **Handshake JWT reaproveitando o helper HTTP**: o gateway chama a mesma função de verificação
  usada pela estratégia JWT do HTTP (`jwt.util`/`JWT_SECRET` — ver `004`), lendo o token de
  `socket.handshake.auth.token`. Nenhuma lógica de verificação nova é criada; se o helper HTTP
  exportar apenas uma classe/estratégia acoplada ao Passport, extrair (ou reaproveitar) a função
  pura de verificação de assinatura/expiração para uso fora do pipeline HTTP. Token
  ausente/inválido → `handleConnection` desconecta o socket imediatamente (sem entrar em
  nenhuma sala).
- **Autorização de `board:join` por `BoardMember`**: ao receber `board:join {boardId}`, o
  gateway consulta `BoardMemberRepository` (ou Prisma diretamente, se for o único consumidor)
  por `(boardId, userId)` — `userId` vem do token verificado no handshake, nunca do payload do
  evento. Não é membro → emite evento de erro (`board:error` com código, ex.:
  `{ event: 'board:join', code: 'board.member.forbidden' }`) e não entra na sala. É membro →
  `socket.join('board:' + boardId)` e atualiza a presença.
- **Presença em memória**: um `Map<boardId, Map<socketId, { id, name }>>` (ou estrutura
  equivalente) mantido no próprio gateway ou em um serviço `PresenceTracker` injetável. A cada
  `board:join` bem-sucedido, `board:leave` ou `handleDisconnect`, recalcula a lista de usuários
  únicos da sala e emite `presence.update {boardId, users}` para todos os sockets da sala
  (dedup por `userId`, já que um mesmo usuário pode ter múltiplas abas/sockets).
- **`RealtimeEmitter` como porta simples**: interface com um único método
  (`emitToBoard(boardId: string, event: string, payload: unknown): void`), implementada por uma
  classe concreta que recebe o `Server` do gateway (via `@WebSocketServer()`) e chama
  `server.to('board:' + boardId).emit(event, payload)`. Registrada como provider no
  `BoardModule` e **exportada** para que os controllers das changes `007`/`008`/`010`/`011`
  injetem `RealtimeEmitter` sem importar o gateway diretamente. Skill usada:
  [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation)
  para a implementação concreta + registro no módulo.
- **Gateway escrito diretamente, sem skill dedicada**: não existe no catálogo uma skill
  específica para gateways WebSocket do NestJS (as skills `backend-nest-*` cobrem
  controllers/config HTTP, não gateways). O `BoardGateway` (decorators `@WebSocketGateway`,
  `handleConnection`, `handleDisconnect`, `@SubscribeMessage`) é escrito diretamente seguindo a
  documentação oficial do NestJS Websockets, mantendo o mesmo estilo de injeção de dependências
  (construtor) e nomenclatura usados no resto do módulo `board`. Isso é um desvio documentado,
  não um erro de execução.
- **CORS do Socket.IO**: configurado no `@WebSocketGateway({ cors: { origin: <mesma origem do
  CORS_ORIGIN/NEXT_PUBLIC_API_URL usada no HTTP>, credentials: true } })`, evitando abrir `*`.
- **Catálogo de eventos**: esta change **define** o catálogo (`card.created`, `card.updated`,
  `card.moved`, `card.deleted`, `list.created`, `list.updated`, `list.moved`, `list.deleted`,
  `member.added`, `activity.created`, `presence.update`) como contrato documentado no
  `RealtimeEmitter`/porta, mas **só emite** `presence.update` — os demais são payload de nomes
  de eventos que as changes seguintes vão usar ao chamar `emitToBoard`.

## Risks / Trade-offs

- [Verificação JWT duplicada entre HTTP e WS divergir com o tempo] → Reaproveitar a mesma
  função/segredo (`JWT_SECRET`) em vez de reimplementar; se o helper HTTP não expuser a
  verificação de forma reutilizável, extrair a função pura primeiro em vez de duplicar lógica.
- [Cliente falsificar `boardId` em `board:join` para entrar em sala alheia] → Mitigado:
  autorização sempre consulta `BoardMember` com o `userId` do token verificado no servidor,
  nunca confia em dado enviado pelo cliente além do `boardId` a ser checado.
- [Presença em memória não sobrevive a múltiplas réplicas do backend] → Aceito para o padrão do
  template (1 réplica); adapter Redis é decisão futura se houver escala horizontal.
- [Múltiplos sockets do mesmo usuário (várias abas) inflar a lista de presença] → Dedup por
  `userId` ao montar `users` do `presence.update`.
- [Gateway sem skill dedicada divergir de convenções do módulo] → Seguir nomenclatura e estilo
  de injeção do restante de `modules/board`; registrar o desvio (sem skill) na evidência da
  task correspondente.
