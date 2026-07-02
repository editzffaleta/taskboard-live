# AGENTS.md — Template Fábrica Fullstack

> **Fonte única de instruções deste repositório** para qualquer agente de código
> (Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, OpenCode, Windsurf, Zed…).
> `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/` e
> `.windsurf/rules/` são **apenas ponteiros para cá**. Edite sempre AQUI.

## O que é este repositório

Template "fábrica fullstack": duplique a pasta, rode o bootstrap e o sistema é construído
**uma change OpenSpec por vez, em contexto limpo**, com dois portões de qualidade por change.
Foi projetado para que **qualquer modelo que saiba programar — inclusive modelos fracos —**
construa o sistema inteiro sem alucinar e **sem ultrapassar ~250k tokens por change**.

## Stack de referência (não invente alternativas)

- Monorepo: **Turborepo + npm workspaces** — use `npm`, nunca pnpm/yarn.
- Backend: **NestJS** em `apps/backend` (porta **4000**).
- Frontend: **Next.js App Router + TypeScript** em `apps/frontend` (porta **3000**).
- ORM/DB: **Prisma + PostgreSQL** · Testes: **Jest** (unit/integração) + **Playwright** (e2e).
- Arquitetura: Clean Architecture + DDD. Regra de dependência: `domain` **não** importa de
  `application`/`infrastructure`/`interface`; casos de uso recebem *ports*, nunca Prisma concreto.
- Processo: **OpenSpec** (spec-driven) + git + CI + gate.

## Mapa de pastas

```
AGENTS.md                  ← você está aqui (fonte única)
README.md / WORKFLOW.md    ← visão geral / guia operacional passo a passo
changes-templates/         ← os "trilhos": changes OpenSpec reaproveitáveis (000…010)
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

1. **Bootstrap (uma vez):** `/inicializar` — monorepo + git + OpenSpec + CI + cópia de
   `changes-templates/` para `openspec/changes/` + substituição de placeholders.
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
