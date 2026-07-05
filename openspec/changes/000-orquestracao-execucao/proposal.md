<!--
000-orquestracao-execucao — mudanca de PROCESSO, o "maestro" do TaskBoard Live.
Conduz a implementacao das changes 001..013 na ordem, com portao de qualidade entre cada uma.
Convenção de comandos: /openspec:* (apply/archive/sync). Time de agentes: ver `.claude/agents/`.
-->


> **CONTRATO DE LEITURA DO MAESTRO (orquestrador) — abra APENAS isto:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · esta 000 (`proposal.md`, `design.md`, `tasks.md` = o ledger).
> **NÃO ler** as changes de feature inteiras — o maestro conhece cada uma só pela linha do
> ledger; quem abre a change é o especialista do sub-passo, seguindo o contrato de leitura
> dela. **Ao concluir cada change do ledger:** `/portao` verde → `/openspec:archive` →
> commit → atualizar `openspec/EXECUTION-LOG.md` → **zerar o contexto** antes da próxima.

## Why

O TaskBoard Live tem mudancas especificadas (`001-...` … `013-...`), mas ainda nao ha codigo
(`apps/` nao existe). Executa-las a mao, na ordem certa e mantendo o contexto sob controle,
e trabalhoso e propenso a erro. Esta mudanca **000** e o maestro: o artefato entregue ao
Claude Code para que o **agente orquestrador** conduza a implementacao de ponta a ponta,
delegando cada passo ao **especialista certo**, respeitando as dependencias e um portao de
qualidade entre cada mudanca.

Esta e uma mudanca de **processo/orquestracao**, nao de capability: ela nao adiciona um
modulo nem um `specs/`. Seu produto e a forma de executar as outras.

## What Changes

- Definir o **modelo de delegacao por especialista**: um **orquestrador**
  (`.claude/agents/orchestrator-fullstack`) dono da sequencia, do portao de qualidade e do
  ledger; e **subagentes especialistas** (`backend`, `frontend`, `database`, `e2e`,
  `architecture`, `security`, `deploy`, `openspec`), cada um com contexto limpo, acionados
  **um por sub-passo**, na disciplina da sua competencia.
- Definir o **modelo de coordenacao**: por padrao **hub-and-spoke** — os especialistas
  reportam ao orquestrador (que e o intermediario) e **nao** conversam entre si. Comunicacao
  peer-to-peer real e opcional, via **Agent Teams** (experimental, env
  `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`), reservada a mudanca densa.
- Definir o **disparo inicial**: o projeto comeca acionando **apenas** o orquestrador a partir
  desta 000 (comando `/orquestrar`); ele dirige o resto sozinho, **sequencialmente** — nada de
  disparar todos os agentes de uma vez.
- Definir a **ordem de execucao** (ordem numerica = ordenacao topologica das dependencias),
  segura e **sequencial** (nunca paralela).
- Definir o **fluxo por mudanca**: o orquestrador escolhe os especialistas que a mudanca
  precisa, em sub-passos (arquitetura → backend/banco → frontend → e2e → seguranca);
  cada especialista executa as tasks com a skill indicada e devolve um **resultado curto** →
  **portao de qualidade** (orquestrador) → `/openspec:archive` → commit + ledger.
- Definir os **dois portoes**: **`/analisar`** (pre-build, skill `spec-analyze`) confere a
  coerencia cruzada dos artefatos e a conformidade com a **Constituicao**
  (`openspec/memory/constitution.md`) **antes** de delegar a implementacao; **`/portao`**
  (pos-build, Definition of Done) confere o codigo **depois**. Ambos travam o avanco quando vermelhos.
- Definir o **portao de qualidade** (Definition of Done) unico: typecheck limpo nos dois apps,
  testes passando, cenarios do `spec` satisfeitos, skills seguidas, gate verde e todos os
  checkboxes da `tasks.md` marcados com evidencia.
- Definir o **briefing-padrao do especialista**, as **condicoes de parada/checkpoint** e o
  **tiering de modelo** (opus para orquestracao/arquitetura/seguranca; sonnet para builders).
- Definir o **rastreio de progresso**: a `tasks.md` desta 000 e o ledger ordenado, com o
  formato de evidencia de `openspec/shared/como-executar.md`.

## Capabilities

### New Capabilities
<!-- Nenhuma. Esta e uma mudanca de processo/orquestracao; nao adiciona capability nem specs/. -->

### Modified Capabilities
<!-- Nenhuma. Esta mudanca governa a EXECUCAO das demais, sem modificar seus requisitos. -->

## Impact

- **Processo de build**: estabelece como o Claude Code implementa as mudancas (orquestrador +
  especialistas por disciplina, sequencial, com portao de qualidade entre cada uma).
- **Sem impacto de codigo proprio**: a 000 nao cria modulos nem entidades; quem cria sao as
  mudancas de feature que ela conduz.
- **Artefatos usados**: o time em `.claude/agents/`; as skills em `.claude/skills/` (incl.
  `spec-analyze`); o CLI `openspec` (`list`/`status`/`instructions apply`/`validate`); os comandos
  `/openspec:*`, `/orquestrar`, `/analisar` e `/portao` em `.claude/commands/`; a **Constituicao**
  (`openspec/memory/constitution.md`); contexto e evidencia de `openspec/config.yaml` e `openspec/shared/`.
- **Dependencias**: as mudancas ja especificadas; o ambiente (Node/monorepo) pronto para a
  `001` instalar a base.
- **Observacao**: por nao ter `specs/`, se o `openspec validate` for estrito quanto a mudancas
  sem spec, esta 000 pode ser tratada como documento de processo (ex.: `AGENTS.md`) em vez de
  mudanca rastreada — o conteudo e o mesmo.
