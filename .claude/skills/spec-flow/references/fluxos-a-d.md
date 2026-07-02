# spec-flow — Fluxo A (projeto novo no GitHub) e Fluxo D (gate + subir pro main)

> Extraído do corpo da skill (progressive disclosure). O SKILL.md carrega princípios,
> o passo 0, os fluxos B/C e a cola; aqui vivem os dois fluxos longos, na íntegra.

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
   cp "<SKILL_DIR>/../spec-init/assets/ci.yml"  .github/workflows/ci.yml
   cp "<SKILL_DIR>/../spec-init/assets/gate.sh" scripts/ci/gate.sh
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

