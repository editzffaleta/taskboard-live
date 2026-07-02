<!-- TEMPLATE — design do cadastro de colaboradores. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O modulo `auth` ja tem `user` (multi-tenant, com `role`/`status`), `register-user`, `login-user`,
`save-user`/`delete-user`. A estrutura organizacional (`007`) e o RBAC (`006`) existem. Esta mudanca
transforma o CRUD basico no ciclo completo de onboarding e gestao de colaboradores (D2/D3/D29/A6),
integrando estrutura e autorizacao.

O ciclo de status do `user` se torna efetivo aqui: admin que cria pelo wizard gera `active`;
auto-cadastro por convite gera `pending`, que o admin aprova (`→ active`) ou rejeita (`→ inactive`).
O gate de status do login (`005`) ja barra quem nao esta `active`.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Vincular colaboradores a papel e a estrutura (setor/cargo/unidade) com validacao por organizacao.
- Convites por token com auto-cadastro publico (A6) e fluxo de aprovacao (D29).
- Telas D2/D3/D29/A6 reusando os componentes da `002` e o gating da `006`.
- Preservar o padrao de cadastro de referencia (`save-user`/`delete-user`, mapeamento de leitura).

**Non-Goals:**
- Reescrever `login-user`/`register-user` — `register-user` e reaproveitado, nao substituido.
- Importacao em massa de colaboradores (CSV) — fora do escopo desta fase.
- Notificacoes por e-mail do convite — o link e gerado e exibido para o admin compartilhar; o envio
  automatico pode ser adicionado depois.

## Decisions

- **`user` estendido com FKs de estrutura (nullable)**: `sectorId`/`positionId`/`unitId` sao
  opcionais e validados contra a mesma organizacao. Itens desativados (`active=false` na `007`) nao
  podem ser atribuidos a novos colaboradores; vinculos existentes sao preservados.
- **`save-user` define a organizacao pelo contexto do admin**: o admin so cria/edita colaboradores na
  sua propria organizacao (`current-organization`); `super_admin` pode operar em qualquer organizacao.
  Mantem-se a regra de edicao sem `password` preservando o hash.
- **Convite como agregado proprio (`invitation`) no modulo `auth`**: token aleatorio seguro,
  `expiresAt`, `status` (`pending|accepted|expired|revoked`). `accept-invitation` reusa `register-user`
  passando a organizacao (e papel/estrutura pre-definidos) do convite, criando o usuario com
  `status = pending`. Alternativa (codificar o convite no proprio JWT) descartada por nao permitir
  revogacao nem rastreio.
- **Auto-cadastro gera `pending`; admin aprova (D29)**: separa onboarding self-service de ativacao
  controlada. Cadastro direto pelo wizard (D3) gera `active`.
- **`approve-user`/`reject-user` com transicao validada**: so agem sobre `pending`; caso contrario
  `DomainError('user.invalid_status_transition', 409)`.
- **Wizard de 6 passos reaproveita atribuicao de grupos da `006`**: o passo "Acesso" usa
  `assign-groups-to-user` (006) alem de definir o `role`, sem duplicar a logica de RBAC.
- **Politica de registro aberto (a confirmar)**: o `/join` aberto da `004` foi pensado para o
  bootstrap na organizacao default. Com convites, o onboarding multi-organizacao passa a ser via A6.
  Recomenda-se tornar o `/join` **invite-only** (ou restrito ao bootstrap), mas a decisao fica com o
  usuario; por padrao esta mudanca **adiciona** o caminho de convite sem remover o `/join`, ate confirmacao.
- **Skills**: module-entity, module-aggregate, module-repository, module-use-case,
  backend-prisma-sync-module, backend-prisma-repository, backend-nest-controller.

## Risks / Trade-offs

- [Tamanho da mudanca] → E comparavel a `006`. Esta agrupada por responsabilidade (dominio →
  persistencia → endpoints → telas). Pode ser dividida (CRUD/wizard vs. convite/aprovacao) se
  preferivel, ao custo de renumerar as mudancas seguintes.
- [Token de convite vazado] → Token aleatorio de alta entropia, `expiresAt` curto, uso unico (vira
  `accepted`) e possibilidade de `revoke`.
- [Atribuir item de estrutura desativado] → `save-user` valida `active` ao atribuir; vinculos
  pre-existentes sao preservados.
- [Self-cadastro indevido] → Mitigado por convite com expiracao/revogacao e pela aprovacao (D29).
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
