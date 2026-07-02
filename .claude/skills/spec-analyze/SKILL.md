---
name: spec-analyze
description: >-
  Portão de consistência PRE-BUILD de uma change do OpenSpec — roda DEPOIS da
  proposta (proposal/design/tasks/specs prontos) e ANTES de qualquer
  implementação. Analisa, de forma somente-leitura, a coerência cruzada entre os
  artefatos (cobertura requirement↔task, design vs proposal, deltas
  ADDED/MODIFIED/REMOVED vs a fonte da verdade) e a conformidade com a
  Constituição do projeto (openspec/memory/constitution.md), além de ambiguidade
  e terminologia. Emite um relatório PASS/FAIL. Use SEMPRE que for começar a
  construir uma change, retomar uma change para implementar, ou revisar uma
  proposta antes de delegar aos especialistas — mesmo sem citar "analisar" ou
  "consistência". NÃO implementa, NÃO roda o gate de teste e NÃO arquiva (isso é
  do /portao e do spec-flow).
---

# Spec Analyze

O **portão pré-build**. O `/portao` é a Definition of Done **pós-build** (typecheck,
testes, gate, build); esta skill roda **antes** de uma linha de código, garantindo que
os artefatos da change estão coerentes entre si e com a Constituição. Pega problema de
spec **antes** de gastar token implementando.

Encaixe no fluxo: **propose → `/analisar` (esta) → build (especialistas) → `/portao` → archive**.
É o equivalente, no seu setup, ao passo "depois das tasks, antes do implement".

> **Somente-leitura.** Esta skill **não edita** arquivos, **não** roda `gate.sh`,
> **não** arquiva. Ela só lê, avalia e reporta. Quem corrige a change é o humano ou o
> `openspec-specialist`; quem constrói são os builders.

---

## Entradas

- **Obrigatória:** o id da change (ex.: `005-login-sessao`). Se nenhum for passado, use
  a change ativa / a primeira não concluída do ledger (`tasks.md` da `000`).

## Referências obrigatórias (ler antes de avaliar)

1. A change alvo: `proposal.md`, `design.md`, `tasks.md` e `specs/` (os deltas).
2. A **fonte da verdade**: `openspec/specs/` (o que já existe, para validar os deltas).
3. A **Constituição**: `openspec/memory/constitution.md` (os princípios P1–Pn).
4. Contexto e convenções: `openspec/memory/contexto-tecnico.md`, `openspec/memory/produto.md`
   (linguagem ubíqua) e `openspec/shared/regras-de-nomenclatura.md`.
5. O catálogo de skills (`.claude/skills/`) — para conferir que as skills citadas nas tasks existem.

---

## Workflow

### Passo 1 — Validação de schema (barata, primeiro)

```bash
openspec validate "<id>" --strict
```

Falhou → reporte os erros de formato e **PARE**. Sem schema válido não há análise semântica.

### Passo 2 — Análise cruzada (semântica)

Avalie os cinco eixos. Cada achado vira uma linha do relatório com severidade.

1. **Cobertura** — todo requirement/cenário do delta tem **≥1 task** que o entrega; toda
   task de feature rastreia a um requirement (sem task órfã). Toda task de feature tem a
   task de **teste** correspondente (P8).
2. **Consistência** — o `design.md` não contradiz o `proposal.md`; as `tasks.md` refletem
   o `design.md`; cada delta `MODIFIED`/`REMOVED` corresponde a algo que **existe** em
   `openspec/specs/`; cada `ADDED` **não duplica** requirement já existente; a skill citada
   em cada task **existe** no catálogo.
3. **Constituição** — confronte a change com cada princípio P1–Pn de
   `openspec/memory/constitution.md`. Violação **sem** uma seção `## Constitution Exception`
   no `design.md` = **BLOCKER**. Pontos típicos: dado de tenant sem `organizationId` (P5),
   `any`/DTO de entrada nas bordas (P4), `import` de `apps/` no domínio (P3), task sem teste
   (P8), valor sensível literal na change (P7), task sem skill (P2).
4. **Ambiguidade** — cenários sem GIVEN/WHEN/THEN completo; termos sem métrica ("rápido",
   "seguro", "performático") onde caberia número; `tasks.md` sem `Aceite:` explícito.
5. **Terminologia** — nomes de agregado/entidade/erro coerentes com a linguagem ubíqua de
   `memory/produto.md` e com `regras-de-nomenclatura.md`; sem requirement duplicado entre deltas.

### Passo 3 — Relatório

Tabela única, ordenada por severidade:

| Severidade | Local (arquivo · trecho) | Achado | Correção sugerida |
|---|---|---|---|
| BLOCKER / WARN / INFO | … | … | … |

Severidades:
- **BLOCKER** — impede o build (viola a Constituição sem exceção, requirement sem task,
  delta `MODIFIED` de algo inexistente, cenário ausente). FAIL.
- **WARN** — incoerência que deve ser resolvida, mas não trava por si só (skill inexistente,
  terminologia divergente, `Aceite:` vago).
- **INFO** — observação/risco a registrar.

**Veredito:** `FAIL` se houver **qualquer** BLOCKER; senão `PASS`. Em FAIL, **não delegue o
build** — corrija a change (ou ajuste a Constituição/declare a exceção) e rode de novo.

---

## Caso especial — change de processo (sem `specs/`)

A `000-orquestracao-execucao` é mudança de **processo** e **não tem `specs/`**. Para changes
assim: pule o eixo de **Cobertura requirement↔task** (não há requirement) e a checagem de
deltas, mas **mantenha** os eixos de Consistência (proposal↔design↔tasks), Constituição e
Ambiguidade. Trate a ausência de `specs/` como esperada, não como erro.

---

## Guardrails

- **Somente-leitura**: não edite nenhum arquivo, não rode `gate.sh`, não arquive, não commite.
- **Não duplica o `/portao`**: aqui é pré-build (artefatos); lá é pós-build (código/testes).
  Não rode typecheck/testes/build nesta skill.
- **Não invente requisito**: se algo está ambíguo, reporte como achado — não "resolva" por conta.
- **Não relaxe a Constituição**: um princípio só é dispensado via `## Constitution Exception`
  declarada na própria change; ignorá-lo aqui é BLOCKER.

## Saída esperada

- O resultado de `openspec validate --strict` (ou os erros de schema, se falhou).
- A tabela de achados (Severidade · Local · Achado · Correção).
- O veredito **PASS/FAIL** e, se PASS, a sinalização de que a change está pronta para o build.
