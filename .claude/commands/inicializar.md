---
description: Bootstrap de projeto novo (roda ANTES da change 000) — config-project-fullstack + spec-init (git + OpenSpec + CI), depois aponta para /orquestrar.
argument-hint: ""
---

Este e o **bootstrap** do projeto: ele prepara o terreno que a change `000` exige.
NAO e uma change do OpenSpec — e o passo **pre-OpenSpec** que INSTALA o OpenSpec (a
`spec-init` roda `npm i -g @fission-ai/openspec` e `openspec init`, criando a pasta
`openspec/` onde as changes moram). Por isso roda fora do ciclo de changes, antes da `000`.

Execute na ordem, parando para confirmar acoes publicas/irreversiveis:

## 1. Monorepo (se ainda nao existir)
Verifique:
```bash
test -f package.json && test -f turbo.json && test -d apps/frontend && test -d apps/backend \
  && echo "monorepo OK" || echo "rodar config-project-fullstack"
```
Se faltar, use a skill **`config-project-fullstack`** (Turbo, Next :3000 + NestJS :4000, npm).

## 2. Bootstrap (git + OpenSpec + CI)
Use a skill **`spec-init`**, que faz:
- pre-requisitos (Node >= 20.19, identidade do git, `gh auth status`, e **instala o OpenSpec CLI** se faltar)
- `git init -b main` e **`openspec init`** (selecionar Claude Code)
- semente do `openspec/project.md`, higiene (.editorconfig/.nvmrc/.gitignore), CI + `scripts/ci/gate.sh`
- git hooks (opcional, perguntar), commit inicial e (opcional, **confirmar**) criar o repo no GitHub com `main` protegido

## 2.5. Convencoes do OpenSpec (shared + templates + memory)
Use a skill **`spec-conventions`** (roda logo apos o `openspec init`). Ela semeia os extras que
o resto do fluxo espera encontrar — sem isso, o ledger da `000` (que le `openspec/shared/` e o
`EXECUTION-LOG.md`) nao tem o que ler:
```bash
bash scripts/apply-conventions.sh
```
Materializa `openspec/shared/` (como-executar, regras-de-nomenclatura), `openspec/templates/`
(modelo-base, modelo-crud), `openspec/memory/` (produto, contexto-tecnico, estrutura e a
**`constitution.md`** com os principios P1–P9) e o `openspec/EXECUTION-LOG.md`. Os canonicos
sao sobrescritos; os vivos (memory + log) so sao semeados se faltarem. Preencha `memory/` e
ajuste a `constitution.md` ao seu dominio — eles nao sao sobrescritos depois.

## 3. Trazer as changes para o projeto
Com o OpenSpec ja inicializado, copie o nucleo universal para `openspec/changes/`:
```bash
mkdir -p openspec/changes
cp -R "changes-templates/"* openspec/changes/
```
Depois **pare e peca os valores** para substituir os placeholders (`{{produto}}`, `{{namespace}}`,
papeis, codigos de tela) — isso e decisao do projeto, nao automatize as escolhas. Remova os
comentarios de instrucao do topo dos arquivos.

## 4. Handoff
Terreno pronto (git + OpenSpec + CI + changes no lugar). Agora dispare a construcao:
**`/orquestrar`** — o orquestrador le a change `000` e implementa `001`…`NNN` em sequencia.

> Resumo da cadeia: **/inicializar** (bootstrap, pre-OpenSpec) → **/orquestrar** (000 conduz as features).
