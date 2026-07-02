<!-- TEMPLATE — design da aprovacao de colaboradores. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O `status` do `user` existe desde a `004` e o login (`005`) ja barra quem nao esta `active`. A
`008a` entregou a listagem com badges de status. Falta o mecanismo de ativacao controlada: quem cria
conta por auto-cadastro fica `pending` para sempre. Esta mudanca adiciona a transicao validada e a
fila D29. O caminho que gera `pending` em escala (convite/A6) e a `008c`.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- `approve-user`/`reject-user` com transicao validada no dominio.
- Endpoints autorizados + listagem de pendentes escopada.
- Tela D29 com aprovar/rejeitar refletindo o status.

**Non-Goals:**
- Convites (criacao do `pending` por token) — e a `008c`.
- Notificar o colaborador por e-mail ao aprovar/rejeitar — pode ser adicionado depois.
- Alterar o gate de login (`005`) — ja funciona; esta mudanca so muda o `status`.

## Decisions

- **Transicao validada no caso de uso** (nao no controller): `approve-user` e `reject-user` so agem
  sobre `pending`; caso contrario `DomainError('user.invalid_status_transition', 409)`. Regra de
  dominio unica, reutilizavel por qualquer canal futuro.
- **Rejeitar = `inactive`** (nao excluir): preserva historico/auditoria e permite reativar editando.
- **Listagem de pendentes = filtro da leitura mapeada da `008a`** (`/users?status=pending` ou rota
  dedicada) — sem novo mapeador.
- **Skills**: module-use-case (casos de uso), backend-nest-controller (endpoints); tela segue
  frontend-next-config.

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/d29-aprovacao/`). Tela **sem** mockup **não** gera subpasta —
  siga apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- O código de tela citado (D29) refere-se a esse mockup; ajuste-o ao seu projeto.

## Risks / Trade-offs

- [Aprovacao em massa ausente] → D29 age item a item nesta fase; acao em lote pode vir depois sem
  mudar o dominio (mesmos casos de uso em loop).
- [Corrida entre dois admins] → A transicao validada garante 409 para o segundo; a UI trata o erro
  com toast e recarrega a fila.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
