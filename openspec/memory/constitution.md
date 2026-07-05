# Constituição do Projeto

> **O que é:** os princípios **inegociáveis** deste projeto — as regras que toda
> change e todo agente respeitam, e contra as quais a `/analisar` (pré-build) e o
> `/portao` (pós-build) checam. É um arquivo **vivo por projeto**: nasce com os
> defaults da fábrica fullstack e você ajusta os IDs/limiares ao seu domínio.
> Não é sobrescrito em re-execuções da `spec-conventions`.
>
> **Versão:** 1.0.0 · **Última revisão:** <AAAA-MM-DD>
>
> **Como uma change cumpre:** se uma mudança precisar violar um princípio, ela
> declara uma seção `## Constitution Exception` no `design.md` com justificativa e
> escopo. Sem essa seção, a violação é **BLOCKER** na `/analisar`.

---

## P1 — Spec antes de código

Nenhuma implementação sem uma change ativa em `openspec/changes/` com `proposal.md`,
`design.md`, `tasks.md` e `specs/` coerentes. Não se constrói nada fora do que foi
proposto; se a implementação revelar um problema de design, **pausa-se e ajusta-se o
artefato** — não se inventa.
**Enforcement:** `/analisar` (BLOCKER) + revisão de PR.

## P2 — Skills são a implementação principal

Toda task aponta para a skill do catálogo (`config-*`, `module-*`, `backend-*`,
`frontend-*`, `security-*`, `e2e-*`) como **fonte de implementação**. Desvio da skill
é permitido, mas **só com evidência registrada** no checkbox da task. Não se reescreve
do zero o que uma skill já padroniza.
**Enforcement:** `/analisar` (WARN se a skill citada não existir) + `/portao` (confere uso/desvio).

## P3 — Fronteiras e regra de dependência (Clean Arch + DDD)

O domínio (`modules/<contexto>`) **não importa** de `apps/`; a dependência aponta
sempre para dentro. `packages/shared` é o **único contrato cross-package**; pacotes não
acessam internals uns dos outros. Cada bounded context isola seu agregado, entidade,
value-object, contrato de repositório e use-case.
**Enforcement:** `/analisar` (WARN) + auditoria do `architecture-specialist` no `/portao`.

## P4 — Contratos type-safe e padrão de erro

Sem `any` em entidades, retornos de use-case ou bordas de controller. Validação de
entrada via **regras reutilizáveis do `shared`** (não DTO de entrada; leitura é mapeada
para objeto simples no controller). Erros sempre no padrão `DomainError` /
`ApiErrorResponse`. Use-case de comando retorna `void`; query chama o repositório direto.
**Enforcement:** `/analisar` (BLOCKER nas bordas) + `tsc --noEmit` no gate.

## P5 — Multi-tenancy e autorização por permissão

Toda leitura/escrita de dado de tenant é **escopada por `organizationId`**. Autorização
é por **permissão do catálogo** (`packages/shared`), nunca por papel hard-coded espalhado
pelo código. Guards aplicam papel/permissão na borda.
**Enforcement:** `/analisar` (BLOCKER se um fluxo de dados de tenant não escopar) + `security-specialist`.

## P6 — Dados e migrações

Schema Prisma **modular por domínio** (`apps/backend/prisma/models/*.model.prisma`).
Migrations são **reversíveis e revisadas** — nada de alteração destrutiva sem migração e
sem nota no `design.md`. Repositório tem contrato no domínio + implementação Prisma no
backend + fake para testes.
**Enforcement:** `/analisar` (WARN) + revisão de migração no `/portao`.

## P7 — Higiene de segredos

Zero segredo em código, commit ou spec. Só `.env.example` é versionado; `.env` é sempre
ignorado. `gitleaks` roda no hook `pre-commit` e no CI. Segredos só via variável de
ambiente, documentados no `.env.example`.
**Enforcement:** `gitleaks` (CI, BLOCKER) + `/analisar` (BLOCKER se um valor sensível aparecer na change).

## P8 — Aceite testável

Todo requirement do `specs/spec.md` tem cenário (GIVEN/WHEN/THEN). Toda task de feature
inclui a task de **teste Jest** correspondente (entidade, use-case, validação); fluxo
ponta a ponta tem **e2e Playwright**.
**Enforcement:** `openspec validate --strict` + `/analisar` (BLOCKER se faltar cenário ou teste) + `/portao`.

## P9 — Main protegido e execução sequencial

**1 change = 1 branch = 1 PR.** Nunca se faz merge no `main` com gate ou CI vermelho;
nunca `push --force` nem reescrita de histórico no `main`. A ordem das changes é
**topológica e sequencial** — nunca paralela (mudanças tocam arquivos compartilhados).
**Enforcement:** `spec-flow` + gate/CI + branch protection.

---

## Exceções registradas

> Lista viva das exceções aceitas (cada uma também declarada no `design.md` da change
> correspondente). Mantenha curto e revise a cada release.

- <nenhuma ainda>
