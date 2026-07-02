<!-- TEMPLATE — tasks da aprovacao de colaboradores. Checkboxes vazios; marque com evidencia. Cada
task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `008a` (listagem/leitura mapeada), `004` (`status`), `006a`/`006b`
> (autorizacao/gating). **Nao faca:** convites/A6 (`008c`); e-mail de notificacao; mudar o gate de
> login da `005`.

## 1. Dominio (modulo auth)

- [ ] 1.1 Implementar `approve-user` (`pending → active`) com a skill [module-use-case](../../../.claude/skills/module-use-case); fora de `pending` → `DomainError('user.invalid_status_transition', 409)`.
  - **Aceite:** `pending → active` ok; qualquer outro status → 409.
- [ ] 1.2 Implementar `reject-user` (`pending → inactive`) com a mesma regra de transicao.
  - **Aceite:** `pending → inactive` ok; qualquer outro status → 409.
- [ ] 1.3 Cobrir com testes (fakes): aprovacao valida, rejeicao valida, transicao invalida (ja `active`, ja `inactive`).
  - **Aceite:** cenarios cobertos; suite do `auth` verde.

## 2. Back-end

- [ ] 2.1 Ampliar `user.controller.ts` (skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller)): `POST /users/:id/approve` e `POST /users/:id/reject`, sob `@Roles('admin_org','super_admin')`, escopados por organizacao.
  - **Aceite:** endpoints autorizados; usuario de outra org → nao encontrado no escopo.
- [ ] 2.2 Expor a listagem filtrada de pendentes (filtro `status=pending` na leitura mapeada da `008a`).
  - **Aceite:** listagem retorna apenas `pending` da organizacao do admin.
- [ ] 2.3 Estender `auth.integration.http`: aprovar pendente (200 + `active`), rejeitar pendente (200 + `inactive`), transicao invalida (409), negado por papel (403). Validar manualmente.
  - **Aceite:** cenarios cobertos.

## 3. Front-end

- [ ] 3.1 **D29 — Fila de aprovacao**: lista de colaboradores `pending` com acoes aprovar/rejeitar; erro 409 tratado com toast + recarga da fila.
  - **Aceite:** aprovar/rejeitar refletem o status; 409 tratado.
- [ ] 3.2 Item de menu "Aprovacoes" na secao administrativa, sob gating por papel.
  - **Aceite:** item visivel apenas para papeis administrativos.

## 4. i18n e verificacao

- [ ] 4.1 Adicionar as chaves i18n (pt/en): `user.invalid_status_transition`, textos da fila/acoes.
  - **Aceite:** chaves presentes em pt e en.
- [ ] 4.2 Rodar `npx tsc --noEmit` (backend e frontend) e os testes do `auth`; validar na UI: pendente aparece na D29 → aprovar → some da fila e loga; rejeitado → `inactive` e login barrado (403 da `005`).
  - **Aceite:** `tsc` limpo; testes verdes; fluxo `pending → aprovacao → login` com evidencia.
