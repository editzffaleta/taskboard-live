# Ciclo de vida do sistema — fases mapeadas ao OpenSpec

Checklist do que um projeto gerado por este template produz em cada fase da vida do sistema,
com o artefato OpenSpec/do template correspondente. Serve de régua: se uma fase não tem o
artefato marcado, ela não terminou.

| # | Fase do sistema | Artefatos (fonte da verdade) | Feito quando |
|---|---|---|---|
| 1 | **Concepção** | `openspec/memory/produto.md`, `contexto-tecnico.md`, `estrutura.md` e a **`constitution.md`** (P1–P9 ajustados ao domínio) | memory preenchida; constituição revisada pelo humano |
| 2 | **Bootstrap** | monorepo + `spec-init` (git, CI, gate, hooks) + `spec-conventions` (shared/templates/`EXECUTION-LOG.md`) — via `/inicializar` | pré-condições do `/orquestrar` todas verdes |
| 3 | **Especificação** | changes em `openspec/changes/` (núcleo `000–010` copiado + changes de domínio no mesmo padrão), cada uma com **contrato de leitura**, `Aceite:`/`Pré:` e mockups condicionais | `openspec validate --all` limpo; placeholders substituídos |
| 4 | **Análise (pré-build)** | relatório PASS/FAIL do `/analisar` por change (coerência + constituição) | PASS sem BLOCKER antes de qualquer delegação |
| 5 | **Construção** | código por sub-passo de especialista (briefing/retorno em formato fixo), evidência por task no `tasks.md` | tasks 100% marcadas com evidência |
| 6 | **Portão (pós-build)** | `/portao`: typecheck ×2, testes, `openspec validate --strict`, `gate.sh` (lint/build + gitleaks/audit/semgrep/trivy) | tudo verde local **e** CI verde no PR |
| 7 | **Integração** | branch `change/<id>` → PR → `main` (squash), `openspec archive`, checkbox no ledger da `000`, linha no `EXECUTION-LOG.md`, **contexto zerado** | main atualizado; log com data+commit; sessão encerrada |
| 8 | **Entrega** | PR `main → producao`; Dokploy publica (Dockerfiles dos assets, env no painel, migrations no boot) | `/health` 200 público; login pela URL; backup agendado; webhook testado |
| 9 | **Operação** | runbook `docs/deploy-dokploy.md`; backups do PostgreSQL; triagem semanal do Dependabot; rotação de credencial em incidente | rotina registrada no `EXECUTION-LOG.md` |
| 10 | **Evolução** | novas changes (mesmo padrão, contrato de leitura, `/analisar` → build → `/portao`); constituição só muda com decisão humana explícita | ciclo 3→8 repetido por change |
| 11 | **Manutenção do template** | melhorias voltam PARA CÁ (skills/agents/commands/changes) — não ficam presas num projeto | commit no template + `docs/auditoria.md` atualizado se estrutural |

## Regras transversais (valem em toda fase)

- **Memória entre sessões** = `openspec/EXECUTION-LOG.md`. Toda sessão começa lendo-o; toda
  change termina escrevendo nele. Contexto de chat não é memória.
- **Orçamento de contexto**: uma change deve ser executável em ≤ ~250k tokens só com o que o
  contrato de leitura lista. Estourou = a change está densa demais → dividir por sufixo.
- **Segredos**: nunca no repo em nenhuma fase; `.env.example` versionado, produção no painel.
- **Sequencial, nunca paralelo**: da fase 5 em diante, uma change por vez, um especialista por
  sub-passo.
