<!-- TEMPLATE — tasks do cadastro de colaboradores (DENSA). Checkboxes vazios; marque com evidencia.
Cada task tem **Aceite**. Por ser densa, o subagente pode quebrar em sub-passos (dominio → persistencia
→ endpoints → telas). Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `006` (RBAC), `007` (estrutura), `004` (`register-user`). **Nao faca:** reescrever
> `login-user`/`register-user` (o `register-user` e reaproveitado, nao substituido); importacao em
> massa (CSV); envio automatico de e-mail do convite (o link e gerado/exibido para o admin compartilhar).

## 1. Dominio (modulo auth) — user, aprovacao e convite

- [ ] 1.1 Estender a entidade `user` (skill [module-entity](../../../.claude/skills/module-entity)) com `sectorId?`, `positionId?`, `unitId?` (FKs opcionais para a estrutura da `007`, mesma organizacao).
  - **Aceite:** campos opcionais na entidade + validacao; teste atualizado.
- [ ] 1.2 Revisar `save-user` (skill [module-use-case](../../../.claude/skills/module-use-case)): define a organizacao pelo contexto do admin (`super_admin` pode operar em qualquer org), atribui papel e vincula setor/cargo/unidade **validando mesma organizacao e item `active`**; edicao sem `password` preserva o hash.
  - **Aceite:** referencia de estrutura de outra org/inativa → rejeitada; edicao sem senha mantem hash; org definida pelo contexto.
- [ ] 1.3 Manter `delete-user` (sem regressao).
  - **Aceite:** `delete-user` segue funcionando.
- [ ] 1.4 Implementar `approve-user` (`pending → active`) e `reject-user` (`pending → inactive`) com transicao validada: fora de `pending` → `DomainError('user.invalid_status_transition', 409)`.
  - **Aceite:** transicoes validas funcionam; transicao invalida → 409.
- [ ] 1.5 Criar o agregado `invitation` (skill [module-aggregate](../../../.claude/skills/module-aggregate)): `organizationId`, `email?`, `role?`/estrutura pre-definidos opcionais, `token` (aleatorio seguro, unico), `expiresAt`, `status` (`pending|accepted|expired|revoked`). Contrato com `findByToken` (skill [module-repository](../../../.claude/skills/module-repository)).
  - **Aceite:** agregado + contrato; token de alta entropia.
- [ ] 1.6 Implementar `create-invitation`, `accept-invitation` (valida token; cria o usuario via `register-user` com a organizacao/papel/estrutura do convite e `status = pending`; convite → `accepted`) e `revoke-invitation`. Token invalido/expirado/usado → `invitation.not_found`/`invitation.expired`/`invitation.already_used`.
  - **Aceite:** aceite cria colaborador `pending` e marca o convite `accepted`; tokens invalidos rejeitados com o erro correto.
- [ ] 1.7 Cobrir com testes unitarios: `save-user` (estrutura invalida, edicao sem senha), aprovacao/rejeicao (transicao invalida), convite (aceite valido, token expirado/usado/revogado).
  - **Aceite:** cenarios cobertos; suite do `auth` verde.

## 2. Back-end (persistencia + endpoints)

- [ ] 2.1 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)): estender `user` com FKs `sectorId`/`positionId`/`unitId` e criar o model `invitation` (token unico).
  - **Aceite:** migration aplicada (FKs + `invitation` com `token @unique`); `prisma:generate` ok.
- [ ] 2.2 Atualizar/implementar os repositorios Prisma de `user` (com a estrutura) e `invitation` (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)), escopados por organizacao, sem alterar contratos.
  - **Aceite:** repositorios implementam os contratos; `tsc --noEmit` ok.
- [ ] 2.3 Ampliar `user.controller.ts`: `/users` CRUD (com vinculo de estrutura/papel), `POST /users/:id/approve`, `POST /users/:id/reject` e listagem filtrada de pendentes — sob `@Roles('admin_org','super_admin')`, escopado por organizacao. Consultas mapeiam a leitura para objeto simples (papel, status, estrutura).
  - **Aceite:** endpoints autorizados e escopados; leitura mapeada (sem entidade crua/`password`).
- [ ] 2.4 Criar `invitation.controller.ts`: rotas admin (`POST /invitations` criar, listar, `revoke`) sob papel; rotas publicas (`public.decorator`) `GET /invitations/:token` (validar) e `POST /invitations/:token/accept` (aceitar).
  - **Aceite:** admin autorizado; publicas abertas e validando o token.
- [ ] 2.5 Criar/estender `apps/backend/src/modules/auth/*.integration.http` cobrindo: CRUD de colaborador com estrutura, aprovacao/rejeicao (incl. transicao invalida 409), ciclo de convite (criar → validar → aceitar → revogar; token expirado/usado) e acesso negado por papel (403). Validar manualmente.
  - **Aceite:** cenarios cobertos; ciclo completo demonstrado (convite → aceite → pending → aprovacao → login).

## 3. Front-end

- [ ] 3.1 **D2 — Listagem de colaboradores**: tabela paginada com filtros e badges de status, em rota protegida por papel.
  - **Aceite:** listagem paginada com filtros e badges; gating por papel.
- [ ] 3.2 **D3 — Wizard de 6 passos**: cadastro completo incluindo dados, estrutura (setor/cargo/unidade da `007`) e acesso (o passo "Acesso" define o `role` e reusa `assign-groups-to-user` da `006`, sem duplicar RBAC).
  - **Aceite:** wizard cria colaborador `active` com estrutura e acesso; passo de acesso usa a atribuicao da `006`.
- [ ] 3.3 **D29 — Aprovacao**: fila de colaboradores `pending` com aprovar/rejeitar.
  - **Aceite:** aprovar/rejeitar refletem a transicao de status.
- [ ] 3.4 **A6 — Aceite de convite**: rota publica `/convite/[token]` que valida o token e permite o auto-cadastro (gera `pending`).
  - **Aceite:** rota publica valida o token e cria o colaborador `pending`.
- [ ] 3.5 **Gestao de convites (admin)**: gerar/listar/revogar links de convite (link exibido para compartilhar).
  - **Aceite:** gerar/listar/revogar funcionando; link visivel.
- [ ] 3.6 Adicionar os itens de menu (colaboradores, aprovacoes, convites) sob gating por papel/permissao.
  - **Aceite:** itens visiveis apenas para os papeis adequados.
- [ ] 3.7 Acrescentar as chaves i18n novas (pt/en): erros (`user.invalid_status_transition`, `invitation.*`), rotulos do wizard, status e convites.
  - **Aceite:** chaves presentes em pt e en.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes do `auth` e validar o ciclo completo na UI: convite → aceite → `pending` → aprovacao → login.
  - **Aceite:** `tsc` limpo; testes verdes; ciclo ponta a ponta validado.
