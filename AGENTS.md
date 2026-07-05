# AGENTS.md — TaskBoard Live

> **Fonte única de instruções deste repositório** para qualquer agente de código
> (Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, OpenCode, Windsurf, Zed…).
> `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/` e
> `.windsurf/rules/` são **apenas ponteiros para cá**. Edite sempre AQUI.

## O que é este repositório

**TaskBoard Live** — um quadro kanban colaborativo em tempo real (estilo Trello simplificado):
duas pessoas abrem o mesmo quadro e veem os cartões se moverem ao vivo. Next.js no front,
**Socket.IO** no back. O sistema é construído **uma change OpenSpec por vez, em contexto limpo**
(changes `000…013` em `changes-templates/`), com dois portões de qualidade por change — em trilhos
que mantêm cada change sob **~250k tokens** e sem alucinação, mesmo em modelos fracos.

## Stack (não invente alternativas)

- Monorepo: **Turborepo + npm workspaces** — use `npm`, nunca pnpm/yarn.
- Backend: **NestJS** em `apps/backend` (porta **4000**). **Tempo real: Socket.IO gateway**
  (`@nestjs/websockets` + `@nestjs/platform-socket.io`), salas `board:{id}` com handshake JWT.
- Frontend: **Next.js App Router + TypeScript** em `apps/frontend` (porta **3000**).
  Drag-and-drop com **`@hello-pangea/dnd`**; cliente **`socket.io-client`**.
- ORM/DB: **Prisma + PostgreSQL** · Testes: **Jest** (unit/integração) + **Playwright** (e2e).
- Arquitetura: Clean Architecture + DDD. Regra de dependência: `domain` **não** importa de
  `application`/`infrastructure`/`interface`; casos de uso recebem *ports*, nunca Prisma concreto.
  Autorização é **por quadro** (`owner`/`member` em `BoardMember`) — sem multi-tenancy nem RBAC global.
- Processo: **OpenSpec** (spec-driven) + git + CI + gate.

## Domínio (modelo canônico)

- `User { id, name, email, password }` · `Board { id, name, ownerId, createdAt }`
- `BoardMember { id, boardId, userId, role: owner|member, unique(boardId,userId) }`
- `List { id, boardId, title, position }` (coluna) · `Card { id, listId, title, description?, position }`
- `Activity { id, boardId, actorId, type, data, createdAt }`
- **Contrato de tempo real** (definido na change `006`, consumido pelas demais): porta
  `RealtimeEmitter.emitToBoard(boardId, event, payload)` chamada **após** o caso de uso ter sucesso;
  eventos `card.*`, `list.*`, `member.added`, `activity.created`, `presence.update`.

## Mapa de pastas

```
AGENTS.md                  ← você está aqui (fonte única)
README.md / WORKFLOW.md    ← visão geral / guia operacional passo a passo
changes-templates/         ← os "trilhos": as changes OpenSpec do TaskBoard Live (000…013)
docs/                      ← auditoria, portabilidade, deploy Dokploy, segurança GitHub
.claude/
  agents/                  ← time hub-and-spoke (orquestrador + especialistas)
  commands/                ← /inicializar /orquestrar /analisar /portao
  skills/                  ← catálogo de skills (implementação principal das tasks)
.agents/skills             ← symlink → .claude/skills (compat cross-tool)
```

Após o bootstrap, o projeto ganha `openspec/` (project.md, specs/, changes/, shared/,
memory/, templates/, EXECUTION-LOG.md) e `apps/` + `modules/` + `packages/`.

## Como o sistema é construído (leia antes de tocar em qualquer change)

1. **Bootstrap (uma vez):** `/inicializar` — monorepo + git + OpenSpec + CI + cópia das changes
   de `changes-templates/` (`000…013`) para `openspec/changes/`.
2. **Loop por change (o coração):** para cada change, **em um chat/contexto NOVO**:
   - Abra **apenas** o que o *Contrato de leitura* no topo do `proposal.md` da change manda
     (orientação mínima do OpenSpec + a própria change + arquivos que o `design.md` citar).
   - Execute a `tasks.md` **na ordem**, task a task: ação exata → arquivo exato → comando →
     resultado esperado → verificação. Marque cada checkbox com evidência.
   - Feche: `/portao` verde → commit → `/openspec:archive` → **atualizar
     `openspec/EXECUTION-LOG.md`** → **zerar o chat** antes da próxima change.
3. **Memória entre resets:** `openspec/EXECUTION-LOG.md` é a única memória que sobrevive.
   Leia-o no início de toda sessão; atualize-o no fim de toda change.
4. **Dois portões por change:** `/analisar` (pré-build: artefatos + constituição) e
   `/portao` (pós-build: typecheck, testes, gate, scanners). Vermelho = **não avança**.
5. **Sequencial, nunca paralelo.** A ordem numérica das changes é a ordem topológica.

## Comandos exatos

```bash
npm install                      # instalar dependências (raiz do monorepo)
npm run dev                      # subir backend :4000 + frontend :3000
npx tsc --noEmit                 # typecheck (rodar em apps/backend E apps/frontend)
npm test                         # Jest de todos os workspaces
npm run test:e2e                 # Playwright (quando existir)
npm run build                    # build de produção via Turborepo
bash scripts/ci/gate.sh          # gate: lint + typecheck + test + build + scanners
openspec validate <id> --strict  # validar artefatos de uma change
```

## Contrato de contexto (inegociável)

- Orçamento **≤ 250k tokens por change**. Leia por peça; **nunca** carregue o repositório
  inteiro, outras changes ou `openspec/changes/archive/`.
- Sentiu falta de contexto? O defeito é do `design.md` da change — **pare e corrija o
  trilho**; não compense abrindo mais arquivos.
- Skills de `.claude/skills/` são a **implementação principal** das tasks: siga-as à risca;
  desvio só com registro na evidência do checkbox.

## Restrições críticas (violação = parar)

- **Segredos:** nunca commitar `.env`/credenciais em **nenhuma** branch; só `.env.example`
  é versionado. Não leia `.env*` nem `**/secrets/**`.
- **Gate/CI vermelho:** proibido mergear ou avançar de change.
- **Git:** 1 change = 1 branch (`change/<id>`) = 1 PR. Commits **Conventional Commits em
  português** com o *porquê* em 1–2 frases. Nada de force-push/reset --hard/deleção de
  branch sem confirmação humana explícita.
- **Deploy:** branch `producao` é a que o **Dokploy** observa; env real é injetado pelo
  painel do Dokploy, jamais pelo repo. Detalhes: `docs/deploy-dokploy.md`.
- **Idioma:** artefatos, documentação e commits em **português do Brasil**.

## Onde está o detalhe

| Preciso de… | Vá para |
|---|---|
| Passo a passo operacional | `WORKFLOW.md` |
| Trilho de execução (maestro) | `changes-templates/000-orquestracao-execucao/` |
| Time de agentes e handoffs | `.claude/agents/README.md` |
| Catálogo de skills | `.claude/skills/` (cada uma tem gatilhos na `description`) |
| Qual arquivo cada ferramenta lê | `docs/portabilidade.md` |
| Deploy e segurança | `docs/deploy-dokploy.md` · `docs/seguranca-github.md` |
