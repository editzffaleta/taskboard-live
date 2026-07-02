<!-- TEMPLATE — design dos convites. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O ciclo de status ja esta completo: `register-user` cria (`004`), o gate de login barra nao-ativos
(`005`), a `008b` aprova/rejeita. Falta o canal controlado de entrada: convites por token que
carregam a organizacao (e opcionalmente papel/estrutura) e geram colaboradores `pending`.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Agregado `invitation` com ciclo criar → validar → aceitar → revogar e expiracao.
- Aceite publico (A6) reusando `register-user`, gerando `pending`.
- Gestao de convites pelo admin (gerar/listar/revogar; link para compartilhar).

**Non-Goals:**
- Envio automatico de e-mail — o link e gerado e exibido; envio pode ser adicionado depois.
- Reescrever `register-user` — ele e reaproveitado, nao substituido.
- Aprovacao — ja existe (`008b`).

## Decisions

- **Convite como agregado proprio (`invitation`) no modulo `auth`**: token aleatorio seguro (alta
  entropia), `expiresAt`, `status` (`pending|accepted|expired|revoked`). Alternativa (codificar o
  convite num JWT) descartada: nao permite revogacao nem rastreio.
- **`accept-invitation` reusa `register-user`** passando organizacao/papel/estrutura do convite e
  criando com `status = pending`; o convite vira `accepted` (uso unico). Token invalido/expirado/
  usado → `invitation.not_found` / `invitation.expired` / `invitation.already_used`.
- **Rotas publicas minimas** via `public.decorator`: `GET /invitations/:token` (validar antes de
  exibir o formulario) e `POST /invitations/:token/accept`. Todo o resto e admin.
- **Politica do `/join` (a confirmar)**: recomenda-se torna-lo invite-only (ou restrito ao
  bootstrap); por padrao esta mudanca **adiciona** o caminho de convite sem remover o `/join`.
- **Skills**: module-aggregate, module-repository, module-use-case, backend-prisma-sync-module,
  backend-prisma-repository, backend-nest-controller; telas seguem frontend-next-config.

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/a6-aceite/`, `mockups/convites-admin/`). Tela **sem** mockup
  **não** gera subpasta — siga apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- O código de tela citado (A6) refere-se a esse mockup; ajuste-o ao seu projeto.

## Risks / Trade-offs

- [Token de convite vazado] → Alta entropia, `expiresAt` curto, uso unico (`accepted`) e `revoke`.
- [Self-cadastro indevido] → Mitigado pela expiracao/revogacao e pela aprovacao (`008b`).
- [`/join` aberto coexistindo] → Risco aceito ate a decisao do produto; registrado como pendencia.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
