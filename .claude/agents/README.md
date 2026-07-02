# `.claude/agents/` — time de agentes

Papéis reutilizáveis (subagentes hoje; teammates de Agent Team quando habilitar).
Cada arquivo é um system prompt com frontmatter (`name`, `description`, `tools`, `model`).

## Roster

| Agente | Lane | Modelo | Skills principais |
|---|---|---|---|
| `orchestrator-fullstack` | maestro | opus | WORKFLOW, change 000, `spec-analyze`, `spec-flow` |
| `architecture-specialist` | bookend (design + auditoria) | opus | `ddd-strategic-design`, `config-project-fullstack`, `config-package-shared` |
| `backend-specialist` | builder | sonnet | `config-new-module`, `module-*`, `backend-*`, `spec-backend-auth-basic` |
| `database-specialist` | builder | sonnet | `config-prisma`, `backend-prisma-sync-module`, `backend-prisma-repository` |
| `frontend-specialist` | builder | sonnet | `frontend-next-config`, `spec-frontend-auth`, `config-new-module` |
| `e2e-specialist` | builder/gate | sonnet | `spec-flow` (Playwright — sem skill dedicada ainda) |
| `security-specialist` | reviewer (pré-merge) | opus | `security-review`, `backend-authorization`, `shared-validation-rule` |
| `deploy-specialist` | entrega | sonnet | `deploy-dokploy`, `spec-init`, `spec-flow` |
| `openspec-specialist` | processo | sonnet | `spec-init`, `spec-conventions`, `spec-analyze`, `spec-flow` |

## Como eles se coordenam (leia isto)

Subagentes **não falam entre si** — cada um reporta um resumo ao `orchestrator-fullstack`, que é o
intermediário (hub-and-spoke). O fluxo, por change, é o da `000-orquestracao-execucao`:

```
orchestrator → /analisar (consistência pré-build) ┐
            → architecture (design)                │
            → backend / database (build)           │ sub-passos sequenciais,
            → frontend (build)                     │ um especialista por passo
            → e2e (gate)                           │
            → security (auditoria pré-merge)       ┘
            → portão de qualidade → /openspec:archive → commit → ledger
```

Para change densa, o orquestrador quebra em sub-passos (domínio → backend → frontend → verificação),
um especialista por passo — nunca os 9 de uma vez (isso fragmenta o contexto do orquestrador e queima token).

## Handoff (formato fixo)

O contrato de comunicação é padronizado nos dois sentidos — **campos nomeados, sem prosa livre**:

- **Briefing (orquestrador → especialista):** Change · Sub-passo/escopo · Contexto (via
  `openspec instructions apply` + CONTRATO DE LEITURA do proposal) · Tasks · Skills ·
  Restrições · Critério de pronto · Formato do retorno. Template completo no
  `orchestrator-fullstack.md` (passo 4).
- **Retorno (especialista → orquestrador):** builders devolvem
  `Status / Tasks / Skills usadas / Verificações / Arquivos tocados / Pendências`;
  reviewers (`architecture`, `security`) devolvem
  `Status / Achados (com arquivo:linha) / Bloqueia merge? / Verificações / Pendências`.
  O bloco exato está no fim de cada especialista ("Retorno obrigatório").

Retorno fora do formato ou com `Status: BLOQUEADO` interrompe o fluxo até o orquestrador tratar.

## Quer comunicação peer-to-peer de verdade?

É o **Agent Teams** (experimental, desligado por padrão). Habilite com a env
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` no `settings.json` ou no ambiente. Aí os mesmos arquivos
deste diretório passam a ser "teammates" que trocam mensagem por uma task list compartilhada.
Tem limitações conhecidas (retomada de sessão, coordenação, shutdown) — vale para change grande,
não para o dia a dia.

## Invocação

- Automática: o Claude delega pelo `description` de cada agente.
- Explícita: `@orchestrator-fullstack` (ou `@backend-specialist`, etc.), ou `claude --agent <nome>`.
