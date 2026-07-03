---
name: spec-flow
description: 'Fluxo de trabalho git/GitHub padrao para QUALQUER projeto: cria o repositorio (publico/privado), uma branch por change do OpenSpec, Conventional Commits em portugues ligados a change, gate (lint/typecheck/test/build/segredos) e subida ao main SOMENTE via Pull Request com CI verde. Usar sempre que iniciar/continuar uma change, commitar, abrir PR ou subir para o main. Nao usar para instalar a camada de processo num projeto novo (spec-init) nem para validar artefatos de uma change antes do build (spec-analyze).'
compatibility: claude-code, opencode
---

# Spec Flow

Fluxo único e repetível para todo projeto. Cuida da camada de
**git + GitHub + CI + gate de qualidade** ao redor do OpenSpec.

Divisão de responsabilidades (não confundir):
- **OpenSpec** = o *conteúdo*: `proposal.md`, `specs/`, `design.md`, `tasks.md`.
  Gerar/editar isso é trabalho dos comandos `/openspec:*` (`/openspec-propose`,
  `/openspec-apply-change`, `/openspec-archive-change` …). Esta skill **não** substitui isso.
- **Esta skill** = o *processo em volta*: criar repo, branch por change,
  commits corretos, gate de teste e merge seguro no main.

O encaixe central: no OpenSpec, uma change só é **arquivada** (deltas mesclados
em `openspec/specs/`, que é a fonte da verdade) depois de implementada e
verificada. O gate de teste desta skill mora exatamente nesse ponto.

---

## Princípios inegociáveis (a "sabedoria")

Estas regras valem SEMPRE e não devem ser quebradas "pra ir mais rápido":

1. **Nunca** faça merge no `main` com o gate vermelho (lint/typecheck/test/build
   falhando) ou com CI vermelho. Vermelho → pare, conserte, repita.
2. **Nunca** faça `push --force` no `main` nem reescreva o histórico do `main`.
3. **Nunca** commite segredos: `.env`, chaves, tokens, credenciais. Confira o
   diff antes de cada commit.
4. **Nunca** pule `openspec validate --strict` antes de abrir o PR.
5. **Sempre** 1 change do OpenSpec = 1 branch = 1 PR.
6. **Sempre** arquive a change (`openspec archive`) apenas quando o trabalho
   estiver validado e pronto pro merge (ver fluxo D).
7. **Confirme com o usuário** antes de qualquer ação irreversível ou pública:
   criar o repositório, abrir o PR e fazer o merge. Mostre o que vai acontecer
   e espere o "ok".
8. Em dúvida se uma mudança pode quebrar algo: **pare e pergunte** em vez de
   adivinhar.
9. **Antes de implementar** uma change, rode `/analisar` (skill `spec-analyze`).
   Nunca construa sobre artefatos inconsistentes nem sobre algo que viole a
   **Constituição** (`openspec/memory/constitution.md`) sem uma `## Constitution
   Exception` declarada na própria change.

---

## Pré-requisitos (1ª vez na máquina)

Confira rapidamente; se faltar algo, veja `references/setup.md`.

```bash
gh auth status          # GitHub CLI autenticado?
openspec --version      # OpenSpec instalado?
node -v                 # Node ≥ 22.11 (LTS)
```

---

## Passo 0 — Entender o contexto

Antes de agir, descubra em que ponto estamos:

```bash
git rev-parse --is-inside-work-tree 2>/dev/null   # já é um repo git?
git remote -v                                     # já tem origin no GitHub?
git branch --show-current                         # em que branch estamos?
ls openspec/changes 2>/dev/null                   # há changes do OpenSpec?
```

- Sem repo git / sem `origin` → **Fluxo A (projeto novo)**.
- Repo já existe e há (ou vamos criar) uma change → **Fluxo B**.
- Pronto pra subir → **Fluxo D**.

---

## Fluxo A — Projeto novo no GitHub (referência)

Criação do repositório (pergunta público/privado), branch `main` protegida, primeiro push e
vínculo com o OpenSpec — passo a passo completo com comandos `gh` em
[references/fluxos-a-d.md](references/fluxos-a-d.md). Não prossiga sem identidade git
configurada e `gh auth status` ok (pré-requisitos desta skill).

## Fluxo B — Trabalhar numa change (OpenSpec)

1. **Garanta que existe uma change.** Se não houver pasta em
   `openspec/changes/<id>/`, oriente o usuário a criar via OpenSpec primeiro
   (ex.: `/openspec-propose "<ideia>"`), que gera `proposal.md` → `specs/` →
   `design.md` → `tasks.md`. Não recrie isso na mão.

2. **Branch por change** (nome = id da change):
   ```bash
   git switch -c change/<change-id>   # ou: git switch change/<change-id> se já existe
   ```

3. **Análise pré-build** (`/analisar <change-id>`, skill `spec-analyze`): antes de implementar,
   confira a coerência cruzada dos artefatos (cobertura requirement↔task, design vs proposal,
   deltas vs `openspec/specs/`) e a conformidade com a **Constituição**
   (`openspec/memory/constitution.md`). É somente-leitura. **FAIL → pare e corrija a change**
   (ou declare a exceção na Constituição) antes de escrever código. É o portão *antes* do build;
   o gate do Fluxo D é o portão *depois*.

4. **Implemente as tasks** do `tasks.md` em ordem, marcando `[x]` conforme
   conclui (isto é o `/openspec-apply-change`). Trabalhe contra a spec — não invente
   funcionalidades fora do que foi proposto.

5. **Commits por unidade lógica** conforme avança (não acumule tudo em um
   commit gigante no fim). Formato e exemplos em `references/conventions.md`.
   Em resumo:
   ```
   <tipo>(<escopo>): <assunto no imperativo>

   <o quê e por quê — as "observações". Cite as tasks (T001, T002…).>

   OpenSpec-Change: <change-id>
   ```
   Antes de cada commit, confira o diff e **não** inclua segredos:
   ```bash
   git status
   git diff --cached --name-only
   ```

---

## Fluxo C — Commits corretos (referência rápida)

Detalhe completo em `references/conventions.md`. O essencial:
- Conventional Commits: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
  `test`, `build`, `ci`, `chore`, `revert`.
- Assunto curto, imperativo, minúsculo, sem ponto final.
- Corpo = as observações (o quê/por quê), com referência às tasks e à change.
- 1 ideia por commit.

---

## Fluxo D — Gate + subir pro main (o ponto crítico, referência)

Regra inegociável: **nada sobe pro `main` sem `bash scripts/ci/gate.sh` verde local + PR com
CI verde** — nunca push direto. Sequência completa (gate → push da branch → PR → aguardar CI →
merge → sync local → archive da change) com todos os comandos e tratamentos de falha em
[references/fluxos-a-d.md](references/fluxos-a-d.md).

## Comandos de referência (cola)

```bash
# Contexto
git remote -v ; git branch --show-current ; ls openspec/changes

# Nova change → branch
git switch -c change/<id>

# Validar + gate + arquivar
openspec validate <id> --strict
bash scripts/ci/gate.sh
openspec archive-change <id> --yes

# Subir
git push -u origin change/<id>
gh pr create --base main --title "<resumo>" --body-file BODY.md
gh pr checks --watch
gh pr merge --squash --delete-branch
git switch main && git pull
```

Leia conforme precisar:
- `references/conventions.md` — padrão de commit, branch e PR.
- `references/setup.md` — setup único da máquina e proteção do `main`.
- CI e gate são **canônicos na skill `spec-init`** (`../spec-init/assets/ci.yml` e `gate.sh`) —
  esta skill copia de lá; não manter cópia própria (evita drift, como o que já aconteceu).
