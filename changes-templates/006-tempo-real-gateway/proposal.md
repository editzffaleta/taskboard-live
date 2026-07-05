> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/tempo-real/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O TaskBoard Live é um quadro kanban colaborativo em tempo real: sem um canal de eventos
servidor→clientes, mudanças feitas por um membro do quadro nunca chegam aos outros membros
conectados. Esta change constrói a infraestrutura de tempo real — o gateway Socket.IO, a
autorização de entrada em sala por associação ao quadro (`BoardMember`), o rastreamento de
presença e a porta `RealtimeEmitter` — para que as changes seguintes (listas, cartões,
compartilhamento, atividade) apenas chamem o emitter após seus casos de uso terem sucesso, sem
reimplementar handshake, salas ou autorização.

## What Changes

- Instalar `@nestjs/websockets`, `@nestjs/platform-socket.io` e `socket.io` no backend.
- Criar `BoardGateway` em `apps/backend/src/modules/board/realtime/`, com sala por quadro no
  formato `board:{boardId}`.
- Handshake autenticado: o gateway lê `socket.handshake.auth.token`, valida com o **mesmo**
  helper/segredo JWT do HTTP (`jwt.util`/`JWT_SECRET` da `004`); token ausente ou inválido
  recusa a conexão.
- Evento `board:join {boardId}`: o gateway confere que o `userId` do socket é `BoardMember` do
  quadro **antes** de entrar na sala; nega com evento de erro se não for. Evento `board:leave
  {boardId}` e desconexão removem o socket da sala.
- Presença: o gateway mantém em memória quem está em cada sala e emite `presence.update
  {boardId, users:[{id, name}]}` a cada entrada/saída.
- Porta `RealtimeEmitter` (interface) com `emitToBoard(boardId, event, payload)`, implementada
  sobre o gateway e registrada/exportada pelo `BoardModule` para os controllers das changes
  seguintes (`007`, `008`, `010`, `011`) injetarem e chamarem após seus casos de uso.
- Configurar CORS do Socket.IO a partir da env do frontend (mesma origem usada no HTTP).
- Testes de integração do gateway: conexão sem token recusada; `board:join` sem ser membro
  negado; `board:join` como membro entra na sala e recebe `presence.update`.
- **Sem cliente frontend** (é escopo da `009`) e **sem emissão de eventos de domínio**
  (`card.*`, `list.*`, `member.*`, `activity.*` são emitidos pelas changes donas de cada
  recurso, não por esta).

## Capabilities

### New Capabilities
- `tempo-real`: infraestrutura de tempo real do TaskBoard Live — gateway Socket.IO com sala por
  quadro, handshake JWT, autorização de entrada por `BoardMember`, rastreamento de presença com
  `presence.update`, e a porta `RealtimeEmitter` para emissão de eventos de domínio pelas
  changes consumidoras.

### Modified Capabilities
<!-- Nenhuma: changes anteriores (004, 005) não são alteradas; apenas consumidas. -->

## Impact

- **Backend**: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`; novo diretório
  `apps/backend/src/modules/board/realtime/` (`board.gateway.ts`, guard de handshake,
  rastreamento de presença, `realtime-emitter.provider.ts`); `BoardModule` passa a registrar e
  exportar `RealtimeEmitter`; env `CORS_ORIGIN`/`NEXT_PUBLIC_API_URL` reaproveitada para o CORS
  do Socket.IO.
- **Frontend**: nenhum código — o cliente Socket.IO é escopo da `009`.
- **Domínio**: intocado — o gateway e o emitter vivem na camada de infraestrutura/interface do
  módulo `board`, sem entrar em `domain`/`application`.
- **Dependências**: `004` (JWT), `005` (`BoardMember`, autorização por quadro).
- **Habilita**: `007` (listas), `008` (cartões), `009` (UI ao vivo), `010`
  (compartilhamento/membros) e `011` (atividade) emitirem eventos em tempo real via
  `RealtimeEmitter` sem reimplementar sala, autorização ou presença.
