<!-- TEMPLATE — tasks dos convites. Checkboxes vazios; marque com evidencia. Cada task tem
**Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `008a` (user com estrutura), `008b` (aprovacao), `004` (`register-user`),
> `006a`/`006b` (autorizacao/gating). **Nao faca:** envio de e-mail; reescrever `register-user`;
> remover o `/join` sem confirmacao (registrar a decisao como pendencia).

## 1. Dominio (modulo auth)

- [ ] 1.1 Criar o agregado `invitation` (skill [module-aggregate](../../../.claude/skills/module-aggregate)): `organizationId`, `email?`, `role?`/estrutura pre-definidos opcionais, `token` (aleatorio seguro, unico), `expiresAt`, `status` (`pending|accepted|expired|revoked`).
  - **Aceite:** agregado + entidade validada; token de alta entropia.
- [ ] 1.2 Definir o contrato do repositorio (skill [module-repository](../../../.claude/skills/module-repository)) com `findByToken` (+ fake em `test/mock/`).
  - **Aceite:** contrato + fake prontos.
- [ ] 1.3 Implementar `create-invitation` (gera token/expiracao; organizacao do contexto do admin) com a skill [module-use-case](../../../.claude/skills/module-use-case).
  - **Aceite:** convite `pending` criado com token unico e `expiresAt`.
- [ ] 1.4 Implementar `accept-invitation`: valida o token (invalido → `invitation.not_found`; expirado → `invitation.expired`; usado/revogado → `invitation.already_used`), cria o usuario via `register-user` (organizacao/papel/estrutura do convite, `status = pending`) e marca o convite `accepted`.
  - **Aceite:** aceite cria colaborador `pending` e consome o convite; erros corretos por caso.
- [ ] 1.5 Implementar `revoke-invitation` (`pending → revoked`; outros status → erro de transicao).
  - **Aceite:** revogado nao aceita mais; transicao invalida rejeitada.
- [ ] 1.6 Cobrir com testes (fakes): aceite valido, token expirado, token usado, token revogado, criacao com papel/estrutura pre-definidos.
  - **Aceite:** cenarios cobertos; suite do `auth` verde.

## 2. Back-end

- [ ] 2.1 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)): model `invitation` com `token @unique`.
  - **Aceite:** migration aplicada; `prisma:generate` ok.
- [ ] 2.2 Implementar o repositorio Prisma de `invitation` (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)), escopado por organizacao, sem alterar o contrato.
  - **Aceite:** contrato intacto; `tsc --noEmit` ok.
- [ ] 2.3 Criar `invitation.controller.ts` (skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller)): rotas admin (`POST /invitations`, listar, `POST /invitations/:id/revoke`) sob `@Roles('admin_org','super_admin')`; rotas publicas (`public.decorator`) `GET /invitations/:token` e `POST /invitations/:token/accept`.
  - **Aceite:** admin autorizado; publicas abertas validando o token.
- [ ] 2.4 Criar/estender a integracao HTTP: ciclo criar → validar → aceitar → (login barrado por `pending`) → revogar; token expirado/usado; negado por papel (403). Validar manualmente.
  - **Aceite:** ciclo completo demonstrado.

## 3. Front-end

- [ ] 3.1 **A6 — Aceite de convite**: rota publica `/convite/[token]` que valida o token (`GET`) antes de exibir o formulario e envia o aceite (`POST`); token invalido/expirado → estado de erro amigavel.
  - **Aceite:** aceite cria colaborador `pending`; estados de erro tratados.
- [ ] 3.2 **Gestao de convites (admin)**: gerar (com papel/estrutura opcionais), listar (status/expiracao) e revogar; o link completo e exibido para copiar/compartilhar.
  - **Aceite:** gerar/listar/revogar funcionando; link visivel e copiavel.
- [ ] 3.3 Item de menu "Convites" na secao administrativa, sob gating por papel.
  - **Aceite:** item visivel apenas para papeis administrativos.

## 4. i18n e verificacao

- [ ] 4.1 Adicionar as chaves i18n (pt/en): `invitation.not_found`, `invitation.expired`, `invitation.already_used`, textos de A6 e da gestao.
  - **Aceite:** chaves presentes em pt e en.
- [ ] 4.2 Rodar `npx tsc --noEmit` (backend e frontend) e os testes do `auth`; validar o ciclo completo na UI: convite → A6 → `pending` → aprovacao (D29 da `008b`) → login. Registrar a decisao pendente do `/join` no EXECUTION-LOG.
  - **Aceite:** `tsc` limpo; testes verdes; ciclo ponta a ponta com evidencia; pendencia registrada.
