<!-- TEMPLATE — design da orquestracao por especialistas. Em geral nao precisa de edicao;
ajuste apenas exemplos de mudancas densas/leves ao seu projeto. Convenção: /openspec:*.
Time de agentes: `.claude/agents/`. -->

## Context

As mudancas (`001`–`...`) estao especificadas no padrao spec-driven (proposal/design/tasks/spec)
e ainda nao foram implementadas. Esta mudanca define **como** o Claude Code as executa: o modelo
de agentes (orquestrador + especialistas), a coordenacao, a ordem, o portao de qualidade e o
rastreio. Apoia-se no ferramental do projeto — o CLI `openspec`, os comandos `/openspec:*`, o time
em `.claude/agents/`, as skills em `.claude/skills/` e as regras em `openspec/shared/`.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Um modelo de execucao previsivel: orquestrador + especialista por disciplina, um por sub-passo.
- Ordem correta (topologica) e sequencial.
- Portao de qualidade unico entre cada mudanca.
- Briefing-padrao do especialista e condicoes de parada.
- Rastreio de progresso com evidencia.

**Non-Goals:**
- Implementar qualquer mudanca aqui — a 000 so conduz.
- Alterar specs das mudancas (se uma revelar problema de design, o especialista **pausa** e sugere ajuste).
- Substituir o CLI/comandos do projeto — a 000 os orquestra.
- Rodar todos os agentes de uma vez (isso fragmenta o contexto e queima token).

## Decisions

### 1. Modelo de delegacao: orquestrador + especialistas por disciplina
- **Orquestrador** (`.claude/agents/orchestrator-fullstack`, modelo opus): dono da `tasks.md`
  desta 000 (o ledger). Para cada mudanca, na ordem: le o estado, decide os sub-passos, **lanca o
  especialista certo** em cada um, ao retorno roda o **portao de qualidade**, faz `commit`, marca o
  checkbox com evidencia e segue. Nao implementa ele mesmo (exceto mudancas leves).
- **Especialistas** (contexto limpo, um por sub-passo):
  - `architecture-specialist` (opus) — bookend: design estrategico DDD no inicio, auditoria da
    regra de dependencia no fim.
  - `backend-specialist` (sonnet) — dominio, use-cases, providers, controllers, base Nest.
  - `database-specialist` (sonnet) — schema/migrations/repos Prisma.
  - `frontend-specialist` (sonnet) — telas, shell, formularios, auth no cliente.
  - `e2e-specialist` (sonnet) — fluxos ponta a ponta + gate.
  - `security-specialist` (opus) — modelagem de ameacas (STRIDE) e auditoria OWASP pre-merge.
  - `deploy-specialist` (sonnet) — provisao/publicacao VPS + CI.
  - `openspec-specialist` (sonnet) — cria/valida changes e convencoes.
- **Por que isolar contexto**: muitas mudancas nao cabem numa janela sem degradar a qualidade;
  cada especialista trabalha so com os 3–4 arquivos da sua mudanca + as skills citadas + a parte
  relevante do codigo. O contexto do orquestrador fica enxuto (so o ledger e os resumos curtos).

### 2. Coordenacao: hub-and-spoke por padrao
- **Padrao (subagentes)**: os especialistas **nao** conversam entre si — cada um devolve um resumo
  curto ao orquestrador, que e o **intermediario**. Se o `frontend` precisa de um endpoint, ele
  informa ao orquestrador, que repassa ao `backend` no proximo sub-passo.
- **Opcional (Agent Teams)**: para mudanca densa com forte interdependencia, habilitar
  `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` no `settings.json`/ambiente faz os mesmos arquivos de
  `.claude/agents/` virarem teammates que trocam mensagem por uma task list compartilhada.
  Experimental, com limitacoes (retomada de sessao, coordenacao, shutdown) — usar com criterio.

### 3. Granularidade por tamanho da mudanca (lanes)
- **Bookends** (`architecture`, `security`): rodam no inicio (design/ameacas) e no fim (auditoria),
  nao como builders paralelos.
- **Builders** (`backend`, `database`, `frontend`, `e2e`): constroem; numa mudanca densa, em
  sub-passos sequenciais (dominio → backend/banco → frontend → e2e).
- **Leves / so-leitura**: o orquestrador pode fazer inline, a criterio dele.

### 4. Execucao sequencial, nunca paralela
- A **ordem numerica e uma ordenacao topologica**: toda mudanca so depende de numeros menores.
- **Nao paralelizar**: varias mudancas tocam **arquivos compartilhados** (schema do Prisma,
  catalogo de permissoes no `shared`, i18n, stack de guards). Paralelizar arriscaria conflitos de
  escrita e estados inconsistentes.

### 5. Disparo inicial
- O projeto comeca acionando **apenas** o orquestrador a partir desta 000: o comando
  `/orquestrar` (ou `@orchestrator-fullstack`) na sessao principal. Ele le o ledger e dirige tudo;
  o humano nao dispara os especialistas a mao nem todos de uma vez.

### 6. Fluxo por mudanca
1. **Estado**: `openspec status --change "<mudanca>" --json` (e `openspec list --json` no inicio).
2. **Analise pre-build (orquestrador)**: `/analisar <mudanca>` (skill `spec-analyze`) — confere a
   coerencia cruzada dos artefatos (cobertura requirement↔task, design vs proposal, deltas vs
   `openspec/specs/`) e a conformidade com a **Constituicao** (`openspec/memory/constitution.md`).
   Somente-leitura. Se **FAIL** (qualquer BLOCKER), **nao delega o build** — corrige a change (ou
   declara a excecao na Constituicao) e roda de novo. (Comando `/analisar`.)
3. **Sub-passos (especialistas)**: o orquestrador lanca cada especialista necessario com o
   briefing-padrao (§8); cada um roda `/openspec:apply <mudanca>` na sua parte — le os `contextFiles`
   de `openspec instructions apply --change <mudanca> --json`, executa as tasks na ordem com a skill
   indicada e evidencia, roda `npx tsc --noEmit` e os testes da sua area — e devolve resultado curto.
4. **Portao de qualidade (orquestrador)**: Definition of Done (§7). Se falhar, **nao avanca** —
   devolve ao especialista ou pausa para o humano. (Comando `/portao`.)
5. **Arquivar/sincronizar**: `/openspec:archive <mudanca>` (e/ou `/openspec:sync`).
6. **Registrar**: `commit` do diff, marca o checkbox no ledger com evidencia, segue.

> **Dois portoes, momentos diferentes**: `/analisar` (passo 2) e **pre-build** — valida os
> *artefatos* da change antes de implementar; `/portao` (passo 4) e **pos-build** — valida o
> *codigo* (typecheck/testes/gate). Ambos travam o avanco quando vermelhos.

### 7. Definition of Done (portao de qualidade) — unico para todas
Uma mudanca so e concluida quando:
- `npx tsc --noEmit` passa em `apps/backend` **e** `apps/frontend`.
- Os **testes** da mudanca (unitarios, integracao e e2e quando aplicavel) passam.
- Os **cenarios do `spec`** estao satisfeitos (conferencia funcional/manual quando indicado).
- As **skills** indicadas foram usadas como implementacao principal (desvios na evidencia).
- `bash scripts/ci/gate.sh` verde e, quando houver risco, auditoria do `security-specialist` sem CRITICAL.
- **Todos os checkboxes** da `tasks.md` da mudanca marcados, cada um com evidencia.

### 8. Briefing-padrao do especialista
- **Papel**: qual especialista e o sub-passo (ex.: "backend da `007-estrutura-organizacional`").
- **Como obter contexto**: `openspec instructions apply --change "<mudanca>" --json`, ler **todos**
  os `contextFiles` (nao assumir nomes de arquivo).
- **Como executar**: seguir a `tasks.md` na ordem; usar a skill indicada como implementacao
  principal; marcar o checkbox e adicionar evidencia. Nunca remover tasks.
- **Convencoes**: `openspec/shared/regras-de-nomenclatura.md`, a **Constituicao**
  (`openspec/memory/constitution.md`, principios P1–Pn) e o contexto de `openspec/config.yaml`.
- **Escopo**: **so** este sub-passo desta mudanca; nao editar outras nem antecipar trabalho futuro.
- **Verificacao**: ao final, `npx tsc --noEmit` (sua area) e os testes; informar o resultado.
- **Retorno**: resumo curto — tasks concluidas, skills usadas, desvios, typecheck/testes,
  e o que outro especialista precisa saber (repassado pelo orquestrador).

### 9. Condicoes de parada / checkpoint
Pausa e pede orientacao quando: task ambigua; implementacao revela problema de design (sugere
atualizar o artefato, sem inventar); portao falha e a correcao nao e obvia; risco de conflito em
arquivo compartilhado. O orquestrador tambem **para** ao fim de cada mudanca se o humano pediu
checkpoint, e **sempre para** se o portao falhar.

### 10. Tiering de modelo
- **opus**: `orchestrator-fullstack`, `architecture-specialist`, `security-specialist` (raciocinio).
- **sonnet**: builders que seguem skill deterministica (`backend`, `database`, `frontend`, `e2e`,
  `deploy`, `openspec`). Reduz custo sem perder qualidade.

## Risks / Trade-offs

- [Especialista sem a memoria do orquestrador] → O briefing-padrao e explicito e auto-suficiente;
  o especialista reconstroi o contexto via `openspec instructions apply`.
- [Especialistas nao conversam entre si] → Coordenacao hub-and-spoke pelo orquestrador; para
  interdependencia forte, habilitar Agent Teams pontualmente.
- [Conflitos em arquivos compartilhados] → Execucao estritamente sequencial; o portao garante base
  estavel antes da proxima.
- [Mudanca densa estourar contexto] → Quebra em sub-passos (um especialista por passo).
- [Desvio silencioso de skill] → A DoD exige registro de desvio; o orquestrador confere no portao.
- [Muitos agentes de uma vez] → Proibido por design (§3/§4): so os necessarios, sequencial.
