# Threat Model — <feature / change>

> Gerado pela skill `security-threat-model` (STRIDE). Defensivo, sem exploit.

## 1. Escopo
- **Feature:** <1-2 linhas do que faz>
- **Change:** `<NNN-nome>`
- **Dados sensiveis tocados:** <ex.: senha, PII, token>
- **Fora de escopo:** <o que este modelo nao cobre>

## 2. Decomposicao
- **Ativos:** <dados/tokens/recursos a proteger>
- **Atores:** <anonimo, colaborador, lider, admin_org, super_admin, servico>
- **Fluxos:** <entrada → processamento → saida>
- **Fronteiras de confianca:** <browser↔API, API↔banco, API↔externo>

## 3. Ameacas (STRIDE)

| # | Categoria | Ameaca (ativo/fluxo) | Severidade | Mitigacao | Skill |
|---|-----------|----------------------|------------|-----------|-------|
| 1 | E (privilege) | <ex.: ler recurso de outra org (IDOR)> | Critica | escopo por organizationId no use-case | `backend-authorization` |
| 2 | T (tampering) | <ex.: role vindo do body> | Alta | derivar role do token; DTO explicito | `shared-validation-rule` |
| 3 | I (disclosure) | <ex.: hash de senha na resposta> | Alta | serializar saida | `backend-nest-config` |
| … |  |  |  |  |  |

## 4. Riscos aceitos
- <ameaca> — **motivo** do aceite + reavaliar quando <condicao>.

## 5. Mitigacoes -> tasks da change
- [ ] <mitigacao 1> (skill: `<...>`)
- [ ] <mitigacao 2> (skill: `<...>`)

## 6. Handoff
- Conferir as mitigacoes no codigo pronto com `security-review` antes do merge.
