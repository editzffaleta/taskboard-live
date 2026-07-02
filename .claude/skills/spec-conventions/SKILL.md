---
name: spec-conventions
description: Semeia e atualiza os extras de OpenSpec do projeto que nao fazem parte do init padrao — a pasta shared/ (como-executar e regras-de-nomenclatura), a pasta templates/ (modelo-base e modelo-crud), a pasta memory/ (produto, contexto-tecnico e estrutura, como esqueleto) e o EXECUTION-LOG.md na raiz do openspec. Roda logo apos o openspec init (ou para refrescar os templates canonicos em um projeto ja iniciado), de forma idempotente.
---

# Spec Conventions

Use esta skill **logo apos o `openspec init`** para montar os extras que voce
sempre adiciona a mao, ou para **refrescar os templates canonicos** num projeto
ja iniciado. Ela materializa, dentro de `openspec/`:

```
openspec/
  shared/
    como-executar.md
    regras-de-nomenclatura.md
  templates/
    modelo-base.md
    modelo-crud.md
  memory/
    produto.md
    contexto-tecnico.md
    estrutura.md
    constitution.md
  EXECUTION-LOG.md
```

Esta skill **nao** roda `openspec init` e **nao** mexe em `specs/`, `changes/` ou
no `project.md`. Ela cria a pasta `memory/` apenas como **esqueleto** (ver a secao
"`memory/`").

## Pre-requisitos

- `openspec/` ja existe no projeto (ou seja, `openspec init` ja rodou).
- Se nao existir, pare e oriente rodar o init antes.

## Entradas

Nenhuma obrigatoria. Opcional:

1. `caminho do openspec` quando nao for `./openspec`.

## Referencias obrigatorias

Antes de aplicar, ler:

1. a raiz `openspec/` atual (confirmar que existe e o layout em uso)
2. os assets desta skill (o conteudo exato que sera escrito):
   - `assets/shared/como-executar.md`
   - `assets/shared/regras-de-nomenclatura.md`
   - `assets/templates/modelo-base.md`
   - `assets/templates/modelo-crud.md`
   - `assets/memory/produto.md`
   - `assets/memory/contexto-tecnico.md`
   - `assets/memory/estrutura.md`
   - `assets/memory/constitution.md`
   - `assets/EXECUTION-LOG.md`
3. `references/mandatory-readings.md`

## Regra dos dois niveis (essencial)

A skill trata os arquivos em duas categorias, e isso e o que a torna segura:

- **Estaveis / canonicos** — `shared/como-executar.md`,
  `shared/regras-de-nomenclatura.md`, `templates/modelo-base.md`,
  `templates/modelo-crud.md`. Sao **sobrescritos** a cada execucao. A **fonte
  unica de verdade e o asset desta skill**: para mudar o padrao, edite o asset e
  rode de novo para propagar. Nao edite essas copias soltas no projeto.
- **Vivos / por projeto** — `EXECUTION-LOG.md` e os arquivos de `memory/`
  (`produto.md`, `contexto-tecnico.md`, `estrutura.md`, `constitution.md`). Sao
  **semeados apenas se nao existirem** (esqueleto/defaults prontos para ajustar).
  Nunca sao sobrescritos, para nao apagar o historico nem o contexto/principios ja
  escritos do projeto.

## Workflow deterministico

1. Confirmar que `openspec/` existe (senao, parar e orientar o init).
2. Ler os assets para saber o que sera escrito.
3. Rodar o script idempotente:
   ```bash
   bash scripts/apply-conventions.sh            # ou: bash scripts/apply-conventions.sh caminho/openspec
   ```
4. Conferir a saida do script (o que foi atualizado vs semeado/preservado).
5. Reportar os estaveis atualizados vs os vivos semeados/preservados.

> Se preferir nao usar o script, copie os assets para os destinos seguindo a
> mesma regra dos dois niveis (estaveis sobrescreve; vivos so se faltarem).

## `memory/` (contexto por projeto)

Os templates (`modelo-base.md` e `modelo-crud.md`) referenciam
`openspec/memory/produto.md`, `contexto-tecnico.md` e `estrutura.md`. A skill
**semeia** esses tres como **esqueleto** (so se nao existirem) para os links dos
templates resolverem desde o inicio. Preencha-os por projeto; eles nunca sao
sobrescritos em re-execucoes.

O `openspec init` padrao tambem cria `openspec/project.md`. Os dois coexistem:
trate `memory/` como a fonte detalhada de contexto (produto/tecnico/estrutura) e,
se quiser, deixe o `project.md` apenas apontando para `memory/`.

A `memory/constitution.md` e semeada aqui (so se faltar) com os **principios
inegociaveis** padrao da fabrica fullstack (P1–P9). E o arquivo que a `/analisar`
(pre-build) e o `/portao` (pos-build) usam como referencia de conformidade. Ajuste
os principios/limiares ao seu dominio; ela nunca e sobrescrita em re-execucoes.

## Verificacao

```bash
ls openspec/shared openspec/templates openspec/memory openspec/EXECUTION-LOG.md
ls openspec/memory/constitution.md
```

Esperado: os dois arquivos em `shared/`, os dois em `templates/`, os quatro em
`memory/` (incl. `constitution.md`) e o `EXECUTION-LOG.md` presente.

## Guardrails

- Nao rodar `openspec init` nem alterar `specs/`, `changes/` ou `project.md`.
- Nao sobrescrever `EXECUTION-LOG.md` se ja existir.
- Sobrescrever os estaveis e intencional; a fonte canonica e o asset da skill —
  nao manter edicoes locais desses arquivos no projeto.
- Nao sobrescrever os vivos (`memory/*` e `EXECUTION-LOG.md`) se ja existirem.
- Nao adaptar/reescrever o conteudo dos assets na hora de aplicar; eles vao verbatim.

## Saida esperada

- `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md` atualizados
- `openspec/templates/modelo-base.md` e `modelo-crud.md` atualizados
- `openspec/memory/produto.md`, `contexto-tecnico.md`, `estrutura.md` e
  `constitution.md` presentes (semeados como esqueleto/defaults se nao existiam;
  preservados se ja existiam)
- `openspec/EXECUTION-LOG.md` presente (semeado vazio se nao existia; preservado se ja existia)
- relatorio do que foi atualizado (estaveis) vs semeado/preservado (vivos)
