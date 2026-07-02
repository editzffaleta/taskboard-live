---
description: Roda o portao de consistencia PRE-BUILD de uma change (coerencia entre proposal/design/tasks/specs + conformidade com a Constituicao) antes de delegar a implementacao.
argument-hint: "[id-da-mudanca, ex.: 005-login-sessao]"
allowed-tools: Bash(openspec validate *), Bash(openspec list *), Bash(openspec status *), Read, Glob, Grep
---

Rode a **analise de consistencia pre-build** da skill **`spec-analyze`** para a mudanca
`$ARGUMENTS`. E o passo **depois da proposta, antes do build** — o complemento do `/portao`
(que e pos-build). **Somente-leitura:** nao edite, nao rode o gate, nao arquive.

Se nenhum id vier em `$ARGUMENTS`, use a change ativa / a primeira nao concluida do ledger
(`tasks.md` da `000`).

Leia antes de avaliar: a change (`proposal.md`, `design.md`, `tasks.md`, `specs/`), a fonte da
verdade (`openspec/specs/`), a **Constituicao** (`openspec/memory/constitution.md`) e as
convencoes (`openspec/memory/contexto-tecnico.md`, `openspec/shared/regras-de-nomenclatura.md`).

Checklist (a skill tem o detalhe):
1. `openspec validate "$ARGUMENTS" --strict` — se falhar, reporte e **PARE**.
2. **Cobertura** — todo requirement tem >=1 task; toda task de feature tem teste correspondente; sem task orfa.
3. **Consistencia** — design nao contradiz a proposal; tasks refletem o design; cada `MODIFIED`/`REMOVED`
   existe em `openspec/specs/`; cada `ADDED` nao duplica; a skill citada em cada task existe no catalogo.
4. **Constituicao** — confronte os principios P1–Pn; violacao sem `## Constitution Exception` no `design.md` = **BLOCKER**.
5. **Ambiguidade** — cenarios sem GIVEN/WHEN/THEN; termos sem metrica; `tasks.md` sem `Aceite:`.
6. **Terminologia** — nomes coerentes com a linguagem ubiqua (`memory/produto.md`) e as regras de nomenclatura.

> Change de **processo** (ex.: `000`, sem `specs/`): pule Cobertura e deltas; mantenha Consistencia, Constituicao e Ambiguidade.

Saida: tabela `Severidade | Local | Achado | Correcao` (BLOCKER/WARN/INFO) + veredito **PASS/FAIL**.
**FAIL** se houver qualquer BLOCKER → **nao delegue o build**: corrija a change (ou declare a excecao na
Constituicao) e rode de novo. **PASS** → a change esta pronta para os especialistas construirem.
