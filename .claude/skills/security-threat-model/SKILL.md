---
name: security-threat-model
description: Conduz a modelagem de ameacas (STRIDE) de uma feature ANTES da geracao tatica, a partir do proposal/specs da change. Identifica ativos, atores, fluxos e fronteiras de confianca, levanta ameacas por categoria STRIDE e define mitigacoes mapeadas para as skills do catalogo (backend-authorization, shared-validation-rule, security-review). E uma analise de design defensiva: nao escreve exploit nem faz pentest.
compatibility: claude-code, opencode
---

# Security Threat Model (STRIDE)

Use esta skill **no inicio** de uma feature (apos `ddd-strategic-design`, antes de gerar codigo)
para levantar as ameacas e ja decidir as mitigacoes. E o par "ofensivo-defensivo no papel" do
`security-review`: aqui se pensa o que **pode** dar errado; la se confere o codigo pronto.

Esta skill **nao** escreve exploit, **nao** faz pentest e **nao** ataca sistemas. O produto e um
**threat model** (documento) com ameacas, severidade e mitigacao acionavel.

## Entradas obrigatorias

1. a change alvo: `proposal.md` + `specs/spec.md` (o que a feature faz)
2. contexto: dados sensiveis tocados, atores (papeis) e integracoes externas
3. o desenho de DDD/contextos (saida de `ddd-strategic-design`), quando houver

## Referencias obrigatorias

Antes de modelar, ler:

1. `proposal.md`/`specs/` da change e o context map (se houver)
2. `references/stride-guide.md` (as 6 categorias e o que perguntar em cada uma)
3. `references/threat-model.template.md` (formato de saida)
4. `references/mandatory-readings.md`

## Workflow deterministico

1. **Escopo**: descreva em 1-2 linhas o que a feature faz e os dados que toca.
2. **Decomponha**: liste **ativos** (dados/tokens/recursos), **atores** (papeis:
   `colaborador|lider|admin_org|super_admin` + anonimo + servico), **fluxos** (entradas →
   processamento → saida) e as **fronteiras de confianca** (browser↔API, API↔banco, API↔externo).
3. **Enumere ameacas por STRIDE** (ver `stride-guide.md`), uma passada por fronteira/fluxo:
   - **S**poofing — quem se passa por quem? (auth, sessao, JWT)
   - **T**ampering — quem altera dado/payload? (validacao, integridade)
   - **R**epudiation — falta de trilha? (log de eventos de seguranca)
   - **I**nformation disclosure — vazamento? (dado sensivel na resposta/log/erro)
   - **D**enial of service — exaustao? (rate limit, paginacao, upload)
   - **E**levation of privilege — escalada? (RBAC, ownership/escopo de tenant)
4. **Avalie**: cada ameaca recebe **severidade** (Critica/Alta/Media/Baixa) por
   impacto x probabilidade.
5. **Mitigue**: para cada ameaca, defina a contramedida e **aponte a skill** que a implementa
   (`backend-authorization` p/ authz e ownership; `shared-validation-rule`/`module-entity` p/
   integridade de entrada; `backend-nest-config` p/ erro/headers; `security-review` p/ conferir
   no fim). Ameacas aceitas (sem mitigar) ficam registradas como **risco aceito**, com motivo.
6. **Saida**: monte o documento com `references/threat-model.template.md`, ordenado por
   severidade, e gere o **conjunto de mitigacoes** que vira requisito nas tasks da change.

## Regras de qualidade

- Toda ameaca amarrada a um ativo/fluxo concreto da feature (nada generico).
- Severidade sempre justificada (impacto x probabilidade).
- Cada ameaca tem mitigacao acionavel **ou** e marcada como risco aceito com motivo.
- Multi-tenant: sempre checar escopo por `organizationId` (IDOR/cross-tenant) em I e E.
- Distinguir ameaca confirmada de hipotese (marcar "a validar").

## Guardrails

- Nao escrever exploit, payload ofensivo ou PoC.
- Nao fazer scanning/pentest de terceiros.
- Nao inventar ameaca sem ativo/fluxo correspondente.
- Nao incluir segredo real no documento (mascarar).
- Declarar o que ficou fora de escopo do modelo.

## Saida esperada

- threat model (markdown) com escopo, decomposicao (ativos/atores/fluxos/fronteiras),
  tabela de ameacas STRIDE com severidade e mitigacao (→ skill), e riscos aceitos
- lista de **mitigacoes** para virar tasks/criterios na change
- handoff para `security-review` confirmar as mitigacoes no codigo pronto
