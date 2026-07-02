<!--
TEMPLATE DE CHANGE — 008a-colaboradores-crud (CRUD com estrutura + telas D2/D3).
Split da antiga 008 (densa): CRUD/wizard aqui; aprovacao na 008b; convites na 008c.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigos de tela (D2/D3) referem-se aos seus mockups; ajuste-os.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/cadastro-colaboradores/spec.md` e
> `openspec/specs/registro-usuario/spec.md` (se existirem) · esta change (`proposal.md`,
> `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o `design.md`
> citar nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O CRUD basico de usuario (`004`) era um ponto de partida. No {{produto}}, gerir colaboradores e o
coracao da operacao do Admin da Organizacao. Esta mudanca revisa e expande aquele CRUD para o
**cadastro completo com vinculo a papel e estrutura organizacional** (`007`) e entrega a listagem
(**D2**) e o wizard de cadastro (**D3**). A aprovacao (D29) e a `008b`; os convites (A6) sao a `008c`.

## What Changes

- **Extensao do `user`**: a entidade ganha `sectorId?`, `positionId?` e `unitId?` (FKs opcionais para
  a estrutura da `007`, mesma organizacao).
- **Revisao de `save-user`/`delete-user`**: `save-user` define a organizacao pelo contexto do admin,
  atribui papel e vincula setor/cargo/unidade (validando mesma organizacao e item `active`); mantem a
  regra de edicao sem `password` preservando o hash. Consultas mapeiam leitura para objeto simples
  (papel, status, estrutura).
- **Persistencia**: migration estendendo `user` com as FKs de estrutura; repositorio atualizado.
- **Endpoints**: `/users` CRUD (com vinculo de estrutura/papel) sob `@Roles('admin_org','super_admin')`
  (`006a`), escopado por organizacao (`003`/`005`).
- **Frontend**: **D2** (listagem paginada com filtros e badges de status) e **D3** (wizard de 6
  passos; o passo "Acesso" define `role` e reusa `assign-groups-to-user` da `006a`); itens de menu sob
  gating (`006b`); chaves i18n novas.

## Capabilities

### New Capabilities
- `cadastro-colaboradores`: Gestao de colaboradores no {{produto}} — CRUD com vinculo a papel e
  estrutura organizacional (setor/cargo/unidade), persistencia Prisma e telas D2/D3, integrando RBAC
  (`006a`/`006b`) e estrutura (`007`). (Aprovacao entra pela `008b`; convites pela `008c`.)

### Modified Capabilities
- `registro-usuario` (`004`): a entidade `user` e estendida com `sectorId`/`positionId`/`unitId`
  (FKs opcionais, mesma organizacao).

## Impact

- **Dominio (`modules/auth`)**: `user` estendido (FKs de estrutura); `save-user` revisado;
  `delete-user` mantido; testes atualizados.
- **Backend**: migration de `user` (FKs `sector`/`position`/`unit`); repositorio Prisma atualizado;
  `UserController` ampliado (`/users` CRUD com estrutura, leitura mapeada); teste de integracao HTTP.
- **Frontend**: telas D2/D3 no modulo `auth`; itens de menu sob gating; chaves i18n novas.
- **Dependencias**: estrutura organizacional (`007`), RBAC (`006a` guards/atribuicao; `006b` gating),
  escopo/tenant (`003`/`005`), design system (`002`), `user` (`004`).
- **Habilita**: `008b` (aprovacao opera sobre a listagem/status daqui) e `008c` (convites criam
  usuarios com a estrutura daqui).
