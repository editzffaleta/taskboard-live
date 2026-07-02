<!-- TEMPLATE — tasks do CRUD de colaboradores. Checkboxes vazios; marque com evidencia. Cada task
tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004` (`user`), `006a` (guards + `assign-groups-to-user`), `006b` (gating),
> `007` (estrutura). **Nao faca:** aprovacao/rejeicao (`008b`); convites (`008c`); reescrever
> `login-user`/`register-user`; importacao em massa (CSV).

## 1. Dominio (modulo auth)

- [ ] 1.1 Estender a entidade `user` (skill [module-entity](../../../.claude/skills/module-entity)) com `sectorId?`, `positionId?`, `unitId?` (FKs opcionais para a estrutura da `007`, mesma organizacao).
  - **Aceite:** campos opcionais na entidade + validacao; teste atualizado.
- [ ] 1.2 Revisar `save-user` (skill [module-use-case](../../../.claude/skills/module-use-case)): organizacao pelo contexto do admin (`super_admin` opera em qualquer org), atribui papel e vincula setor/cargo/unidade **validando mesma organizacao e item `active`**; edicao sem `password` preserva o hash.
  - **Aceite:** estrutura de outra org/inativa → rejeitada; edicao sem senha mantem hash; org do contexto.
- [ ] 1.3 Manter `delete-user` sem regressao e cobrir `save-user` com testes (estrutura invalida, edicao sem senha, org do contexto), reusando fakes.
  - **Aceite:** `delete-user` verde; cenarios novos cobertos; suite do `auth` verde.

## 2. Back-end (persistencia + endpoints)

- [ ] 2.1 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)): estender `user` com FKs `sectorId`/`positionId`/`unitId` (para os models da `007`).
  - **Aceite:** migration aplicada (FKs nullable); `prisma:generate` ok; sem passo destrutivo.
- [ ] 2.2 Atualizar o repositorio Prisma de `user` (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)) com a estrutura, escopado por organizacao, sem alterar o contrato.
  - **Aceite:** contrato intacto; `tsc --noEmit` ok.
- [ ] 2.3 Ampliar `user.controller.ts`: `/users` CRUD (com vinculo de estrutura/papel) sob `@Roles('admin_org','super_admin')`, escopado por organizacao. Consultas mapeiam leitura para objeto simples (papel, status, estrutura) — sem entidade crua/`password`.
  - **Aceite:** endpoints autorizados e escopados; leitura mapeada validada.
- [ ] 2.4 Estender `auth.integration.http`: CRUD de colaborador com estrutura (criar/editar/excluir/listar), estrutura de outra org rejeitada, acesso negado por papel (403). Validar manualmente.
  - **Aceite:** cenarios cobertos.

## 3. Front-end

- [ ] 3.1 **D2 — Listagem de colaboradores**: tabela paginada com filtros e badges de status, em rota protegida por papel (gating da `006b`).
  - **Aceite:** listagem paginada com filtros e badges; dados reais de `/users`.
- [ ] 3.2 **D3 — Wizard de 6 passos**: cadastro completo com dados, estrutura (setor/cargo/unidade da `007`) e acesso (o passo "Acesso" define `role` e reusa `assign-groups-to-user` da `006a`).
  - **Aceite:** wizard cria colaborador `active` com estrutura e acesso; passo de acesso usa a atribuicao da `006a`, sem duplicar RBAC.
- [ ] 3.3 Itens de menu de colaboradores na secao administrativa, sob gating por papel/permissao.
  - **Aceite:** itens visiveis apenas para papeis adequados.

## 4. i18n e verificacao

- [ ] 4.1 Adicionar as chaves i18n novas (pt/en): rotulos do wizard/estrutura, filtros e badges de status.
  - **Aceite:** chaves presentes em pt e en.
- [ ] 4.2 Rodar `npx tsc --noEmit` (backend e frontend) e os testes do `auth`; validar na UI: criar pelo wizard → aparece na D2 com estrutura e status `active` → editar sem senha mantem login.
  - **Aceite:** `tsc` limpo; testes verdes; fluxo validado com evidencia.
