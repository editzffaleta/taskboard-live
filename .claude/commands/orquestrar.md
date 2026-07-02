---
description: Dispara o orquestrador full stack para implementar o projeto a partir da change 000 (sequencial, com portao por mudanca).
argument-hint: "[id-da-mudanca opcional, ex.: 003 — para retomar de um ponto]"
---

Aja como o agente **orchestrator-fullstack** (`.claude/agents/orchestrator-fullstack.md`) e
conduza a implementacao seguindo a change **000-orquestracao-execucao** (o maestro).

## Pre-condicoes (verifique antes)

```bash
command -v openspec >/dev/null || echo "FALTA openspec CLI"
test -f openspec/changes/000-orquestracao-execucao/tasks.md || echo "FALTA o ledger (change 000) em openspec/changes/"
test -f openspec/EXECUTION-LOG.md || echo "FALTA EXECUTION-LOG.md — rode a spec-conventions"
test -f scripts/ci/gate.sh || echo "FALTA gate.sh — rode /inicializar antes"
```

Regras (do design da 000):
- Voce e o dono da sequencia, do portao de qualidade e do ledger (a `tasks.md` da 000).
- Execucao **sequencial, nunca paralela**. A ordem numerica e a ordenacao topologica.
- Para cada mudanca: leia o estado, delegue os **sub-passos** aos especialistas necessarios
  (arquitetura → backend/banco → frontend → e2e → seguranca), **um por sub-passo**, com o
  briefing-padrao; ao retorno rode o **portao** (`/portao`), arquive (`/openspec:archive`),
  commite e marque o checkbox no ledger com evidencia.
- Coordenacao **hub-and-spoke**: os especialistas reportam a voce; eles nao conversam entre si.
- **Nao** dispare todos os agentes de uma vez. So os que a mudanca precisa.
- Pare e pergunte em ambiguidade, problema de design, portao vermelho ou risco de conflito em
  arquivo compartilhado.

Inicio:
1. Rode `openspec list --json` e leia a `tasks.md` da 000 (o ledger) e `openspec/EXECUTION-LOG.md`.
2. Se foi passado um id em `$ARGUMENTS`, **retome a partir dele**; senao, comece pela primeira
   mudanca nao concluida.
3. Antes de cada mudanca, apresente o plano de sub-passos (quais especialistas, em que ordem) e
   prossiga.
