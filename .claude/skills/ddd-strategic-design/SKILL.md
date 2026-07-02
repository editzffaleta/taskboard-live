---
name: ddd-strategic-design
description: Conduz o design estrategico de DDD antes da geracao tatica — identifica subdominios (core/supporting/generic), define bounded contexts e a linguagem ubiqua, mapeia os relacionamentos entre contextos (context mapping) e recomenda as fronteiras de modulo no monorepo, produzindo um mapa de contexto e um glossario que alimentam os geradores taticos do projeto.
compatibility: claude-code, opencode
---

# DDD Strategic Design

Use esta skill **antes** de gerar codigo tatico (entidades, agregados,
repositorios, casos de uso), ou ao **rever fronteiras** de um sistema existente.
O foco e a parte **estrategica** do DDD: decidir *quais contextos existem, o que
e nucleo, como eles se relacionam e onde ficam as fronteiras*.

Esta skill **nao** gera codigo. Quem cria entidade/VO/agregado/repo/use-case sao
as skills taticas (`module-entity`, `module-value-object`, `module-aggregate`,
`module-repository`, `module-use-case`). Aqui o resultado e **decisao + documento**.

## Relacao com o catalogo

- **Estrategico (esta skill):** subdominios, bounded contexts, linguagem ubiqua,
  context mapping, fronteiras de modulo.
- **Tatico (skills existentes):** os building blocks dentro de cada contexto.
- O mapa produzido aqui define quantos `modules/<contexto>` criar e como integra-los.

## Entradas obrigatorias

1. descricao do dominio / do problema (o que o sistema faz e para quem)
2. principais capacidades de negocio e atores
3. integracoes externas relevantes (sistemas legados, APIs de terceiros)

Entradas opcionais:

4. restricoes (times, prazos, sistemas que nao podem mudar)
5. modulos ja existentes, quando for um redesenho

## Referencias obrigatorias

Antes de produzir o design, ler obrigatoriamente:

1. `openspec/project.md` (visao, escopo e convencoes do projeto)
2. a estrutura atual de `modules/` (quais contextos ja existem)
3. quando houver uma mudanca em curso, `openspec/changes/<id>/proposal.md`
4. as referencias internas desta skill:
   - `references/strategic-ddd-guide.md`
   - `references/context-map.example.md`

## Conceitos que a skill aplica

- **Subdominios:** classificar cada area como **core** (diferencial competitivo,
  recebe mais investimento), **supporting** (necessario, mas nao diferencial) ou
  **generic** (resolvido por solucao pronta/terceiro).
- **Bounded context:** fronteira explicita dentro da qual um modelo e a linguagem
  ubiqua sao consistentes. Um mesmo termo pode significar coisas diferentes em
  contextos diferentes — isso e esperado e deve ser explicito.
- **Linguagem ubiqua:** glossario por contexto, com os termos do negocio que vao
  virar nomes de classes, agregados e codigos de erro nas skills taticas.
- **Context mapping:** descrever a relacao entre contextos com os padroes:
  Partnership, Shared Kernel, Customer-Supplier, Conformist, Anticorruption Layer
  (ACL), Open Host Service (OHS), Published Language, Separate Ways. Marcar o
  fluxo upstream/downstream.

## Workflow deterministico

1. Ler as referencias obrigatorias e extrair a linguagem do negocio.
2. Listar as capacidades de negocio e agrupa-las.
3. Classificar subdominios (core/supporting/generic) e justificar o core.
4. Propor os bounded contexts (1 contexto != necessariamente 1 microservico).
5. Definir a linguagem ubiqua de cada contexto (glossario curto e objetivo).
6. Mapear os relacionamentos entre contextos com os padroes de context mapping,
   indicando upstream/downstream e onde entra ACL/OHS/Published Language.
7. Recomendar as **fronteiras de modulo** no monorepo: cada bounded context ->
   um `modules/<contexto>` (ou agrupamento justificado), respeitando as convencoes
   do `config-project-fullstack`/`config-new-module`.
8. Apontar os pontos de integracao que precisarao de ACL (traducao anti-corrupcao)
   para nao vazar modelo de um contexto no outro.
9. Produzir o documento final (mapa + glossario + recomendacoes) seguindo o
   template do `references/context-map.example.md`.

## Onde gravar o resultado

- Para o projeto como um todo: consolidar no `openspec/project.md` (secao de
  contextos) ou em `openspec/specs/<capability>/design.md`.
- Para uma feature/mudanca especifica: em `openspec/changes/<id>/design.md`.
- Nunca espalhar a decisao so no chat; ela precisa virar documento versionado.

## Guardrails

- Nao gerar entidade, agregado, repositorio, controller ou migration.
- Nao transformar todo bounded context em microservico por reflexo; modular
  monolito e o padrao, salvo justificativa real.
- Nao criar contexto sem linguagem ubiqua propria.
- Nao deixar integracao entre contextos sem decidir o padrao de relacionamento.
- Nao vazar o modelo de um contexto em outro sem ACL.
- Nao contrariar as convencoes de modulo do projeto (`modules/<contexto>`).
- Nao over-engineer: comecar simples e dividir quando a fronteira ficar clara.

## Saida esperada

- classificacao de subdominios (core/supporting/generic) com justificativa do core
- lista de bounded contexts com a responsabilidade de cada um
- glossario de linguagem ubiqua por contexto
- mapa de contexto com os relacionamentos e padroes (ACL/OHS/etc.)
- recomendacao de fronteiras de modulo (`modules/<contexto>`) e pontos de integracao
- documento gravado em `openspec/` no local apropriado
