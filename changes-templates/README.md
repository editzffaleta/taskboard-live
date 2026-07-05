# Changes do TaskBoard Live (kanban colaborativo em tempo real)

Especificação spec-driven completa do **TaskBoard Live** — um quadro kanban colaborativo estilo
Trello simplificado onde **duas pessoas abrem o mesmo quadro e veem os cartões se moverem ao vivo**
(React/Next.js no front + **Socket.IO** no back). Cada mudança está no **formato OpenSpec** (pasta
por mudança com `proposal.md` + `design.md` + `tasks.md` + `specs/spec.md` + `.openspec.yaml` +
`mockups/` **condicional**). Cada task tem **`Aceite:`** explícito, **`Pré:`** e guardrails inline
("não faça") para reduzir erro mesmo quando a execução roda em modelos mais baratos.

> **Este é um projeto concreto, não o template genérico.** Os placeholders já estão resolvidos:
> produto = **TaskBoard Live**, namespace npm = **`@taskboard`**. Sem multi-tenancy, sem RBAC
> global, sem MFA — a autorização é **por quadro** (papéis `owner`/`member` em `BoardMember`), que
> é o que o produto realmente precisa.

## Como o sistema é construído

1. **Bootstrap (uma vez):** `/inicializar` cria o monorepo + git + OpenSpec + CI e copia estas
   mudanças para `openspec/changes/`.
2. **Loop por mudança**, em contexto novo, na ordem numérica (ordem topológica das dependências):
   abra só o que o *Contrato de leitura* no topo do `proposal.md` mandar → execute a `tasks.md`
   task a task com evidência → `/portao` verde → commit → `/openspec:archive` → atualizar
   `openspec/EXECUTION-LOG.md` → **zerar o chat**.
3. **Maestro:** a mudança `000-orquestracao-execucao` conduz a sequência (comando `/orquestrar`).
   Seu `tasks.md` é o **ledger** ordenado.

## Mapa das mudanças

### Fundação (base + autenticação)

- `000` orquestração/execução (maestro, sem `specs/`)
- `001` base do projeto (monorepo Turbo, Prisma, pacote shared, erros+JWT, shell, i18n)
- `002` design system + shell (tokens claro/escuro, marca, navegação)
- `003` registro de usuário (módulo `auth`, agregado `user`, bcrypt, `POST /auth/register`, `/join`)
- `004` login/sessão (JWT `{ sub, name, email }`, `AuthContext`/`AuthGuard`, cookie, rotas privadas)

### Domínio do kanban em tempo real (o coração)

- `005` quadros — módulo `board`, agregados `board` + `membership`; CRUD, "meus quadros", owner
  nasce como membro; acesso via `BoardMember`
- `006` tempo real — **Socket.IO gateway**: `BoardGateway`, handshake JWT, salas `board:{id}` com
  autorização por membro, presença, e a porta `RealtimeEmitter`
- `007` listas/colunas — agregado `list`: criar/renomear/excluir/reordenar; emite `list.*`
- `008` cartões — agregado `card`: criar/editar/excluir/mover entre colunas; emite `card.*`
  (incl. `card.moved`)
- `009` quadro ao vivo (**vitrine**) — página `/boards/[id]` com drag-and-drop (`@hello-pangea/dnd`),
  cliente `socket.io-client`, update otimista + reconciliação ao vivo, presença
- `010` compartilhamento/membros — adicionar/remover membros por e-mail (só owner); emite `member.added`
- `011` atividade do quadro — agregado `activity` + `ActivityRecorder`; feed paginado + entradas ao vivo

### Extensões (opcionais, recomendadas para produção)

- `012` hardening HTTP — helmet, CORS explícito (HTTP + Socket.IO), rate limit em `login`/`register`
- `013` fundação e2e — Playwright + smoke de auth + **spec vitrine**: dois navegadores no mesmo
  quadro, um move um cartão e o outro vê ao vivo

## Contrato de tempo real (Socket.IO)

Definido na `006` e consumido pelas demais:

- Sala por quadro: **`board:{boardId}`**. Handshake com JWT em `socket.handshake.auth.token` (mesmo
  segredo/helper do HTTP). O cliente entra emitindo `board:join {boardId}`; o gateway confere que o
  usuário é **membro** (`BoardMember`) antes de entrar na sala.
- Porta **`RealtimeEmitter.emitToBoard(boardId, event, payload)`** — os controllers chamam **após** o
  caso de uso ter sucesso, para transmitir à sala.
- Eventos servidor→clientes: `card.created`, `card.updated`, `card.moved`
  `{cardId, fromListId, toListId, position}`, `card.deleted`, `list.created`, `list.updated`,
  `list.moved`, `list.deleted`, `member.added`, `activity.created`, `presence.update`
  `{boardId, users:[{id,name}]}`.

## Modelo de dados

```
User        { id, name, email, password }
Board       { id, name, ownerId → User, createdAt }
BoardMember { id, boardId → Board, userId → User, role: owner|member, unique(boardId,userId) }
List        { id, boardId → Board, title, position, createdAt }        // coluna do kanban
Card        { id, listId → List, title, description?, position, createdAt }
Activity    { id, boardId → Board, actorId → User, type, data (json), createdAt }
```

## Convenções

- Comandos: `/openspec:*` (apply/archive/sync). A `000` é mudança de **processo** (sem `specs/`).
- **Contrato de leitura**: todo `proposal.md` abre com o bloco do contrato — a lista fechada do que
  o executor pode abrir (defesa contra estouro de contexto ~250k tokens/change e alucinação).
- Cada feature referencia as skills do catálogo (`config-*`, `module-*`, `backend-*`, `frontend-*`)
  como implementação principal das tasks.
