<!--
TEMPLATE DE CHANGE — 014-seeds-desenvolvimento (dados demo idempotentes p/ dev e validacao manual).
Extensao transversal (opcional). NUNCA roda em producao sem flag explicita.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/seeds-desenvolvimento/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Hoje o unico dado semeado e o Super Admin (`006a`). Validar telas e fluxos manualmente exige
criar organizacao, usuarios por papel e estrutura na mao a cada banco novo — lento e
inconsistente. Esta mudanca cria o **seed demo idempotente** que deixa um ambiente navegavel em
um comando, e que a fundacao e2e (`015`) reutiliza como massa de dados.

## What Changes

- **Script `prisma/seed.ts`** (registrado em `prisma.seed` do package) idempotente por chaves
  naturais (upsert): rodar duas vezes nao duplica nada.
- **Guard de ambiente**: executa apenas com `NODE_ENV !== 'production'` **ou** flag explicita
  `SEED_DEMO=true`; em producao sem a flag, aborta com mensagem clara.
- **Massa criada** (respeitando as changes aplicadas):
  - Organizacao demo ("{{produto}} Demo") — `003`.
  - Usuarios com senha conhecida de dev (`Demo@12345`): `colaborador@demo.dev`,
    `lider@demo.dev`, `admin@demo.dev` (`admin_org`) — todos `active`; o `super_admin` continua
    vindo do seed da `006a`.
  - **Se `006a`**: grupo de permissao demo com um subconjunto do catalogo, vinculado ao lider.
  - **Se `007`**: unidade/setor/cargo demo e vinculo dos usuarios a estrutura.
  - **Se `008a`**: um usuario `pending` (`pendente@demo.dev`) para exercitar a fila D29 (`008b`).
- **Script npm** `db:seed:demo` e documentacao no `.env.example`/README do projeto gerado.

## Capabilities

### New Capabilities
- `seeds-desenvolvimento`: massa de dados demo idempotente do {{produto}} (organizacao, usuarios
  por papel, estrutura e permissao quando presentes), restrita a ambientes de desenvolvimento.

### Modified Capabilities
<!-- Nenhuma: o seed usa os agregados existentes sem alterar contratos. -->

## Impact

- **Backend**: `apps/backend/prisma/seed.ts` + registro `prisma.seed`; script `db:seed:demo`.
- **Dominio/Frontend**: intocados (o seed escreve via Prisma respeitando as regras ja aplicadas
  pelas migrations e formatos das entidades — senhas hasheadas pelo mesmo `crypto.provider`).
- **Dependencias**: `004` (user), `006a` (papeis/seed do super admin). Condicionais: `003`
  (organizacao — no template multi-tenant e pre efetivo), `007`, `008a`.
- **Habilita**: validacao manual rapida de qualquer tela; massa base da fundacao e2e (`015`).
