<!-- TEMPLATE — design do CRUD de colaboradores com estrutura. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O modulo `auth` ja tem `user` (multi-tenant, com `role`/`status`), `register-user`, `login-user`,
`save-user`/`delete-user`. A estrutura organizacional (`007`) e o RBAC (`006a`/`006b`) existem. Esta
mudanca transforma o CRUD basico no cadastro completo de colaboradores (D2/D3), integrando estrutura
e autorizacao. O ciclo pending→active/inactive (aprovacao) e o auto-cadastro por convite vem em
`008b`/`008c`; aqui, o cadastro direto pelo wizard gera `active`.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Vincular colaboradores a papel e a estrutura (setor/cargo/unidade) com validacao por organizacao.
- Telas D2/D3 reusando os componentes da `002` e o gating da `006b`.
- Preservar o padrao de referencia (`save-user`/`delete-user`, mapeamento de leitura).

**Non-Goals:**
- Aprovacao/rejeicao (D29) — e a `008b`. Convites/A6 — e a `008c`.
- Reescrever `login-user`/`register-user`.
- Importacao em massa (CSV) — fora do escopo desta fase.

## Decisions

- **`user` estendido com FKs de estrutura (nullable)**: `sectorId`/`positionId`/`unitId` opcionais,
  validados contra a mesma organizacao. Itens desativados (`active=false` na `007`) nao podem ser
  atribuidos a novos vinculos; vinculos existentes sao preservados.
- **`save-user` define a organizacao pelo contexto do admin** (`current-organization`); `super_admin`
  pode operar em qualquer organizacao. Edicao sem `password` preserva o hash.
- **Leitura mapeada**: consultas chamam o repositorio direto e mapeiam para objeto simples (papel,
  status, estrutura) — nunca a entidade crua nem `password`.
- **Wizard (D3) reaproveita a atribuicao de grupos da `006a`**: o passo "Acesso" define o `role` e
  chama `assign-groups-to-user`, sem duplicar logica de RBAC. Cadastro pelo wizard gera `active`.
- **Skills**: module-entity, module-use-case, backend-prisma-sync-module,
  backend-prisma-repository, backend-nest-controller; telas seguem frontend-next-config.

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/d2-listagem/`, `mockups/d3-wizard/`). Tela **sem** mockup **não**
  gera subpasta — siga apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- Os códigos de tela citados (D2/D3) referem-se a esses mockups; ajuste-os ao seu projeto.

## Risks / Trade-offs

- [Atribuir item de estrutura desativado] → `save-user` valida `active` ao atribuir; vinculos
  pre-existentes preservados.
- [Split 008a/b/c] → O contrato entre elas e o ciclo de `status` do `user` (ja existente desde a
  `004`) e a leitura mapeada daqui; `008b`/`008c` nao reabrem o CRUD.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
