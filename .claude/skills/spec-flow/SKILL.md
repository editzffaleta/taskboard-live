---
name: spec-flow
description: >-
  Fluxo de trabalho padrão para QUALQUER projeto (sistema ou site):
  cria o repositório no GitHub perguntando público ou privado, organiza o
  trabalho em uma branch por mudança do OpenSpec, faz commits no padrão
  Conventional Commits ligados à change, valida com lint/typecheck/test/build,
  e só sobe pro main via Pull Request com CI verde — nunca quebrando o main.
  Use esta skill SEMPRE que o usuário for iniciar um projeto novo, criar um
  repositório no GitHub, começar ou continuar uma change do OpenSpec, fazer
  commits, abrir um PR, ou subir/mergear algo no main — mesmo que ele não cite
  explicitamente "OpenSpec", "commit", "deploy" ou "GitHub".
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
node -v                 # Node ≥ 20.19
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

## Fluxo A — Projeto novo no GitHub

> **Substituído.** No setup atual, projeto novo é: `config-project-fullstack`
> (scaffold do monorepo) → `spec-init` (OpenSpec + CI + git + repo). Use este
> Fluxo A só como fallback manual quando não estiver usando aquelas skills.

1. **Pergunte e CONFIRME** antes de criar (esta é a parte "ele tem que me
   perguntar"):
   - Nome do repositório.
   - Dono: conta pessoal **ou** uma organização.
   - Visibilidade: **público** ou **privado**.
   - Descrição curta.
   - Já existe código/boilerplate na pasta, ou começa do zero?

   Mostre um resumo (`dono/nome`, visibilidade, descrição) e só prossiga com o
   "ok".

2. Inicialize o git local (se ainda não for repo), já com `main` como default:
   ```bash
   git init -b main
   ```

3. Garanta a higiene básica (sem sobrescrever o que o usuário já trouxe):
   - `.gitignore` com pelo menos: `node_modules`, `.env*`, `dist`, `.next`,
     `build`, `coverage`, `.turbo`.
   - `README.md` mínimo.
   - `LICENSE` se for público.

4. Inicialize o OpenSpec (cria `openspec/project.md` + estrutura):
   ```bash
   openspec init
   ```

5. **Adicione os arquivos do gate/CI** (copie os templates desta skill para o
   repo — caminhos relativos ao diretório da skill, disponível em runtime):
   ```bash
   mkdir -p .github/workflows scripts/ci
   cp "<SKILL_DIR>/assets/ci.yml"   .github/workflows/ci.yml
   cp "<SKILL_DIR>/assets/gate.sh"  scripts/ci/gate.sh
   chmod +x scripts/ci/gate.sh
   ```
   > `<SKILL_DIR>` é o diretório base desta skill, fornecido automaticamente
   > quando ela é invocada.

6. Commit inicial e criação do repo remoto + push (CONFIRME antes):
   ```bash
   git add -A
   git commit -m "chore: bootstrap do projeto"
   gh repo create <dono>/<nome> --<publico|privado> --source=. --remote=origin --push
   ```

7. **Proteja o `main`** (best-effort; não é fatal se falhar por plano/permissão).
   Isso é o que torna "não quebrar o main" uma regra da plataforma, não só uma
   promessa. Comando completo em `references/setup.md`; em resumo: exigir PR e
   o check `validate` verde para mergear.

8. Confirme a URL do repositório pro usuário.

Depois disso, siga pro Fluxo B para começar a primeira mudança.

---

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

## Fluxo D — Gate + subir pro main (o ponto crítico)

Faça **nesta ordem**. Qualquer vermelho interrompe o fluxo.

1. **Valide a spec da change:**
   ```bash
   openspec validate <change-id> --strict
   ```
   Falhou → corrija o conteúdo da change e repita.

2. **Rode o gate localmente** (mesmo conjunto de checks que o CI vai rodar —
   roda só os scripts que existem no `package.json`):
   ```bash
   bash scripts/ci/gate.sh
   ```
   Vermelho → **pare**, mostre o erro, conserte, e rode de novo. Não avance.

3. **Confira ausência de segredos** no que será enviado:
   ```bash
   git diff origin/main...HEAD --name-only
   ```
   Veja se não há `.env`, chaves ou credenciais. Se houver, remova e ajuste o
   `.gitignore` antes de seguir.

4. **Commit final + arquive a change na própria branch** (assim o merge já leva
   as specs atualizadas pro `main` num PR só — sem push direto no `main`):
   ```bash
   git add -A && git commit -m "feat(<escopo>): <resumo>"   # se sobrou trabalho
   openspec archive-change <change-id> --yes                        # mescla deltas em specs/ e move p/ archive/
   git add -A && git commit -m "chore(openspec): arquiva change <change-id>"
   ```
   > Alternativa (se preferir verificar em produção antes de arquivar): mergeie
   > primeiro e faça o `openspec archive-change` num PR pequeno depois. Padrão aqui é
   > arquivar no mesmo PR.

5. **Push da branch:**
   ```bash
   git push -u origin change/<change-id>
   ```

6. **Abra o PR** (CONFIRME antes). Título = resumo do `proposal.md`; corpo =
   Por quê / O quê / Impacto (do proposal) + checklist das tasks + a linha
   `Validado local: lint/typecheck/test/build ✅`:
   ```bash
   gh pr create --base main --title "<resumo>" --body-file <arquivo-de-corpo>
   ```

7. **Espere o CI ficar verde** (é o gate de verdade):
   ```bash
   gh pr checks --watch
   ```
   Vermelho → conserte, commite, dê push de novo, repita. **Nunca** mergeie
   vermelho.

8. **(Opcional) revisão da Calie**, se combinado para esta change.

9. **Merge** (CONFIRME antes):
   ```bash
   gh pr merge --squash --delete-branch
   ```

10. **Atualize o `main` local:**
    ```bash
    git switch main && git pull
    ```

Pronto: o main só recebeu código validado, as specs estão sincronizadas, e a
change está arquivada como histórico.

---

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
- `assets/ci.yml` — workflow de CI copiado pra cada repo.
- `assets/gate.sh` — runner do gate (local e CI).
