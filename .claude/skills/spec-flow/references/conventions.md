# Convenções — commits, branch e PR

## Branch

Uma branch por change do OpenSpec, nomeada pelo id da change:

```
change/<change-id>
```

Exemplos: `change/add-logout-button`, `change/cofre-credenciais-aes`.

`main` é protegido: nunca se commita direto nele nem se faz `push --force`.

---

## Commit (Conventional Commits)

Formato:

```
<tipo>(<escopo>): <assunto>

<corpo: as observações — o quê e por quê>

OpenSpec-Change: <change-id>
```

### Tipos
- `feat` — nova funcionalidade
- `fix` — correção de bug
- `docs` — documentação
- `style` — formatação, sem mudança de lógica
- `refactor` — refatoração sem mudar comportamento
- `perf` — melhoria de performance
- `test` — testes
- `build` — build, dependências, empacotamento
- `ci` — pipeline de CI
- `chore` — tarefas auxiliares (bootstrap, archive, etc.)
- `revert` — reverte um commit anterior

### Regras do assunto
- Imperativo ("adiciona", não "adicionado"/"adicionando").
- Minúsculo, sem ponto final.
- Curto (≈ até 72 caracteres).
- `escopo` é opcional: o módulo/área afetada (`auth`, `cofre`, `ui`, `api`…).

### Corpo = as "observações"
- Explique **o quê** mudou e **por quê** — não o "como" (o código já mostra o como).
- Cite as tasks concluídas do `tasks.md` (T001, T002…).
- O trailer `OpenSpec-Change: <change-id>` liga o commit à change (rastreável).

### Granularidade
- 1 ideia por commit.
- Commite ao concluir uma task ou um grupo coeso de tasks — não acumule tudo
  num commit gigante no fim.

### Exemplos

```
feat(auth): adiciona logout com limpeza de sessão

Implementa o botão de logout no header e o clear da sessão no servidor.
Conclui T001 (botão), T002 (clear de sessão) e T003 (diálogo de confirmação).

OpenSpec-Change: add-logout-button
```

```
fix(api): trata payload vazio no webhook de eventos

O webhook quebrava com 500 quando o corpo vinha vazio; agora responde 204.
Conclui T004.

OpenSpec-Change: hardening-webhooks
```

---

## Nunca commitar
- Segredos: `.env*`, chaves, tokens, credenciais.
- `node_modules`, `dist`, `.next`, `build`, `coverage`, `.turbo`.
- Arquivos grandes/binários que não pertencem ao repo.

Confira sempre antes:
```bash
git status
git diff --cached --name-only
```

---

## Pull Request

- **Título**: o resumo do `proposal.md` da change.
- **Corpo**, montado a partir do `proposal.md`:
  - **Por quê** (motivação)
  - **O quê** (mudanças)
  - **Impacto**
  - **Checklist** das tasks (do `tasks.md`)
  - Linha final: `Validado local: lint/typecheck/test/build ✅`
- **Base**: `main`. **Head**: `change/<change-id>`.
- Merge sempre com `--squash --delete-branch` (histórico do `main` limpo).
- Só mergeia com o check `validate` (CI) verde.

### Modelo de corpo de PR

```markdown
## Por quê
<motivação, do proposal.md>

## O quê
<resumo das mudanças>

## Impacto
<o que isso afeta / riscos>

## Tasks
- [x] T001 …
- [x] T002 …

Validado local: lint/typecheck/test/build ✅
OpenSpec-Change: <change-id>
```
